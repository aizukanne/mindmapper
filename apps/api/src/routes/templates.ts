import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const templatesRouter = Router();

// Helper to get user ID from request (with fallback for dev mode)
function getUserId(req: { userId?: string }): string {
  return req.userId || 'dev-user-id';
}

// Get all templates
templatesRouter.get('/templates', async (req, res, next) => {
  try {
    const { category, includePrivate } = req.query;
    const userId = getUserId(req);

    const where: {
      isPublic?: boolean;
      category?: string;
      OR?: Array<{ isPublic: boolean } | { createdBy: string }>;
    } = {};

    if (category) {
      where.category = category as string;
    }

    // Include user's private templates if requested
    if (includePrivate === 'true') {
      where.OR = [
        { isPublic: true },
        { createdBy: userId },
      ];
    } else {
      where.isPublic = true;
    }

    const templates = await prisma.template.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Group by category
    const byCategory = templates.reduce(
      (acc, template) => {
        if (!acc[template.category]) {
          acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
      },
      {} as Record<string, typeof templates>
    );

    res.json({ data: templates, byCategory });
  } catch (error) {
    next(error);
  }
});

// Get a specific template
templatesRouter.get('/templates/:templateId', async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const userId = getUserId(req);

    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check access
    if (!template.isPublic && template.createdBy !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ data: template });
  } catch (error) {
    next(error);
  }
});

// Create a map from template
templatesRouter.post('/maps/from-template/:templateId', async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const userId = getUserId(req);
    const { title, folderId } = req.body;

    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check access
    if (!template.isPublic && template.createdBy !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const templateData = template.data as {
      nodes: Array<{
        id: string;
        text: string;
        type: string;
        parentId: string | null;
        positionX: number;
        positionY: number;
        width: number;
        height: number;
        style: object;
        metadata: object;
        isCollapsed: boolean;
      }>;
      connections: Array<{
        id: string;
        sourceNodeId: string;
        targetNodeId: string;
        type: string;
        label: string | null;
        style: object;
      }>;
      settings: object;
    };

    // Create the map
    const map = await prisma.mindMap.create({
      data: {
        title: title || `${template.name} - Copy`,
        description: template.description,
        userId,
        folderId: folderId || undefined,
        settings: templateData.settings || {},
      },
    });

    // Create nodes with new IDs
    const nodeIdMap = new Map<string, string>();

    for (const node of templateData.nodes || []) {
      const newNode = await prisma.node.create({
        data: {
          mindMapId: map.id,
          text: node.text,
          type: node.type as 'ROOT' | 'CHILD' | 'FLOATING',
          parentId: node.parentId ? nodeIdMap.get(node.parentId) || null : null,
          positionX: node.positionX,
          positionY: node.positionY,
          width: node.width || 150,
          height: node.height || 50,
          style: node.style || {},
          metadata: node.metadata || {},
          isCollapsed: node.isCollapsed || false,
        },
      });
      nodeIdMap.set(node.id, newNode.id);
    }

    // Create connections with updated node IDs
    for (const conn of templateData.connections || []) {
      const sourceId = nodeIdMap.get(conn.sourceNodeId);
      const targetId = nodeIdMap.get(conn.targetNodeId);

      if (sourceId && targetId) {
        await prisma.connection.create({
          data: {
            mindMapId: map.id,
            sourceNodeId: sourceId,
            targetNodeId: targetId,
            type: conn.type as 'HIERARCHICAL' | 'CROSS_LINK',
            label: conn.label,
            style: conn.style || {},
          },
        });
      }
    }

    // Fetch the complete map
    const completeMap = await prisma.mindMap.findUnique({
      where: { id: map.id },
      include: {
        nodes: true,
        connections: true,
      },
    });

    res.status(201).json({ data: completeMap });
  } catch (error) {
    next(error);
  }
});

// Save map as template
templatesRouter.post('/templates', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { name, description, category, mapId, isPublic } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    let templateData = {
      nodes: [] as Prisma.InputJsonValue[],
      connections: [] as Prisma.InputJsonValue[],
      settings: {} as Prisma.InputJsonValue,
    };

    // If mapId provided, extract data from existing map
    if (mapId) {
      const map = await prisma.mindMap.findUnique({
        where: { id: mapId, userId },
        include: {
          nodes: true,
          connections: true,
        },
      });

      if (!map) {
        return res.status(404).json({ error: 'Map not found' });
      }

      templateData = {
        nodes: map.nodes.map((n) => ({
          id: n.id,
          text: n.text,
          type: n.type,
          parentId: n.parentId,
          positionX: n.positionX,
          positionY: n.positionY,
          width: n.width,
          height: n.height,
          style: n.style as Prisma.InputJsonValue,
          metadata: n.metadata as Prisma.InputJsonValue,
          isCollapsed: n.isCollapsed,
        })) as Prisma.InputJsonValue[],
        connections: map.connections.map((c) => ({
          id: c.id,
          sourceNodeId: c.sourceNodeId,
          targetNodeId: c.targetNodeId,
          type: c.type,
          label: c.label,
          style: c.style as Prisma.InputJsonValue,
        })) as Prisma.InputJsonValue[],
        settings: map.settings as Prisma.InputJsonValue,
      };
    }

    const template = await prisma.template.create({
      data: {
        name,
        description: description || null,
        category,
        data: templateData as Prisma.InputJsonValue,
        isPublic: isPublic === true,
        createdBy: userId,
      },
    });

    res.status(201).json({ data: template });
  } catch (error) {
    next(error);
  }
});

// Update a template
templatesRouter.put('/templates/:templateId', async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const userId = getUserId(req);
    const { name, description, category, isPublic } = req.body;

    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Only creator can update
    if (template.createdBy !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.template.update({
      where: { id: templateId },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        category: category || undefined,
        isPublic: isPublic !== undefined ? isPublic : undefined,
      },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

// Delete a template
templatesRouter.delete('/templates/:templateId', async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const userId = getUserId(req);

    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Only creator can delete
    if (template.createdBy !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.template.delete({
      where: { id: templateId },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get template categories
templatesRouter.get('/templates/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.template.findMany({
      where: { isPublic: true },
      select: { category: true },
      distinct: ['category'],
    });

    res.json({ data: categories.map((c) => c.category) });
  } catch (error) {
    next(error);
  }
});
