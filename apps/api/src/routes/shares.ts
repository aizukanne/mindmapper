import { Router, type Request } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const sharesRouter = Router();

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// Validation schemas
const createShareSchema = z.object({
  userId: z.string().cuid().optional(),
  permission: z.enum(['VIEWER', 'COMMENTER', 'EDITOR']).default('VIEWER'),
  expiresAt: z.string().datetime().optional(),
  password: z.string().min(4).max(50).optional(),
});

// GET /api/maps/:mapId/shares - List shares
sharesRouter.get('/maps/:mapId/shares', async (req, res, next) => {
  try {
    const { mapId } = req.params;

    const map = await prisma.mindMap.findFirst({
      where: { id: mapId, userId: getUserId(req) },
    });

    if (!map) {
      throw new AppError(404, 'Mind map not found');
    }

    const shares = await prisma.share.findMany({
      where: { mindMapId: mapId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: shares.map(share => ({
        ...share,
        shareToken: share.shareToken ? `***${share.shareToken.slice(-8)}` : null,
        password: share.password ? '***' : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/maps/:mapId/shares - Create share
sharesRouter.post('/maps/:mapId/shares', async (req, res, next) => {
  try {
    const { mapId } = req.params;
    const data = createShareSchema.parse(req.body);

    const map = await prisma.mindMap.findFirst({
      where: { id: mapId, userId: getUserId(req) },
    });

    if (!map) {
      throw new AppError(404, 'Mind map not found');
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
  } catch (error) {
    next(error);
  }
});

// DELETE /api/maps/:mapId/shares/:shareId - Revoke share
sharesRouter.delete('/maps/:mapId/shares/:shareId', async (req, res, next) => {
  try {
    const { mapId, shareId } = req.params;

    const map = await prisma.mindMap.findFirst({
      where: { id: mapId, userId: getUserId(req) },
    });

    if (!map) {
      throw new AppError(404, 'Mind map not found');
    }

    const share = await prisma.share.findFirst({
      where: { id: shareId, mindMapId: mapId },
    });

    if (!share) {
      throw new AppError(404, 'Share not found');
    }

    await prisma.share.delete({
      where: { id: shareId },
    });

    res.json({
      success: true,
      message: 'Share revoked',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/shared/:token - Access shared map
sharesRouter.get('/shared/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

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
      throw new AppError(404, 'Share not found or expired');
    }

    // Check if password protected
    if (share.password) {
      const providedPassword = req.headers['x-share-password'] as string;
      if (!providedPassword || providedPassword !== share.password) {
        return res.status(401).json({
          success: false,
          error: 'Password required',
          requiresPassword: true,
        });
      }
    }

    res.json({
      success: true,
      data: {
        permission: share.permission,
        mindMap: share.mindMap,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/shared/:token/verify - Verify password
sharesRouter.post('/shared/:token/verify', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = z.object({ password: z.string() }).parse(req.body);

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
      throw new AppError(404, 'Share not found or expired');
    }

    if (!share.password || share.password !== password) {
      throw new AppError(401, 'Invalid password');
    }

    res.json({
      success: true,
      message: 'Password verified',
    });
  } catch (error) {
    next(error);
  }
});
