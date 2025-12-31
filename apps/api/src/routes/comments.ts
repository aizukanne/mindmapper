import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { checkMapPermission } from '../middleware/auth.js';

export const commentsRouter = Router();

// Helper to get user ID from request (with fallback for dev mode)
function getUserId(req: { userId?: string }): string {
  return req.userId || 'dev-user-id';
}

// Get all comments for a map
commentsRouter.get('/maps/:mapId/comments', async (req, res, next) => {
  try {
    const { mapId } = req.params;
    const { nodeId, resolved } = req.query;

    // Check permission (VIEWER or higher)
    const hasPermission = await checkMapPermission(req, mapId, 'VIEWER');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const where: {
      mindMapId: string;
      nodeId?: string | null;
      resolved?: boolean;
      parentId?: null;
    } = {
      mindMapId: mapId,
      parentId: null, // Only fetch top-level comments
    };

    if (nodeId) {
      where.nodeId = nodeId as string;
    }

    if (resolved !== undefined) {
      where.resolved = resolved === 'true';
    }

    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            email: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        node: {
          select: {
            id: true,
            text: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: comments });
  } catch (error) {
    next(error);
  }
});

// Create a new comment
commentsRouter.post('/maps/:mapId/comments', async (req, res, next) => {
  try {
    const { mapId } = req.params;
    const userId = getUserId(req);
    const { text, nodeId, parentId } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    // Check permission (COMMENTER or higher)
    const hasPermission = await checkMapPermission(req, mapId, 'COMMENTER');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied - commenting not allowed' });
    }

    // Verify parent comment exists if provided
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId, mindMapId: mapId },
      });
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    // Verify node exists if provided
    if (nodeId) {
      const node = await prisma.node.findUnique({
        where: { id: nodeId, mindMapId: mapId },
      });
      if (!node) {
        return res.status(404).json({ error: 'Node not found' });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        mindMapId: mapId,
        userId,
        text: text.trim(),
        nodeId: nodeId || undefined,
        parentId: parentId || undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            email: true,
          },
        },
        node: {
          select: {
            id: true,
            text: true,
          },
        },
      },
    });

    res.status(201).json({ data: comment });
  } catch (error) {
    next(error);
  }
});

// Update a comment
commentsRouter.put('/comments/:commentId', async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = getUserId(req);
    const { text, resolved } = req.body;

    // Find the comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { mindMap: { select: { userId: true } } },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user is the comment author or map owner
    const isAuthor = comment.userId === userId;
    const isMapOwner = comment.mindMap.userId === userId;

    if (!isAuthor && !isMapOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData: { text?: string; resolved?: boolean } = {};

    // Only author can edit text
    if (text !== undefined && isAuthor) {
      if (typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'Comment text cannot be empty' });
      }
      updateData.text = text.trim();
    }

    // Author or owner can mark as resolved
    if (resolved !== undefined) {
      updateData.resolved = Boolean(resolved);
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            email: true,
          },
        },
        node: {
          select: {
            id: true,
            text: true,
          },
        },
      },
    });

    res.json({ data: updatedComment });
  } catch (error) {
    next(error);
  }
});

// Delete a comment
commentsRouter.delete('/comments/:commentId', async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = getUserId(req);

    // Find the comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { mindMap: { select: { userId: true } } },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user is the comment author or map owner
    const isAuthor = comment.userId === userId;
    const isMapOwner = comment.mindMap.userId === userId;

    if (!isAuthor && !isMapOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete comment (cascades to replies)
    await prisma.comment.delete({
      where: { id: commentId },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get comment count for a map
commentsRouter.get('/maps/:mapId/comments/count', async (req, res, next) => {
  try {
    const { mapId } = req.params;

    // Check permission (VIEWER or higher)
    const hasPermission = await checkMapPermission(req, mapId, 'VIEWER');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [total, unresolved] = await Promise.all([
      prisma.comment.count({ where: { mindMapId: mapId } }),
      prisma.comment.count({ where: { mindMapId: mapId, resolved: false } }),
    ]);

    res.json({ data: { total, unresolved } });
  } catch (error) {
    next(error);
  }
});

// Get comment counts per node for a map (for node indicators)
commentsRouter.get('/maps/:mapId/comments/nodes', async (req, res, next) => {
  try {
    const { mapId } = req.params;

    // Check permission (VIEWER or higher)
    const hasPermission = await checkMapPermission(req, mapId, 'VIEWER');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get comment counts grouped by nodeId
    const nodeCounts = await prisma.comment.groupBy({
      by: ['nodeId'],
      where: {
        mindMapId: mapId,
        nodeId: { not: null },
      },
      _count: { id: true },
    });

    // Get unresolved counts per node
    const unresolvedCounts = await prisma.comment.groupBy({
      by: ['nodeId'],
      where: {
        mindMapId: mapId,
        nodeId: { not: null },
        resolved: false,
      },
      _count: { id: true },
    });

    // Build response map
    const unresolvedMap = new Map(
      unresolvedCounts.map((c) => [c.nodeId, c._count.id])
    );

    const data = nodeCounts
      .filter((c) => c.nodeId !== null)
      .map((c) => ({
        nodeId: c.nodeId as string,
        total: c._count.id,
        unresolved: unresolvedMap.get(c.nodeId) || 0,
      }));

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

// Get comments for a specific node
commentsRouter.get('/maps/:mapId/nodes/:nodeId/comments', async (req, res, next) => {
  try {
    const { mapId, nodeId } = req.params;

    // Check permission (VIEWER or higher)
    const hasPermission = await checkMapPermission(req, mapId, 'VIEWER');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const comments = await prisma.comment.findMany({
      where: {
        mindMapId: mapId,
        nodeId,
        parentId: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            email: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: comments });
  } catch (error) {
    next(error);
  }
});
