import { Router, type Request } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { AppError, Errors, asyncHandler } from '../middleware/errorHandler.js';
import { validate, validateBody, validateParams, type ValidatedRequest } from '../middleware/validate.js';
import { cuidSchema } from '../lib/validation/schemas.js';

export const sharesRouter = Router();

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// Permission levels for validation
const VALID_PERMISSIONS = ['VIEWER', 'COMMENTER', 'EDITOR'] as const;
type SharePermission = typeof VALID_PERMISSIONS[number];

// Permission hierarchy for authorization checks
const PERMISSION_LEVEL: Record<string, number> = {
  VIEWER: 1,
  COMMENTER: 2,
  EDITOR: 3,
  OWNER: 4,
};

// Validation schemas
const permissionSchema = z.enum(VALID_PERMISSIONS);

const createShareSchema = z.object({
  userId: z.string().cuid().optional(),
  permission: permissionSchema.default('VIEWER'),
  expiresAt: z.string().datetime().optional().refine(
    (val) => !val || new Date(val) > new Date(),
    { message: 'Expiration date must be in the future' }
  ),
  password: z.string().min(4).max(50).optional(),
});

const updateShareSchema = z.object({
  permission: permissionSchema.optional(),
  expiresAt: z.string().datetime().optional().nullable().refine(
    (val) => val === null || !val || new Date(val) > new Date(),
    { message: 'Expiration date must be in the future' }
  ),
  password: z.string().min(4).max(50).optional().nullable(),
});

const shareIdParamsSchema = z.object({
  mapId: cuidSchema,
  shareId: cuidSchema,
});

const mapIdParamsSchema = z.object({
  mapId: cuidSchema,
});

const tokenParamsSchema = z.object({
  token: z.string().min(1),
});

// Helper to verify map ownership
async function verifyMapOwnership(mapId: string, userId: string): Promise<{ id: string; userId: string }> {
  const map = await prisma.mindMap.findFirst({
    where: { id: mapId, userId },
  });

  if (!map) {
    throw Errors.notFound('Mind map');
  }

  return map;
}

// Helper to verify share exists
async function verifyShareExists(shareId: string, mapId: string) {
  const share = await prisma.share.findFirst({
    where: { id: shareId, mindMapId: mapId },
  });

  if (!share) {
    throw Errors.notFound('Share');
  }

  return share;
}

// GET /api/maps/:mapId/shares - List shares for a mind map
sharesRouter.get(
  '/maps/:mapId/shares',
  validateParams(mapIdParamsSchema),
  asyncHandler(async (req, res) => {
    const { mapId } = (req as ValidatedRequest).validatedParams as { mapId: string };
    const userId = getUserId(req);

    // Verify user owns the map
    await verifyMapOwnership(mapId, userId);

    const shares = await prisma.share.findMany({
      where: { mindMapId: mapId },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch user details for shares with userId
    const userIds = shares.filter(s => s.userId).map(s => s.userId as string);
    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true, avatarUrl: true },
    }) : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    res.json({
      success: true,
      data: shares.map(share => ({
        ...share,
        shareToken: share.shareToken ? `***${share.shareToken.slice(-8)}` : null,
        password: share.password ? '***' : null,
        user: share.userId ? userMap.get(share.userId) || null : null,
      })),
    });
  })
);

// POST /api/maps/:mapId/shares - Create a new share for a mind map
sharesRouter.post(
  '/maps/:mapId/shares',
  validate({
    params: mapIdParamsSchema,
    body: createShareSchema,
  }),
  asyncHandler(async (req, res) => {
    const { mapId } = (req as ValidatedRequest).validatedParams as { mapId: string };
    const data = (req as ValidatedRequest).validatedBody as z.infer<typeof createShareSchema>;
    const userId = getUserId(req);

    // Verify user owns the map
    await verifyMapOwnership(mapId, userId);

    // Validate permission level (cannot grant higher than EDITOR for shares)
    if (data.permission && !VALID_PERMISSIONS.includes(data.permission)) {
      throw Errors.validation('Invalid permission level', {
        permission: `Must be one of: ${VALID_PERMISSIONS.join(', ')}`,
      });
    }

    // Generate share token if not sharing with specific user
    const shareToken = data.userId ? null : randomBytes(32).toString('hex');

    const share = await prisma.share.create({
      data: {
        mindMapId: mapId,
        userId: data.userId,
        shareToken,
        permission: data.permission,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        password: data.password, // TODO: Hash password in production
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...share,
        shareUrl: shareToken
          ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/shared/${shareToken}`
          : null,
      },
    });
  })
);

// PATCH /api/maps/:mapId/shares/:shareId - Update share permissions
sharesRouter.patch(
  '/maps/:mapId/shares/:shareId',
  validate({
    params: shareIdParamsSchema,
    body: updateShareSchema,
  }),
  asyncHandler(async (req, res) => {
    const { mapId, shareId } = (req as ValidatedRequest).validatedParams as { mapId: string; shareId: string };
    const data = (req as ValidatedRequest).validatedBody as z.infer<typeof updateShareSchema>;
    const userId = getUserId(req);

    // Verify user owns the map
    await verifyMapOwnership(mapId, userId);

    // Verify share exists
    const existingShare = await verifyShareExists(shareId, mapId);

    // Validate permission level if provided
    if (data.permission && !VALID_PERMISSIONS.includes(data.permission)) {
      throw Errors.validation('Invalid permission level', {
        permission: `Must be one of: ${VALID_PERMISSIONS.join(', ')}`,
      });
    }

    // Build update data
    const updateData: {
      permission?: SharePermission;
      expiresAt?: Date | null;
      password?: string | null;
    } = {};

    if (data.permission !== undefined) {
      updateData.permission = data.permission;
    }

    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }

    if (data.password !== undefined) {
      updateData.password = data.password; // TODO: Hash password in production
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      throw Errors.badRequest('No valid fields provided for update');
    }

    const updatedShare = await prisma.share.update({
      where: { id: shareId },
      data: updateData,
    });

    res.json({
      success: true,
      data: {
        ...updatedShare,
        shareToken: updatedShare.shareToken ? `***${updatedShare.shareToken.slice(-8)}` : null,
        password: updatedShare.password ? '***' : null,
      },
    });
  })
);

// DELETE /api/maps/:mapId/shares/:shareId - Revoke share access
sharesRouter.delete(
  '/maps/:mapId/shares/:shareId',
  validateParams(shareIdParamsSchema),
  asyncHandler(async (req, res) => {
    const { mapId, shareId } = (req as ValidatedRequest).validatedParams as { mapId: string; shareId: string };
    const userId = getUserId(req);

    // Verify user owns the map
    await verifyMapOwnership(mapId, userId);

    // Verify share exists
    await verifyShareExists(shareId, mapId);

    await prisma.share.delete({
      where: { id: shareId },
    });

    res.json({
      success: true,
      message: 'Share revoked successfully',
    });
  })
);

// GET /api/shared/:token - Access shared map via token
sharesRouter.get(
  '/shared/:token',
  validateParams(tokenParamsSchema),
  asyncHandler(async (req, res) => {
    const { token } = (req as ValidatedRequest).validatedParams as { token: string };

    const share = await prisma.share.findFirst({
      where: {
        shareToken: token,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        mindMap: {
          include: {
            nodes: { orderBy: { sortOrder: 'asc' } },
            connections: true,
          },
        },
      },
    });

    if (!share) {
      throw Errors.notFound('Share not found or expired');
    }

    // Check if password protected
    if (share.password) {
      const providedPassword = req.headers['x-share-password'] as string;
      if (!providedPassword || providedPassword !== share.password) {
        res.status(401).json({
          success: false,
          error: 'Password required',
          requiresPassword: true,
        });
        return;
      }
    }

    res.json({
      success: true,
      data: {
        permission: share.permission,
        mindMap: share.mindMap,
      },
    });
  })
);

// Verify password schema
const verifyPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// POST /api/shared/:token/verify - Verify password for password-protected share
sharesRouter.post(
  '/shared/:token/verify',
  validate({
    params: tokenParamsSchema,
    body: verifyPasswordSchema,
  }),
  asyncHandler(async (req, res) => {
    const { token } = (req as ValidatedRequest).validatedParams as { token: string };
    const { password } = (req as ValidatedRequest).validatedBody as z.infer<typeof verifyPasswordSchema>;

    const share = await prisma.share.findFirst({
      where: {
        shareToken: token,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!share) {
      throw Errors.notFound('Share not found or expired');
    }

    if (!share.password || share.password !== password) {
      throw Errors.unauthorized('Invalid password');
    }

    res.json({
      success: true,
      message: 'Password verified',
    });
  })
);
