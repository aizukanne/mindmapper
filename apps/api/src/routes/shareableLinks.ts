import { Router, type Request } from 'express';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { Errors, asyncHandler } from '../middleware/errorHandler.js';
import { validate, validateParams, type ValidatedRequest } from '../middleware/validate.js';
import { cuidSchema } from '../lib/validation/schemas.js';

export const shareableLinksRouter = Router();

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// Permission levels for validation
const VALID_PERMISSIONS = ['VIEWER', 'COMMENTER', 'EDITOR'] as const;
type LinkPermission = (typeof VALID_PERMISSIONS)[number];

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword;
}

// Generate a unique token for the shareable link
function generateToken(): string {
  return randomBytes(16).toString('hex');
}

// Validation schemas
const createShareableLinkSchema = z.object({
  mindMapId: cuidSchema,
  title: z.string().max(255).optional(),
  permission: z.enum(VALID_PERMISSIONS).default('VIEWER'),
  password: z.string().min(4).max(50).optional(),
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .refine((val) => !val || new Date(val) > new Date(), {
      message: 'Expiration date must be in the future',
    }),
  maxAccess: z.number().int().positive().optional(),
});

const updateShareableLinkSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  permission: z.enum(VALID_PERMISSIONS).optional(),
  password: z.string().min(4).max(50).optional().nullable(),
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .refine((val) => val === null || !val || new Date(val) > new Date(), {
      message: 'Expiration date must be in the future',
    }),
  maxAccess: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

const linkIdParamsSchema = z.object({
  linkId: cuidSchema,
});

const tokenParamsSchema = z.object({
  token: z.string().min(1),
});

const verifyPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// Helper to verify map ownership
async function verifyMapOwnership(
  mapId: string,
  userId: string
): Promise<{ id: string; userId: string; title: string }> {
  const map = await prisma.mindMap.findFirst({
    where: { id: mapId, userId },
    select: { id: true, userId: true, title: true },
  });

  if (!map) {
    throw Errors.notFound('Mind map');
  }

  return map;
}

// Helper to verify link ownership
async function verifyLinkOwnership(linkId: string, userId: string) {
  const link = await prisma.shareableLink.findFirst({
    where: { id: linkId, createdBy: userId },
  });

  if (!link) {
    throw Errors.notFound('Shareable link');
  }

  return link;
}

// ==========================================
// Authenticated Routes (require user auth)
// ==========================================

// POST /api/shareable-links - Create a new shareable link
shareableLinksRouter.post(
  '/',
  validate({
    body: createShareableLinkSchema,
  }),
  asyncHandler(async (req, res) => {
    const data = (req as ValidatedRequest).validatedBody as z.infer<typeof createShareableLinkSchema>;
    const userId = getUserId(req);

    // Verify user owns the map
    await verifyMapOwnership(data.mindMapId, userId);

    // Generate unique token
    const token = generateToken();

    // Hash password if provided
    const hashedPassword = data.password ? hashPassword(data.password) : null;

    const shareableLink = await prisma.shareableLink.create({
      data: {
        mindMapId: data.mindMapId,
        token,
        title: data.title,
        permission: data.permission,
        password: hashedPassword,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        maxAccess: data.maxAccess,
        createdBy: userId,
      },
    });

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${shareableLink.token}`;

    res.status(201).json({
      success: true,
      data: {
        id: shareableLink.id,
        token: shareableLink.token,
        shareUrl,
        title: shareableLink.title,
        permission: shareableLink.permission,
        hasPassword: !!shareableLink.password,
        expiresAt: shareableLink.expiresAt,
        maxAccess: shareableLink.maxAccess,
        accessCount: shareableLink.accessCount,
        isActive: shareableLink.isActive,
        createdAt: shareableLink.createdAt,
      },
    });
  })
);

// GET /api/shareable-links/map/:mapId - List all shareable links for a map
shareableLinksRouter.get(
  '/map/:mapId',
  validateParams(z.object({ mapId: cuidSchema })),
  asyncHandler(async (req, res) => {
    const { mapId } = (req as ValidatedRequest).validatedParams as { mapId: string };
    const userId = getUserId(req);

    // Verify user owns the map
    await verifyMapOwnership(mapId, userId);

    const links = await prisma.shareableLink.findMany({
      where: { mindMapId: mapId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: links.map((link) => ({
        id: link.id,
        token: link.token,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${link.token}`,
        title: link.title,
        permission: link.permission,
        hasPassword: !!link.password,
        expiresAt: link.expiresAt,
        maxAccess: link.maxAccess,
        accessCount: link.accessCount,
        isActive: link.isActive,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      })),
    });
  })
);

// GET /api/shareable-links/:linkId - Get a specific shareable link (owner only)
shareableLinksRouter.get(
  '/:linkId',
  validateParams(linkIdParamsSchema),
  asyncHandler(async (req, res) => {
    const { linkId } = (req as ValidatedRequest).validatedParams as { linkId: string };
    const userId = getUserId(req);

    const link = await verifyLinkOwnership(linkId, userId);

    res.json({
      success: true,
      data: {
        id: link.id,
        token: link.token,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${link.token}`,
        title: link.title,
        permission: link.permission,
        hasPassword: !!link.password,
        expiresAt: link.expiresAt,
        maxAccess: link.maxAccess,
        accessCount: link.accessCount,
        isActive: link.isActive,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      },
    });
  })
);

// PATCH /api/shareable-links/:linkId - Update a shareable link
shareableLinksRouter.patch(
  '/:linkId',
  validate({
    params: linkIdParamsSchema,
    body: updateShareableLinkSchema,
  }),
  asyncHandler(async (req, res) => {
    const { linkId } = (req as ValidatedRequest).validatedParams as { linkId: string };
    const data = (req as ValidatedRequest).validatedBody as z.infer<typeof updateShareableLinkSchema>;
    const userId = getUserId(req);

    // Verify user owns the link
    await verifyLinkOwnership(linkId, userId);

    // Build update data
    const updateData: {
      title?: string | null;
      permission?: LinkPermission;
      password?: string | null;
      expiresAt?: Date | null;
      maxAccess?: number | null;
      isActive?: boolean;
    } = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.permission !== undefined) {
      updateData.permission = data.permission;
    }

    if (data.password !== undefined) {
      updateData.password = data.password ? hashPassword(data.password) : null;
    }

    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }

    if (data.maxAccess !== undefined) {
      updateData.maxAccess = data.maxAccess;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    if (Object.keys(updateData).length === 0) {
      throw Errors.badRequest('No valid fields provided for update');
    }

    const updatedLink = await prisma.shareableLink.update({
      where: { id: linkId },
      data: updateData,
    });

    res.json({
      success: true,
      data: {
        id: updatedLink.id,
        token: updatedLink.token,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${updatedLink.token}`,
        title: updatedLink.title,
        permission: updatedLink.permission,
        hasPassword: !!updatedLink.password,
        expiresAt: updatedLink.expiresAt,
        maxAccess: updatedLink.maxAccess,
        accessCount: updatedLink.accessCount,
        isActive: updatedLink.isActive,
        createdAt: updatedLink.createdAt,
        updatedAt: updatedLink.updatedAt,
      },
    });
  })
);

// DELETE /api/shareable-links/:linkId - Delete a shareable link
shareableLinksRouter.delete(
  '/:linkId',
  validateParams(linkIdParamsSchema),
  asyncHandler(async (req, res) => {
    const { linkId } = (req as ValidatedRequest).validatedParams as { linkId: string };
    const userId = getUserId(req);

    // Verify user owns the link
    await verifyLinkOwnership(linkId, userId);

    await prisma.shareableLink.delete({
      where: { id: linkId },
    });

    res.json({
      success: true,
      message: 'Shareable link deleted successfully',
    });
  })
);

// ==========================================
// Public Routes (no authentication required)
// ==========================================

// GET /api/public/share/:token - Get shared map info (public, no auth)
shareableLinksRouter.get(
  '/public/:token',
  validateParams(tokenParamsSchema),
  asyncHandler(async (req, res) => {
    const { token } = (req as ValidatedRequest).validatedParams as { token: string };

    const link = await prisma.shareableLink.findFirst({
      where: {
        token,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        mindMap: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
          },
        },
      },
    });

    if (!link) {
      throw Errors.notFound('Share link not found, expired, or inactive');
    }

    // Check if max access count exceeded
    if (link.maxAccess !== null && link.accessCount >= link.maxAccess) {
      throw Errors.forbidden('This share link has reached its maximum access limit');
    }

    // Return info - password check happens in separate verify endpoint
    res.json({
      success: true,
      data: {
        id: link.id,
        title: link.title || link.mindMap.title,
        mapTitle: link.mindMap.title,
        mapDescription: link.mindMap.description,
        mapThumbnail: link.mindMap.thumbnail,
        permission: link.permission,
        requiresPassword: !!link.password,
        expiresAt: link.expiresAt,
      },
    });
  })
);

// POST /api/public/share/:token/verify - Verify password and get access token
shareableLinksRouter.post(
  '/public/:token/verify',
  validate({
    params: tokenParamsSchema,
    body: verifyPasswordSchema,
  }),
  asyncHandler(async (req, res) => {
    const { token } = (req as ValidatedRequest).validatedParams as { token: string };
    const { password } = (req as ValidatedRequest).validatedBody as z.infer<typeof verifyPasswordSchema>;

    const link = await prisma.shareableLink.findFirst({
      where: {
        token,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!link) {
      throw Errors.notFound('Share link not found, expired, or inactive');
    }

    if (!link.password) {
      // No password required
      res.json({
        success: true,
        message: 'No password required',
        verified: true,
      });
      return;
    }

    if (!verifyPassword(password, link.password)) {
      throw Errors.unauthorized('Invalid password');
    }

    res.json({
      success: true,
      message: 'Password verified',
      verified: true,
    });
  })
);

// GET /api/public/share/:token/content - Get the shared map content
shareableLinksRouter.get(
  '/public/:token/content',
  validateParams(tokenParamsSchema),
  asyncHandler(async (req, res) => {
    const { token } = (req as ValidatedRequest).validatedParams as { token: string };
    const providedPassword = req.headers['x-share-password'] as string | undefined;

    const link = await prisma.shareableLink.findFirst({
      where: {
        token,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
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

    if (!link) {
      throw Errors.notFound('Share link not found, expired, or inactive');
    }

    // Check if max access count exceeded
    if (link.maxAccess !== null && link.accessCount >= link.maxAccess) {
      throw Errors.forbidden('This share link has reached its maximum access limit');
    }

    // Check password if required
    if (link.password) {
      if (!providedPassword) {
        res.status(401).json({
          success: false,
          error: 'Password required',
          requiresPassword: true,
        });
        return;
      }

      if (!verifyPassword(providedPassword, link.password)) {
        throw Errors.unauthorized('Invalid password');
      }
    }

    // Increment access count
    await prisma.shareableLink.update({
      where: { id: link.id },
      data: { accessCount: { increment: 1 } },
    });

    res.json({
      success: true,
      data: {
        permission: link.permission,
        title: link.title || link.mindMap.title,
        mindMap: {
          id: link.mindMap.id,
          title: link.mindMap.title,
          description: link.mindMap.description,
          nodes: link.mindMap.nodes,
          connections: link.mindMap.connections,
        },
      },
    });
  })
);
