import { Router, type Request } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const nodesRouter = Router();

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// Validation schemas
const createNodeSchema = z.object({
  parentId: z.string().cuid().nullable(),
  type: z.enum(['ROOT', 'CHILD', 'FLOATING']).default('CHILD'),
  text: z.string().min(1).max(500),
  positionX: z.number(),
  positionY: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  style: z.record(z.unknown()).optional(),
});

const updateNodeSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  style: z.record(z.unknown()).optional(),
  isCollapsed: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

const batchUpdateSchema = z.object({
  operations: z.array(z.object({
    type: z.enum(['create', 'update', 'delete']),
    nodeId: z.string().cuid().optional(),
    data: z.record(z.unknown()).optional(),
  })),
});

// Helper to check map ownership
async function verifyMapAccess(mapId: string, userId: string): Promise<boolean> {
  const map = await prisma.mindMap.findFirst({
    where: {
      id: mapId,
      OR: [
        { userId },
        { isPublic: true },
      ],
    },
  });
  return !!map;
}

// POST /api/maps/:mapId/nodes - Create node
nodesRouter.post('/:mapId/nodes', async (req, res, next) => {
  try {
    const { mapId } = req.params;
    const data = createNodeSchema.parse(req.body);

    if (!await verifyMapAccess(mapId, getUserId(req))) {
      throw new AppError(404, 'Mind map not found');
    }

    const node = await prisma.node.create({
      data: {
        mindMapId: mapId,
        parentId: data.parentId,
        type: data.type,
        text: data.text,
        positionX: data.positionX,
        positionY: data.positionY,
        width: data.width,
        height: data.height,
        style: (data.style || {}) as Prisma.InputJsonValue,
      },
    });

    // Create connection if has parent
    if (data.parentId) {
      await prisma.connection.create({
        data: {
          mindMapId: mapId,
          sourceNodeId: data.parentId,
          targetNodeId: node.id,
          type: 'HIERARCHICAL',
        },
      });
    }

    res.status(201).json({
      success: true,
      data: node,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/maps/:mapId/nodes/:nodeId - Update node
nodesRouter.put('/:mapId/nodes/:nodeId', async (req, res, next) => {
  try {
    const { mapId, nodeId } = req.params;
    const data = updateNodeSchema.parse(req.body);

    if (!await verifyMapAccess(mapId, getUserId(req))) {
      throw new AppError(404, 'Mind map not found');
    }

    const node = await prisma.node.findFirst({
      where: { id: nodeId, mindMapId: mapId },
    });

    if (!node) {
      throw new AppError(404, 'Node not found');
    }

    const updateData: Prisma.NodeUpdateInput = {
      text: data.text,
      positionX: data.positionX,
      positionY: data.positionY,
      width: data.width,
      height: data.height,
      isCollapsed: data.isCollapsed,
      sortOrder: data.sortOrder,
    };

    if (data.style) {
      updateData.style = { ...(node.style as object), ...data.style } as Prisma.InputJsonValue;
    }

    const updatedNode = await prisma.node.update({
      where: { id: nodeId },
      data: updateData,
    });

    res.json({
      success: true,
      data: updatedNode,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/maps/:mapId/nodes/:nodeId - Delete node and children
nodesRouter.delete('/:mapId/nodes/:nodeId', async (req, res, next) => {
  try {
    const { mapId, nodeId } = req.params;

    if (!await verifyMapAccess(mapId, getUserId(req))) {
      throw new AppError(404, 'Mind map not found');
    }

    const node = await prisma.node.findFirst({
      where: { id: nodeId, mindMapId: mapId },
    });

    if (!node) {
      throw new AppError(404, 'Node not found');
    }

    if (node.type === 'ROOT') {
      throw new AppError(400, 'Cannot delete root node');
    }

    // Delete cascades to children and connections via Prisma schema
    await prisma.node.delete({
      where: { id: nodeId },
    });

    res.json({
      success: true,
      message: 'Node deleted',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/maps/:mapId/nodes/batch - Batch operations
nodesRouter.post('/:mapId/nodes/batch', async (req, res, next) => {
  try {
    const { mapId } = req.params;
    const { operations } = batchUpdateSchema.parse(req.body);

    if (!await verifyMapAccess(mapId, getUserId(req))) {
      throw new AppError(404, 'Mind map not found');
    }

    const results = await prisma.$transaction(async (tx) => {
      const operationResults: Array<{ type: string; nodeId: string; status: string }> = [];

      for (const op of operations) {
        switch (op.type) {
          case 'create': {
            const createData = createNodeSchema.parse(op.data);
            const node = await tx.node.create({
              data: {
                mindMapId: mapId,
                parentId: createData.parentId,
                type: createData.type,
                text: createData.text,
                positionX: createData.positionX,
                positionY: createData.positionY,
                style: (createData.style || {}) as Prisma.InputJsonValue,
              },
            });

            if (createData.parentId) {
              await tx.connection.create({
                data: {
                  mindMapId: mapId,
                  sourceNodeId: createData.parentId,
                  targetNodeId: node.id,
                  type: 'HIERARCHICAL',
                },
              });
            }

            operationResults.push({ type: 'create', nodeId: node.id, status: 'ok' });
            break;
          }

          case 'update': {
            if (!op.nodeId) throw new AppError(400, 'nodeId required for update');
            const parsed = updateNodeSchema.parse(op.data);
            const nodeUpdateData: Prisma.NodeUpdateInput = {
              text: parsed.text,
              positionX: parsed.positionX,
              positionY: parsed.positionY,
              width: parsed.width,
              height: parsed.height,
              isCollapsed: parsed.isCollapsed,
              sortOrder: parsed.sortOrder,
            };
            if (parsed.style) {
              nodeUpdateData.style = parsed.style as Prisma.InputJsonValue;
            }
            await tx.node.update({
              where: { id: op.nodeId },
              data: nodeUpdateData,
            });
            operationResults.push({ type: 'update', nodeId: op.nodeId, status: 'ok' });
            break;
          }

          case 'delete': {
            if (!op.nodeId) throw new AppError(400, 'nodeId required for delete');
            const node = await tx.node.findUnique({ where: { id: op.nodeId } });
            if (node?.type === 'ROOT') {
              throw new AppError(400, 'Cannot delete root node');
            }
            await tx.node.delete({ where: { id: op.nodeId } });
            operationResults.push({ type: 'delete', nodeId: op.nodeId, status: 'ok' });
            break;
          }
        }
      }

      return operationResults;
    });

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/maps/:mapId/nodes/:nodeId/position - Update just position (for dragging)
nodesRouter.put('/:mapId/nodes/:nodeId/position', async (req, res, next) => {
  try {
    const { mapId, nodeId } = req.params;
    const { positionX, positionY } = z.object({
      positionX: z.number(),
      positionY: z.number(),
    }).parse(req.body);

    if (!await verifyMapAccess(mapId, getUserId(req))) {
      throw new AppError(404, 'Mind map not found');
    }

    await prisma.node.update({
      where: { id: nodeId },
      data: { positionX, positionY },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
