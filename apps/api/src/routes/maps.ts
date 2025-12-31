import { Router, type Request } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const mapsRouter = Router();

// Validation schemas
const createMapSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  folderId: z.string().cuid().optional(),
});

const updateMapSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  isFavorite: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
});

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// GET /api/maps - List all maps for user
mapsRouter.get('/', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { folderId, favorite, archived } = req.query;

    // Build where clause
    const where: Prisma.MindMapWhereInput = {
      userId,
      isArchived: archived === 'true' ? true : false,
    };

    // Handle folder filtering
    if (folderId !== undefined) {
      // If folderId is explicitly provided, filter by it
      // 'null' or empty string means root folder (no folder)
      if (folderId === 'null' || folderId === '') {
        where.folderId = null;
      } else {
        where.folderId = folderId as string;
      }
    }
    // If folderId is not provided, show all maps (don't filter by folder)

    if (favorite === 'true') {
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
  } catch (error) {
    next(error);
  }
});

// POST /api/maps - Create new map
mapsRouter.post('/', async (req, res, next) => {
  try {
    const data = createMapSchema.parse(req.body);

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
  } catch (error) {
    next(error);
  }
});

// GET /api/maps/:id - Get single map with all nodes
mapsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const map = await prisma.mindMap.findFirst({
      where: {
        id,
        OR: [
          { userId: getUserId(req) },
          { isPublic: true },
        ],
      },
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
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/maps/:id - Update map
mapsRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateMapSchema.parse(req.body);

    const map = await prisma.mindMap.findFirst({
      where: { id, userId: getUserId(req) },
    });

    if (!map) {
      throw new AppError(404, 'Mind map not found');
    }

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
  } catch (error) {
    next(error);
  }
});

// DELETE /api/maps/:id - Delete map
mapsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const map = await prisma.mindMap.findFirst({
      where: { id, userId: getUserId(req) },
    });

    if (!map) {
      throw new AppError(404, 'Mind map not found');
    }

    await prisma.mindMap.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Mind map deleted',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/maps/:id/duplicate - Duplicate a map
mapsRouter.post('/:id/duplicate', async (req, res, next) => {
  try {
    const { id } = req.params;

    const originalMap = await prisma.mindMap.findFirst({
      where: {
        id,
        OR: [
          { userId: getUserId(req) },
          { isPublic: true },
        ],
      },
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
        settings: originalMap.settings as any,
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
          style: node.style as any,
          metadata: node.metadata as any,
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
          style: conn.style as any,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: newMap,
    });
  } catch (error) {
    next(error);
  }
});
