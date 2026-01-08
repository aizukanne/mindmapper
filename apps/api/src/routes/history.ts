import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { checkMapPermission } from '../middleware/auth.js';
import { validateQuery, validateParams, type ValidatedRequest } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { MapEventType, MapEntityType } from '@mindmapper/types';
import type { Prisma } from '@prisma/client';

export const historyRouter = Router();

// Helper to get user ID from request (with fallback for dev mode)
function getUserId(req: Request): string {
  return req.userId || 'dev-user-id';
}

// Valid event and entity types for validation
const validEventTypes: MapEventType[] = [
  'CREATE_NODE',
  'UPDATE_NODE',
  'DELETE_NODE',
  'MOVE_NODE',
  'CREATE_CONNECTION',
  'UPDATE_CONNECTION',
  'DELETE_CONNECTION',
  'UPDATE_MAP',
  'RESTORE',
];

const validEntityTypes: MapEntityType[] = ['NODE', 'CONNECTION', 'MAP'];

// ==========================================
// Validation Schemas
// ==========================================

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  eventType: z.enum([
    'CREATE_NODE',
    'UPDATE_NODE',
    'DELETE_NODE',
    'MOVE_NODE',
    'CREATE_CONNECTION',
    'UPDATE_CONNECTION',
    'DELETE_CONNECTION',
    'UPDATE_MAP',
    'RESTORE',
  ]).optional(),
  entityType: z.enum(['NODE', 'CONNECTION', 'MAP']).optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  endDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  search: z.string().max(255).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const mapIdParamSchema = z.object({
  mapId: z.string().cuid(),
});

const eventIdParamSchema = z.object({
  mapId: z.string().cuid(),
  eventId: z.string().cuid(),
});

// ==========================================
// Type Definitions
// ==========================================

type HistoryQuery = z.infer<typeof historyQuerySchema>;

// ==========================================
// GET /maps/:mapId/history - List history events with advanced filtering
// ==========================================
historyRouter.get(
  '/maps/:mapId/history',
  validateParams(mapIdParamSchema),
  validateQuery(historyQuerySchema),
  asyncHandler(async (req, res) => {
    const { mapId } = req.params;
    const {
      limit,
      offset,
      eventType,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
      search,
      sortOrder,
    } = (req as ValidatedRequest).validatedQuery as HistoryQuery;

    // Check permission (VIEWER or higher)
    const hasPermission = await checkMapPermission(req, mapId, 'VIEWER');
    if (!hasPermission) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Build dynamic where clause
    const where: Prisma.MapEventWhereInput = { mindMapId: mapId };

    // Filter by event type
    if (eventType && validEventTypes.includes(eventType as MapEventType)) {
      where.eventType = eventType as MapEventType;
    }

    // Filter by entity type
    if (entityType && validEntityTypes.includes(entityType as MapEntityType)) {
      where.entityType = entityType as MapEntityType;
    }

    // Filter by specific entity ID
    if (entityId) {
      where.entityId = entityId;
    }

    // Filter by user who made the change
    if (userId) {
      where.userId = userId;
    }

    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        // Parse date and set to start of day if only date provided
        const start = startDate.includes('T') ? new Date(startDate) : new Date(`${startDate}T00:00:00.000Z`);
        where.createdAt.gte = start;
      }
      if (endDate) {
        // Parse date and set to end of day if only date provided
        const end = endDate.includes('T') ? new Date(endDate) : new Date(`${endDate}T23:59:59.999Z`);
        where.createdAt.lte = end;
      }
    }

    // Search in description
    if (search) {
      where.description = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [events, total] = await Promise.all([
      prisma.mapEvent.findMany({
        where,
        orderBy: { createdAt: sortOrder || 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
      prisma.mapEvent.count({ where }),
    ]);

    res.json({
      data: events,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + events.length < total,
      },
      filters: {
        eventType: eventType || null,
        entityType: entityType || null,
        entityId: entityId || null,
        userId: userId || null,
        startDate: startDate || null,
        endDate: endDate || null,
        search: search || null,
      },
    });
  })
);

// Options for recording an event
interface RecordEventOptions {
  description?: string;
  metadata?: Record<string, unknown>;
}

// Record a new event (internal use - called from other routes)
export async function recordEvent(
  mindMapId: string,
  userId: string,
  eventType: MapEventType,
  entityType: MapEntityType,
  entityId: string,
  previousState?: unknown,
  newState?: unknown,
  options?: RecordEventOptions
) {
  return prisma.mapEvent.create({
    data: {
      mindMapId,
      userId,
      eventType,
      entityType,
      entityId,
      description: options?.description || null,
      previousState: previousState ? JSON.parse(JSON.stringify(previousState)) : null,
      newState: newState ? JSON.parse(JSON.stringify(newState)) : null,
      metadata: options?.metadata ? JSON.parse(JSON.stringify(options.metadata)) : null,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });
}

// ==========================================
// GET /maps/:mapId/history/:eventId - Get a specific event
// ==========================================
historyRouter.get(
  '/maps/:mapId/history/:eventId',
  validateParams(eventIdParamSchema),
  asyncHandler(async (req, res) => {
    const { mapId, eventId } = req.params;

    // Check permission (VIEWER or higher)
    const hasPermission = await checkMapPermission(req, mapId, 'VIEWER');
    if (!hasPermission) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const event = await prisma.mapEvent.findUnique({
      where: { id: eventId, mindMapId: mapId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Include related events (events affecting the same entity within a time window)
    const relatedEvents = await prisma.mapEvent.findMany({
      where: {
        mindMapId: mapId,
        entityId: event.entityId,
        id: { not: eventId },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    res.json({
      data: event,
      relatedEvents,
    });
  })
);

// ==========================================
// POST /maps/:mapId/restore/:eventId - Restore to a previous state
// ==========================================
historyRouter.post(
  '/maps/:mapId/restore/:eventId',
  validateParams(eventIdParamSchema),
  asyncHandler(async (req, res) => {
    const { mapId, eventId } = req.params;
    const userId = getUserId(req);

    // Check permission (OWNER or EDITOR can restore)
    const hasPermission = await checkMapPermission(req, mapId, 'EDITOR');
    if (!hasPermission) {
      res.status(403).json({ error: 'Access denied - editor or owner required' });
      return;
    }

    // Get the event to restore to
    const targetEvent = await prisma.mapEvent.findUnique({
      where: { id: eventId, mindMapId: mapId },
    });

    if (!targetEvent) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Validate that the event has a previous state to restore
    if (!targetEvent.previousState) {
      res.status(400).json({
        error: 'Cannot restore this event',
        details: 'This event does not have a previous state to restore to.',
      });
      return;
    }

    // Get current state for the entity
    let currentState: unknown = null;
    let restoredEntity: unknown = null;
    let restoreType: 'recreated' | 'updated' | 'none' = 'none';

    if (targetEvent.entityType === 'NODE') {
      // Restore node to previous state
      const previousNode = targetEvent.previousState as {
        id: string;
        text: string;
        type: string;
        parentId: string | null;
        positionX: number;
        positionY: number;
        width: number;
        height: number;
        style: unknown;
        metadata: unknown;
        isCollapsed: boolean;
      };

      // Get current node state
      const currentNode = await prisma.node.findUnique({
        where: { id: targetEvent.entityId },
      });
      currentState = currentNode;

      if (targetEvent.eventType === 'DELETE_NODE') {
        // Verify parent node exists if needed
        if (previousNode.parentId) {
          const parentExists = await prisma.node.findUnique({
            where: { id: previousNode.parentId },
          });
          if (!parentExists) {
            res.status(400).json({
              error: 'Cannot restore deleted node',
              details: 'The parent node no longer exists.',
            });
            return;
          }
        }

        // Re-create deleted node
        restoredEntity = await prisma.node.create({
          data: {
            id: previousNode.id,
            mindMapId: mapId,
            text: previousNode.text,
            type: previousNode.type as 'ROOT' | 'CHILD' | 'FLOATING',
            parentId: previousNode.parentId,
            positionX: previousNode.positionX,
            positionY: previousNode.positionY,
            width: previousNode.width,
            height: previousNode.height,
            style: previousNode.style as object,
            metadata: previousNode.metadata as object,
            isCollapsed: previousNode.isCollapsed,
          },
        });
        restoreType = 'recreated';
      } else if (currentNode) {
        // Update node to previous state
        restoredEntity = await prisma.node.update({
          where: { id: targetEvent.entityId },
          data: {
            text: previousNode.text,
            type: previousNode.type as 'ROOT' | 'CHILD' | 'FLOATING',
            parentId: previousNode.parentId,
            positionX: previousNode.positionX,
            positionY: previousNode.positionY,
            width: previousNode.width,
            height: previousNode.height,
            style: previousNode.style as object,
            metadata: previousNode.metadata as object,
            isCollapsed: previousNode.isCollapsed,
          },
        });
        restoreType = 'updated';
      } else {
        res.status(400).json({
          error: 'Cannot restore node',
          details: 'The node no longer exists and cannot be recreated from this event.',
        });
        return;
      }
    } else if (targetEvent.entityType === 'CONNECTION') {
      // Restore connection to previous state
      const previousConnection = targetEvent.previousState as {
        id: string;
        sourceNodeId: string;
        targetNodeId: string;
        type: string;
        label: string | null;
        style: unknown;
      };

      const currentConnection = await prisma.connection.findUnique({
        where: { id: targetEvent.entityId },
      });
      currentState = currentConnection;

      if (targetEvent.eventType === 'DELETE_CONNECTION') {
        // Verify source and target nodes exist
        const [sourceExists, targetExists] = await Promise.all([
          prisma.node.findUnique({ where: { id: previousConnection.sourceNodeId } }),
          prisma.node.findUnique({ where: { id: previousConnection.targetNodeId } }),
        ]);

        if (!sourceExists || !targetExists) {
          res.status(400).json({
            error: 'Cannot restore deleted connection',
            details: 'One or both connected nodes no longer exist.',
          });
          return;
        }

        // Re-create deleted connection
        restoredEntity = await prisma.connection.create({
          data: {
            id: previousConnection.id,
            mindMapId: mapId,
            sourceNodeId: previousConnection.sourceNodeId,
            targetNodeId: previousConnection.targetNodeId,
            type: previousConnection.type as 'HIERARCHICAL' | 'CROSS_LINK',
            label: previousConnection.label,
            style: previousConnection.style as object,
          },
        });
        restoreType = 'recreated';
      } else if (currentConnection) {
        // Update connection to previous state
        restoredEntity = await prisma.connection.update({
          where: { id: targetEvent.entityId },
          data: {
            sourceNodeId: previousConnection.sourceNodeId,
            targetNodeId: previousConnection.targetNodeId,
            type: previousConnection.type as 'HIERARCHICAL' | 'CROSS_LINK',
            label: previousConnection.label,
            style: previousConnection.style as object,
          },
        });
        restoreType = 'updated';
      } else {
        res.status(400).json({
          error: 'Cannot restore connection',
          details: 'The connection no longer exists and cannot be recreated from this event.',
        });
        return;
      }
    } else if (targetEvent.entityType === 'MAP') {
      // Restore map settings to previous state
      const previousMap = targetEvent.previousState as {
        title?: string;
        description?: string;
        settings?: unknown;
        isPublic?: boolean;
      };

      const currentMap = await prisma.mindMap.findUnique({
        where: { id: mapId },
      });
      currentState = currentMap;

      if (currentMap) {
        restoredEntity = await prisma.mindMap.update({
          where: { id: mapId },
          data: {
            title: previousMap.title ?? currentMap.title,
            description: previousMap.description ?? currentMap.description,
            settings: (previousMap.settings as object) ?? currentMap.settings,
            isPublic: previousMap.isPublic ?? currentMap.isPublic,
          },
        });
        restoreType = 'updated';
      }
    }

    // Record the restore event
    await recordEvent(
      mapId,
      userId,
      'RESTORE',
      targetEvent.entityType,
      targetEvent.entityId,
      currentState,
      restoredEntity,
      {
        description: `Restored ${targetEvent.entityType.toLowerCase()} from event ${eventId}`,
        metadata: {
          originalEventId: eventId,
          originalEventType: targetEvent.eventType,
          restoreType,
        },
      }
    );

    res.json({
      success: true,
      data: {
        restoredEvent: targetEvent,
        restoredEntity,
        restoreType,
      },
    });
  })
);

// Stats query schema
const statsQuerySchema = z.object({
  startDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  endDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

// ==========================================
// GET /maps/:mapId/history/stats - Get history statistics
// ==========================================
historyRouter.get(
  '/maps/:mapId/history/stats',
  validateParams(mapIdParamSchema),
  validateQuery(statsQuerySchema),
  asyncHandler(async (req, res) => {
    const { mapId } = req.params;
    const { startDate, endDate } = (req as ValidatedRequest).validatedQuery as z.infer<typeof statsQuerySchema>;

    // Check permission (VIEWER or higher)
    const hasPermission = await checkMapPermission(req, mapId, 'VIEWER');
    if (!hasPermission) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Build date filter
    const dateFilter: Prisma.MapEventWhereInput = { mindMapId: mapId };
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        const start = startDate.includes('T') ? new Date(startDate) : new Date(`${startDate}T00:00:00.000Z`);
        dateFilter.createdAt.gte = start;
      }
      if (endDate) {
        const end = endDate.includes('T') ? new Date(endDate) : new Date(`${endDate}T23:59:59.999Z`);
        dateFilter.createdAt.lte = end;
      }
    }

    const [totalEvents, eventsByType, eventsByEntity, recentActivity, firstEvent, lastEvent] = await Promise.all([
      prisma.mapEvent.count({ where: dateFilter }),
      prisma.mapEvent.groupBy({
        by: ['eventType'],
        where: dateFilter,
        _count: { eventType: true },
      }),
      prisma.mapEvent.groupBy({
        by: ['entityType'],
        where: dateFilter,
        _count: { entityType: true },
      }),
      prisma.mapEvent.findMany({
        where: dateFilter,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          eventType: true,
          entityType: true,
          entityId: true,
          description: true,
          createdAt: true,
          userId: true,
        },
      }),
      prisma.mapEvent.findFirst({
        where: { mindMapId: mapId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      prisma.mapEvent.findFirst({
        where: { mindMapId: mapId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    // Get unique contributors
    const contributors = await prisma.mapEvent.findMany({
      where: dateFilter,
      select: { userId: true },
      distinct: ['userId'],
    });

    const contributorIds = contributors.map((c) => c.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: contributorIds } },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    // Calculate activity by day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyActivity = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM "MapEvent"
      WHERE mind_map_id = ${mapId}
        AND created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `.catch(() => []);

    res.json({
      data: {
        totalEvents,
        eventsByType: eventsByType.reduce(
          (acc, item) => {
            acc[item.eventType] = item._count.eventType;
            return acc;
          },
          {} as Record<string, number>
        ),
        eventsByEntity: eventsByEntity.reduce(
          (acc, item) => {
            acc[item.entityType] = item._count.entityType;
            return acc;
          },
          {} as Record<string, number>
        ),
        recentActivity,
        contributors: users,
        dateRange: {
          first: firstEvent?.createdAt || null,
          last: lastEvent?.createdAt || null,
        },
        dailyActivity: dailyActivity.map((d) => ({
          date: d.date,
          count: Number(d.count),
        })),
      },
    });
  })
);

// Entity history query schema
const entityHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

const entityHistoryParamSchema = z.object({
  mapId: z.string().cuid(),
  entityType: z.enum(['node', 'connection', 'map']),
  entityId: z.string(),
});

// ==========================================
// GET /maps/:mapId/history/entity/:entityType/:entityId - Get history for specific entity
// ==========================================
historyRouter.get(
  '/maps/:mapId/history/entity/:entityType/:entityId',
  validateParams(entityHistoryParamSchema),
  validateQuery(entityHistoryQuerySchema),
  asyncHandler(async (req, res) => {
    const { mapId, entityType, entityId } = req.params;
    const { limit, offset } = (req as ValidatedRequest).validatedQuery as z.infer<typeof entityHistoryQuerySchema>;

    // Check permission (VIEWER or higher)
    const hasPermission = await checkMapPermission(req, mapId, 'VIEWER');
    if (!hasPermission) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Convert entity type to uppercase for database query
    const dbEntityType = entityType.toUpperCase() as MapEntityType;

    const where: Prisma.MapEventWhereInput = {
      mindMapId: mapId,
      entityType: dbEntityType,
      entityId,
    };

    const [events, total, entity] = await Promise.all([
      prisma.mapEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
      prisma.mapEvent.count({ where }),
      // Get current entity state
      entityType === 'node'
        ? prisma.node.findUnique({ where: { id: entityId } })
        : entityType === 'connection'
          ? prisma.connection.findUnique({ where: { id: entityId } })
          : prisma.mindMap.findUnique({ where: { id: entityId } }),
    ]);

    res.json({
      data: {
        events,
        currentState: entity,
        entityExists: entity !== null,
      },
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + events.length < total,
      },
    });
  })
);

// ==========================================
// GET /maps/:mapId/history/diff/:eventId - Get diff between event states
// ==========================================
historyRouter.get(
  '/maps/:mapId/history/diff/:eventId',
  validateParams(eventIdParamSchema),
  asyncHandler(async (req, res) => {
    const { mapId, eventId } = req.params;

    // Check permission (VIEWER or higher)
    const hasPermission = await checkMapPermission(req, mapId, 'VIEWER');
    if (!hasPermission) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const event = await prisma.mapEvent.findUnique({
      where: { id: eventId, mindMapId: mapId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Calculate diff between previous and new states
    const previousState = event.previousState as Record<string, unknown> | null;
    const newState = event.newState as Record<string, unknown> | null;

    const diff: {
      field: string;
      previousValue: unknown;
      newValue: unknown;
      changeType: 'added' | 'removed' | 'modified';
    }[] = [];

    if (previousState && newState) {
      // Find modified and removed fields
      for (const [key, prevValue] of Object.entries(previousState)) {
        if (!(key in newState)) {
          diff.push({ field: key, previousValue: prevValue, newValue: undefined, changeType: 'removed' });
        } else if (JSON.stringify(prevValue) !== JSON.stringify(newState[key])) {
          diff.push({ field: key, previousValue: prevValue, newValue: newState[key], changeType: 'modified' });
        }
      }
      // Find added fields
      for (const [key, newValue] of Object.entries(newState)) {
        if (!(key in previousState)) {
          diff.push({ field: key, previousValue: undefined, newValue: newValue, changeType: 'added' });
        }
      }
    } else if (newState && !previousState) {
      // All fields are new (CREATE event)
      for (const [key, value] of Object.entries(newState)) {
        diff.push({ field: key, previousValue: undefined, newValue: value, changeType: 'added' });
      }
    } else if (previousState && !newState) {
      // All fields removed (DELETE event)
      for (const [key, value] of Object.entries(previousState)) {
        diff.push({ field: key, previousValue: value, newValue: undefined, changeType: 'removed' });
      }
    }

    res.json({
      data: {
        event,
        diff,
        previousState,
        newState,
      },
    });
  })
);
