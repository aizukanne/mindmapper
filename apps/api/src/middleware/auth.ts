import { clerkMiddleware, getAuth, requireAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

// Re-export Clerk middleware
export { clerkMiddleware, requireAuth };

// Extended request with user info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      dbUser?: {
        id: string;
        clerkId: string;
        email: string;
        name: string | null;
      };
    }
  }
}

/**
 * Middleware to sync Clerk user to database and attach to request
 */
export async function syncUser(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);

    if (!auth.userId) {
      return next();
    }

    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { clerkId: auth.userId },
      select: { id: true, clerkId: true, email: true, name: true },
    });

    // If not found, create new user (webhook will update with full details)
    if (!user) {
      // Get user details from Clerk session claims
      const sessionClaims = auth.sessionClaims as Record<string, unknown> | undefined;
      const email = (sessionClaims?.email as string) || `${auth.userId}@placeholder.com`;
      const name = sessionClaims?.name as string | undefined;

      user = await prisma.user.create({
        data: {
          clerkId: auth.userId,
          email,
          name: name || null,
        },
        select: { id: true, clerkId: true, email: true, name: true },
      });
    }

    req.userId = user.id;
    req.dbUser = user;

    next();
  } catch (error) {
    console.error('[Auth] Failed to sync user:', error);
    next(error);
  }
}

/**
 * Middleware to require authentication and user sync
 */
export function requireUser(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);

  if (!auth.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: 'User not found',
    });
  }

  next();
}

/**
 * Get the current user ID from request
 */
export function getCurrentUserId(req: Request): string | null {
  return req.userId || null;
}

/**
 * Check if user owns a resource or has permission
 */
export async function checkMapPermission(
  req: Request,
  mapId: string,
  requiredPermission: 'VIEWER' | 'COMMENTER' | 'EDITOR' | 'OWNER' = 'VIEWER'
): Promise<boolean> {
  const userId = req.userId;

  if (!userId) {
    return false;
  }

  // Check if user owns the map
  const map = await prisma.mindMap.findUnique({
    where: { id: mapId },
    select: { userId: true, isPublic: true },
  });

  if (!map) {
    return false;
  }

  // Owner has all permissions
  if (map.userId === userId) {
    return true;
  }

  // Public maps allow viewer access
  if (map.isPublic && requiredPermission === 'VIEWER') {
    return true;
  }

  // Check for explicit share
  const share = await prisma.share.findFirst({
    where: {
      mindMapId: mapId,
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: { permission: true },
  });

  if (!share) {
    return false;
  }

  // Permission hierarchy: OWNER > EDITOR > COMMENTER > VIEWER
  const permissionLevel: Record<string, number> = {
    VIEWER: 1,
    COMMENTER: 2,
    EDITOR: 3,
    OWNER: 4,
  };

  return permissionLevel[share.permission] >= permissionLevel[requiredPermission];
}
