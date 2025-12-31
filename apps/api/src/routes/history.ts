import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { checkMapPermission } from '../middleware/auth.js';

export const historyRouter = Router();

// Helper to get user ID from request (with fallback for dev mode)
function getUserId(req: { userId?: string }): string {
  return req.userId || 'dev-user-id';
}

// Get history events for a map
historyRouter.get('/maps/:mapId/history', async (req, res, next) => {
  try {
    const { mapId } = req.params;
    const { limit = '50', offset = '0', eventType, entityType } = req.query;

    // Check permission (VIEWER or higher)
    const hasPermission = await checkMapPermission(req, mapId, 'VIEWER');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const where: {
      mindMapId: string;
      eventType?: string;
      entityType?: string;
    } = { mindMapId: mapId };

    if (eventType) {
      where.eventType = eventType as string;
    }

    if (entityType) {
      where.entityType = entityType as string;
    }

    const [events, total] = await Promise.all([
      prisma.mapEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.mapEvent.count({ where }),
    ]);

    // Get user info for events
    const userIds = [...new Set(events.map((e) => e.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    const usersMap = new Map(users.map((u) => [u.id, u]));

    const eventsWithUsers = events.map((event) => ({
      ...event,
      user: usersMap.get(event.userId) || { id: event.userId, name: 'Unknown', email: '', avatarUrl: null },
    }));

    res.json({
      data: eventsWithUsers,
      pagination: {
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Record a new event (internal use - called from other routes)
export async function recordEvent(
  mindMapId: string,
  userId: string,
  eventType: string,
  entityType: string,
  entityId: string,
  previousState?: unknown,
  newState?: unknown
) {
  return prisma.mapEvent.create({
    data: {
      mindMapId,
      userId,
      eventType,
      entityType,
      entityId,
      previousState: previousState ? JSON.parse(JSON.stringify(previousState)) : null,
      newState: newState ? JSON.parse(JSON.stringify(newState)) : null,
    },
  });
}

// Get a specific event
historyRouter.get('/maps/:mapId/history/:eventId', async (req, res, next) => {
  try {
    const { mapId, eventId } = req.params;

    // Check permission (VIEWER or higher)
    const hasPermission = await checkMapPermission(req, mapId, 'VIEWER');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const event = await prisma.mapEvent.findUnique({
      where: { id: eventId, mindMapId: mapId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: event.userId },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    res.json({
      data: {
        ...event,
        user: user || { id: event.userId, name: 'Unknown', email: '', avatarUrl: null },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Restore to a previous state (revert changes after a specific event)
historyRouter.post('/maps/:mapId/restore/:eventId', async (req, res, next) => {
  try {
    const { mapId, eventId } = req.params;
    const userId = getUserId(req);

    // Check permission (OWNER only)
    const hasPermission = await checkMapPermission(req, mapId, 'OWNER');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied - owner only' });
    }

    // Get the event to restore to
    const targetEvent = await prisma.mapEvent.findUnique({
      where: { id: eventId, mindMapId: mapId },
    });

    if (!targetEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get current state for the entity
    let currentState: unknown = null;
    let restoredEntity: unknown = null;

    if (targetEvent.entityType === 'NODE' && targetEvent.previousState) {
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

      if (targetEvent.eventType === 'DELETE') {
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
      }
    } else if (targetEvent.entityType === 'CONNECTION' && targetEvent.previousState) {
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

      if (targetEvent.eventType === 'DELETE') {
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
      restoredEntity
    );

    res.json({
      success: true,
      data: {
        restoredEvent: targetEvent,
        restoredEntity,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get summary statistics for history
historyRouter.get('/maps/:mapId/history/stats', async (req, res, next) => {
  try {
    const { mapId } = req.params;

    // Check permission (VIEWER or higher)
    const hasPermission = await checkMapPermission(req, mapId, 'VIEWER');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [totalEvents, eventsByType, recentActivity] = await Promise.all([
      prisma.mapEvent.count({ where: { mindMapId: mapId } }),
      prisma.mapEvent.groupBy({
        by: ['eventType'],
        where: { mindMapId: mapId },
        _count: { eventType: true },
      }),
      prisma.mapEvent.findMany({
        where: { mindMapId: mapId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          eventType: true,
          entityType: true,
          createdAt: true,
          userId: true,
        },
      }),
    ]);

    // Get unique contributors
    const contributors = await prisma.mapEvent.findMany({
      where: { mindMapId: mapId },
      select: { userId: true },
      distinct: ['userId'],
    });

    const contributorIds = contributors.map((c) => c.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: contributorIds } },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

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
        recentActivity,
        contributors: users,
      },
    });
  } catch (error) {
    next(error);
  }
});
