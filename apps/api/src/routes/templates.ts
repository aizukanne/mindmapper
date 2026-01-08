import { Router, type Request } from 'express';
import { z } from 'zod';
import type { Prisma, TemplateCategory } from '@prisma/client';
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
  queryBooleanSchema,
} from '../lib/validation/index.js';

export const templatesRouter = Router();

// ==========================================
// Validation Schemas
// ==========================================

// Template category enum validation
const templateCategorySchema = z.enum([
  'BUSINESS',
  'EDUCATION',
  'PERSONAL',
  'PROJECT_MANAGEMENT',
  'BRAINSTORMING',
  'STRATEGY',
  'MINDMAP',
  'FLOWCHART',
  'ORG_CHART',
  'OTHER',
]);

// Query parameter schemas
const listTemplatesQuerySchema = z.object({
  category: templateCategorySchema.optional(),
  includePrivate: queryBooleanSchema,
  search: z.string().max(255).optional(),
});

// URL parameter schemas
const templateIdParamSchema = z.object({
  templateId: cuidSchema,
});

// Request body schemas
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  category: templateCategorySchema,
  mapId: z.string().cuid('Invalid map ID').optional(),
  isPublic: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less').optional(),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional().nullable(),
  category: templateCategorySchema.optional(),
  isPublic: z.boolean().optional(),
});

const createMapFromTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less').optional(),
  folderId: z.string().cuid('Invalid folder ID').optional().nullable(),
});

// ==========================================
// Type Definitions
// ==========================================

type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;
type TemplateIdParams = z.infer<typeof templateIdParamSchema>;
type CreateTemplateBody = z.infer<typeof createTemplateSchema>;
type UpdateTemplateBody = z.infer<typeof updateTemplateSchema>;
type CreateMapFromTemplateBody = z.infer<typeof createMapFromTemplateSchema>;

// ==========================================
// Helper Functions
// ==========================================

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// Template data structure stored in JSON
interface TemplateData {
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
}

// ==========================================
// Route Handlers
// ==========================================

// GET /api/templates/categories - Get available template categories
// NOTE: This route must come before /:templateId to avoid conflicts
templatesRouter.get(
  '/templates/categories',
  asyncHandler(async (_req, res) => {
    // Return all available categories from the enum
    const allCategories: TemplateCategory[] = [
      'BUSINESS',
      'EDUCATION',
      'PERSONAL',
      'PROJECT_MANAGEMENT',
      'BRAINSTORMING',
      'STRATEGY',
      'MINDMAP',
      'FLOWCHART',
      'ORG_CHART',
      'OTHER',
    ];

    // Also get categories that have at least one public template
    const usedCategories = await prisma.template.findMany({
      where: { isPublic: true },
      select: { category: true },
      distinct: ['category'],
    });

    res.json({
      success: true,
      data: {
        all: allCategories,
        used: usedCategories.map((c) => c.category),
      },
    });
  })
);

// GET /api/templates - List all templates with filtering
templatesRouter.get(
  '/templates',
  validateQuery(listTemplatesQuerySchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { category, includePrivate, search } = (req as ValidatedRequest).validatedQuery as ListTemplatesQuery;

    // Build where clause
    const where: Prisma.TemplateWhereInput = {};

    // Category filter
    if (category) {
      where.category = category as TemplateCategory;
    }

    // Privacy filter - include user's private templates if requested
    if (includePrivate === true) {
      where.OR = [
        { isPublic: true },
        { createdById: userId },
      ];
    } else {
      where.isPublic = true;
    }

    // Search filter - search by name and description
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchCondition: Prisma.TemplateWhereInput = {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      };

      // Combine with existing conditions
      if (where.OR) {
        // If we already have OR conditions (for privacy), wrap in AND
        const existingConditions = { OR: where.OR };
        delete where.OR;
        where.AND = [existingConditions, searchCondition];
      } else {
        Object.assign(where, searchCondition);
      }
    }

    const templates = await prisma.template.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        thumbnail: true,
        category: true,
        isPublic: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Group templates by category
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

    res.json({
      success: true,
      data: templates,
      byCategory,
    });
  })
);

// GET /api/templates/:templateId - Get a specific template
templatesRouter.get(
  '/templates/:templateId',
  validateParams(templateIdParamSchema),
  asyncHandler(async (req, res) => {
    const { templateId } = (req as ValidatedRequest).validatedParams as TemplateIdParams;
    const userId = getUserId(req);

    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new AppError(404, 'Template not found');
    }

    // Check access - template must be public or owned by user
    if (!template.isPublic && template.createdById !== userId) {
      throw new AppError(403, 'Access denied');
    }

    res.json({
      success: true,
      data: template,
    });
  })
);

// POST /api/templates - Create a new template (optionally from existing map)
templatesRouter.post(
  '/templates',
  validateBody(createTemplateSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { name, description, category, mapId, isPublic } = (req as ValidatedRequest).validatedBody as CreateTemplateBody;

    let templateData: TemplateData = {
      nodes: [],
      connections: [],
      settings: {},
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
        throw new AppError(404, 'Map not found or access denied');
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
          style: n.style as object,
          metadata: n.metadata as object,
          isCollapsed: n.isCollapsed,
        })),
        connections: map.connections.map((c) => ({
          id: c.id,
          sourceNodeId: c.sourceNodeId,
          targetNodeId: c.targetNodeId,
          type: c.type,
          label: c.label,
          style: c.style as object,
        })),
        settings: map.settings as object,
      };
    }

    // Ensure user exists (create if not for development)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        clerkId: 'temp-clerk-id',
        email: 'temp@example.com',
        name: 'Temp User',
      },
    });

    const template = await prisma.template.create({
      data: {
        name,
        description: description || null,
        category: category as TemplateCategory,
        data: templateData as unknown as Prisma.InputJsonValue,
        isPublic: isPublic === true,
        createdById: userId,
      },
    });

    res.status(201).json({
      success: true,
      data: template,
    });
  })
);

// PUT /api/templates/:templateId - Update a template's metadata
templatesRouter.put(
  '/templates/:templateId',
  validate({
    params: templateIdParamSchema,
    body: updateTemplateSchema,
  }),
  asyncHandler(async (req, res) => {
    const { templateId } = (req as ValidatedRequest).validatedParams as TemplateIdParams;
    const userId = getUserId(req);
    const { name, description, category, isPublic } = (req as ValidatedRequest).validatedBody as UpdateTemplateBody;

    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new AppError(404, 'Template not found');
    }

    // Only creator can update
    if (template.createdById !== userId) {
      throw new AppError(403, 'Only the template creator can update it');
    }

    const updated = await prisma.template.update({
      where: { id: templateId },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        category: category !== undefined ? (category as TemplateCategory) : undefined,
        isPublic: isPublic !== undefined ? isPublic : undefined,
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

// DELETE /api/templates/:templateId - Delete a template
templatesRouter.delete(
  '/templates/:templateId',
  validateParams(templateIdParamSchema),
  asyncHandler(async (req, res) => {
    const { templateId } = (req as ValidatedRequest).validatedParams as TemplateIdParams;
    const userId = getUserId(req);

    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new AppError(404, 'Template not found');
    }

    // Only creator can delete
    if (template.createdById !== userId) {
      throw new AppError(403, 'Only the template creator can delete it');
    }

    await prisma.template.delete({
      where: { id: templateId },
    });

    res.json({
      success: true,
      message: 'Template deleted',
    });
  })
);

// POST /api/templates/from-template/:templateId - Create a new map from a template
templatesRouter.post(
  '/templates/from-template/:templateId',
  validate({
    params: templateIdParamSchema,
    body: createMapFromTemplateSchema,
  }),
  asyncHandler(async (req, res) => {
    const { templateId } = (req as ValidatedRequest).validatedParams as TemplateIdParams;
    const userId = getUserId(req);
    const { title, folderId } = (req as ValidatedRequest).validatedBody as CreateMapFromTemplateBody;

    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new AppError(404, 'Template not found');
    }

    // Check access - template must be public or owned by user
    if (!template.isPublic && template.createdById !== userId) {
      throw new AppError(403, 'Access denied');
    }

    const templateData = template.data as unknown as TemplateData;

    // Ensure user exists (create if not for development)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        clerkId: 'temp-clerk-id',
        email: 'temp@example.com',
        name: 'Temp User',
      },
    });

    // Create the map
    const map = await prisma.mindMap.create({
      data: {
        title: title || `${template.name} - Copy`,
        description: template.description,
        userId,
        folderId: folderId || undefined,
        settings: templateData.settings as Prisma.InputJsonValue || {},
      },
    });

    // Create nodes with new IDs, maintaining structure
    const nodeIdMap = new Map<string, string>();

    // Sort nodes to process parents before children
    const sortedNodes = [...(templateData.nodes || [])].sort((a, b) => {
      if (a.parentId === null) return -1;
      if (b.parentId === null) return 1;
      return 0;
    });

    for (const node of sortedNodes) {
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
          style: node.style as Prisma.InputJsonValue || {},
          metadata: node.metadata as Prisma.InputJsonValue || {},
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
            style: conn.style as Prisma.InputJsonValue || {},
          },
        });
      }
    }

    // Fetch the complete map with nodes and connections
    const completeMap = await prisma.mindMap.findUnique({
      where: { id: map.id },
      include: {
        nodes: true,
        connections: true,
      },
    });

    res.status(201).json({
      success: true,
      data: completeMap,
    });
  })
);
