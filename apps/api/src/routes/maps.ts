import { Router, type Request } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import {
  validate,
  validateBody,
  validateParams,
  validateQuery,
  type ValidatedRequest,
} from '../middleware/validate.js';
import {
  cuidSchema,
  optionalIdSchema,
  queryBooleanSchema,
} from '../lib/validation/index.js';
import {
  requireMapAccess,
  requireMapEditor,
  requireMapOwnership,
  requireMapAccessOrPublic,
  type PermissionRequest,
} from '../middleware/permissionCheck.js';

export const mapsRouter = Router();

// ==========================================
// Validation Schemas
// ==========================================

// Request body schemas
const createMapSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  folderId: z.string().cuid('Invalid folder ID').optional(),
});

const updateMapSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less').optional(),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  isFavorite: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
});

// Query parameter schemas
const listMapsQuerySchema = z.object({
  folderId: z.string().optional(),
  favorite: queryBooleanSchema,
  archived: queryBooleanSchema,
});

// URL parameter schemas
const mapIdParamSchema = z.object({
  id: cuidSchema,
});

// ==========================================
// Type Definitions
// ==========================================

type CreateMapBody = z.infer<typeof createMapSchema>;
type UpdateMapBody = z.infer<typeof updateMapSchema>;
type ListMapsQuery = z.infer<typeof listMapsQuerySchema>;
type MapIdParams = z.infer<typeof mapIdParamSchema>;

// ==========================================
// Helper Functions
// ==========================================

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// ==========================================
// Route Handlers
// ==========================================

// GET /api/maps - List all maps for user
mapsRouter.get(
  '/',
  validateQuery(listMapsQuerySchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { folderId, favorite, archived } = (req as ValidatedRequest).validatedQuery as ListMapsQuery;

    // Build where clause
    const where: Prisma.MindMapWhereInput = {
      userId,
      isArchived: archived === true,
    };

    // Handle folder filtering
    if (folderId !== undefined) {
      // If folderId is explicitly provided, filter by it
      // 'null' or empty string means root folder (no folder)
      if (folderId === 'null' || folderId === '') {
        where.folderId = null;
      } else {
        where.folderId = folderId;
      }
    }
    // If folderId is not provided, show all maps (don't filter by folder)

    if (favorite === true) {
      where.isFavorite = true;
    }

    const maps = await prisma.mindMap.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { nodes: true },
        },
      },
    });

    res.json({
      success: true,
      data: maps,
    });
  })
);

// POST /api/maps - Create new map
mapsRouter.post(
  '/',
  validateBody(createMapSchema),
  asyncHandler(async (req, res) => {
    const data = (req as ValidatedRequest).validatedBody as CreateMapBody;

    // Ensure user exists (create if not for development)
    await prisma.user.upsert({
      where: { id: getUserId(req) },
      update: {},
      create: {
        id: getUserId(req),
        clerkId: 'temp-clerk-id',
        email: 'temp@example.com',
        name: 'Temp User',
      },
    });

    const map = await prisma.mindMap.create({
      data: {
        title: data.title,
        description: data.description,
        userId: getUserId(req),
        folderId: data.folderId,
      },
    });

    // Create root node
    await prisma.node.create({
      data: {
        mindMapId: map.id,
        type: 'ROOT',
        text: 'Central Idea',
        positionX: 400,
        positionY: 300,
        style: {
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1,
          borderRadius: 12,
          textColor: '#ffffff',
          fontSize: 18,
          fontWeight: 'bold',
          fontStyle: 'normal',
          shape: 'rounded',
        },
      },
    });

    res.status(201).json({
      success: true,
      data: map,
    });
  })
);

// GET /api/maps/:id - Get single map with all nodes
// Uses requireMapAccessOrPublic to allow access if:
// - User is the owner
// - User has explicit share permission
// - Map is public
mapsRouter.get(
  '/:id',
  validateParams(mapIdParamSchema),
  requireMapAccessOrPublic(),
  asyncHandler(async (req, res) => {
    const { id } = (req as ValidatedRequest).validatedParams as MapIdParams;
    const permissionInfo = (req as PermissionRequest).mapPermission;

    const map = await prisma.mindMap.findUnique({
      where: { id },
      include: {
        nodes: {
          orderBy: { sortOrder: 'asc' },
        },
        connections: true,
      },
    });

    if (!map) {
      throw new AppError(404, 'Mind map not found');
    }

    res.json({
      success: true,
      data: map,
      permission: permissionInfo?.permission,
    });
  })
);

// PUT /api/maps/:id - Update map
// Requires EDITOR permission (owner or editor via share)
mapsRouter.put(
  '/:id',
  validate({
    params: mapIdParamSchema,
    body: updateMapSchema,
  }),
  requireMapEditor(),
  asyncHandler(async (req, res) => {
    const { id } = (req as ValidatedRequest).validatedParams as MapIdParams;
    const data = (req as ValidatedRequest).validatedBody as UpdateMapBody;

    const updatedMap = await prisma.mindMap.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        isFavorite: data.isFavorite,
        isPublic: data.isPublic,
        settings: data.settings ? data.settings as Prisma.InputJsonValue : undefined,
      },
    });

    res.json({
      success: true,
      data: updatedMap,
    });
  })
);

// DELETE /api/maps/:id - Delete map
// Requires OWNER permission (only the map owner can delete)
mapsRouter.delete(
  '/:id',
  validateParams(mapIdParamSchema),
  requireMapOwnership(),
  asyncHandler(async (req, res) => {
    const { id } = (req as ValidatedRequest).validatedParams as MapIdParams;

    await prisma.mindMap.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Mind map deleted',
    });
  })
);

// PATCH /api/maps/:id/favorite - Toggle favorite status
// Requires OWNER permission (only owner can favorite their own map)
mapsRouter.patch(
  '/:id/favorite',
  validateParams(mapIdParamSchema),
  requireMapOwnership(),
  asyncHandler(async (req, res) => {
    const { id } = (req as ValidatedRequest).validatedParams as MapIdParams;

    const map = await prisma.mindMap.findUnique({
      where: { id },
    });

    if (!map) {
      throw new AppError(404, 'Mind map not found');
    }

    const updatedMap = await prisma.mindMap.update({
      where: { id },
      data: {
        isFavorite: !map.isFavorite,
      },
    });

    res.json({
      success: true,
      data: updatedMap,
    });
  })
);

// POST /api/maps/:id/duplicate - Duplicate a map
// Requires at least VIEWER access (can duplicate maps you have access to)
mapsRouter.post(
  '/:id/duplicate',
  validateParams(mapIdParamSchema),
  requireMapAccessOrPublic(),
  asyncHandler(async (req, res) => {
    const { id } = (req as ValidatedRequest).validatedParams as MapIdParams;

    const originalMap = await prisma.mindMap.findUnique({
      where: { id },
      include: {
        nodes: true,
        connections: true,
      },
    });

    if (!originalMap) {
      throw new AppError(404, 'Mind map not found');
    }

    // Create new map
    const newMap = await prisma.mindMap.create({
      data: {
        title: `${originalMap.title} (Copy)`,
        description: originalMap.description,
        settings: originalMap.settings as Prisma.InputJsonValue,
        userId: getUserId(req),
      },
    });

    // Create node ID mapping
    const nodeIdMap = new Map<string, string>();

    // Create nodes with new IDs
    for (const node of originalMap.nodes) {
      const newNode = await prisma.node.create({
        data: {
          mindMapId: newMap.id,
          parentId: null, // Will update after all nodes created
          type: node.type,
          text: node.text,
          positionX: node.positionX,
          positionY: node.positionY,
          width: node.width,
          height: node.height,
          style: node.style as Prisma.InputJsonValue,
          metadata: node.metadata as Prisma.InputJsonValue,
          sortOrder: node.sortOrder,
          isCollapsed: node.isCollapsed,
        },
      });
      nodeIdMap.set(node.id, newNode.id);
    }

    // Update parent references
    for (const node of originalMap.nodes) {
      if (node.parentId) {
        await prisma.node.update({
          where: { id: nodeIdMap.get(node.id)! },
          data: { parentId: nodeIdMap.get(node.parentId) },
        });
      }
    }

    // Create connections
    for (const conn of originalMap.connections) {
      await prisma.connection.create({
        data: {
          mindMapId: newMap.id,
          sourceNodeId: nodeIdMap.get(conn.sourceNodeId)!,
          targetNodeId: nodeIdMap.get(conn.targetNodeId)!,
          type: conn.type,
          label: conn.label,
          style: conn.style as Prisma.InputJsonValue,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: newMap,
    });
  })
);
