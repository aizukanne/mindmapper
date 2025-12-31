import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const importRouter = Router();

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// Validation schema for imported node
const importedNodeSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(['ROOT', 'CHILD', 'FLOATING']),
  parentId: z.string().nullable(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }).optional(),
  style: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  isCollapsed: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// Validation schema for imported connection
const importedConnectionSchema = z.object({
  id: z.string().optional(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  type: z.enum(['HIERARCHICAL', 'CROSS_LINK']).optional(),
  label: z.string().nullable().optional(),
  style: z.record(z.unknown()).optional(),
});

// Validation schema for MindMapper JSON format
const mindmapperJsonSchema = z.object({
  version: z.string(),
  format: z.literal('mindmapper-json'),
  map: z.object({
    title: z.string(),
    description: z.string().nullable().optional(),
  }),
  nodes: z.array(importedNodeSchema),
  connections: z.array(importedConnectionSchema).optional(),
});

// Validation schema for simple JSON format (just nodes array)
const simpleJsonSchema = z.object({
  title: z.string().optional(),
  nodes: z.array(z.object({
    id: z.string().optional(),
    text: z.string(),
    parentId: z.string().nullable().optional(),
    children: z.array(z.any()).optional(),
  })),
});

// Interface for FreeMind XML node
interface FreeMindNode {
  TEXT?: string;
  POSITION?: string;
  node?: FreeMindNode | FreeMindNode[];
}

// Generate a unique ID
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

// Parse FreeMind XML format
function parseFreeMindXml(xmlContent: string): { title: string; nodes: Array<{ id: string; text: string; parentId: string | null; position: { x: number; y: number }; type: string }> } {
  // Simple XML parsing for FreeMind format
  // FreeMind uses <map> as root with nested <node> elements

  const nodes: Array<{ id: string; text: string; parentId: string | null; position: { x: number; y: number }; type: string }> = [];
  let title = 'Imported Mind Map';

  // Extract root node text
  const rootMatch = xmlContent.match(/<node[^>]*TEXT="([^"]*)"[^>]*>/);
  if (rootMatch) {
    title = rootMatch[1];
  }

  // Helper to parse nodes recursively
  function parseNode(content: string, parentId: string | null, depth: number, yOffset: number): number {
    const nodeRegex = /<node([^>]*)>/g;
    const nodeEndRegex = /<\/node>/g;

    let match;
    let currentY = yOffset;
    let nodeStack: Array<{ id: string; depth: number }> = [];

    // Simple approach: find all node tags and their TEXT attributes
    const allNodes = content.matchAll(/<node[^>]*TEXT="([^"]*)"[^>]*(?:\/>|>)/g);

    let currentDepth = 0;
    let currentParent = parentId;
    const parentStack: string[] = parentId ? [parentId] : [];

    for (const nodeMatch of allNodes) {
      const text = nodeMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      const fullMatch = nodeMatch[0];

      const id = generateId();
      const isRoot = nodes.length === 0;

      nodes.push({
        id,
        text,
        parentId: isRoot ? null : (parentStack[parentStack.length - 1] || null),
        position: {
          x: isRoot ? 400 : 400 + (nodes.length % 5) * 200,
          y: isRoot ? 300 : 100 + Math.floor(nodes.length / 5) * 100,
        },
        type: isRoot ? 'ROOT' : 'CHILD',
      });

      // If not self-closing, push to parent stack
      if (!fullMatch.endsWith('/>')) {
        parentStack.push(id);
      }
    }

    return currentY;
  }

  parseNode(xmlContent, null, 0, 0);

  return { title, nodes };
}

// Flatten hierarchical nodes to flat array
function flattenHierarchy(
  nodes: Array<{ id?: string; text: string; parentId?: string | null; children?: any[] }>,
  parentId: string | null = null,
  depth: number = 0,
  result: Array<{ id: string; text: string; parentId: string | null; position: { x: number; y: number }; type: string; sortOrder: number }> = [],
  siblingIndex: number = 0
): Array<{ id: string; text: string; parentId: string | null; position: { x: number; y: number }; type: string; sortOrder: number }> {
  nodes.forEach((node, index) => {
    const id = node.id || generateId();
    const isRoot = parentId === null && index === 0 && depth === 0;

    result.push({
      id,
      text: node.text,
      parentId,
      position: {
        x: 400 + depth * 200,
        y: 100 + (result.length - 1) * 80,
      },
      type: isRoot ? 'ROOT' : 'CHILD',
      sortOrder: siblingIndex + index,
    });

    if (node.children && Array.isArray(node.children)) {
      flattenHierarchy(node.children, id, depth + 1, result, 0);
    }
  });

  return result;
}

// POST /api/maps/import - Import a mind map
importRouter.post('/import', async (req: Request, res: Response, next) => {
  try {
    const userId = getUserId(req);
    const { data, format, folderId } = req.body;

    if (!data) {
      throw new AppError(400, 'No import data provided');
    }

    let title = 'Imported Mind Map';
    let description: string | null = null;
    let nodes: Array<{
      id: string;
      text: string;
      parentId: string | null;
      position: { x: number; y: number };
      type: string;
      sortOrder?: number;
      style?: unknown;
      metadata?: unknown;
      isCollapsed?: boolean;
      width?: number;
      height?: number;
    }> = [];
    let connections: Array<{
      sourceNodeId: string;
      targetNodeId: string;
      type?: string;
      label?: string | null;
      style?: unknown;
    }> = [];

    // Detect and parse format
    if (format === 'mindmapper-json' || (typeof data === 'object' && data.format === 'mindmapper-json')) {
      // MindMapper native format
      const parsed = mindmapperJsonSchema.parse(data);
      title = parsed.map.title;
      description = parsed.map.description || null;

      // Create ID mapping for new IDs
      const idMap = new Map<string, string>();
      parsed.nodes.forEach(node => {
        idMap.set(node.id, generateId());
      });

      nodes = parsed.nodes.map((node, index) => ({
        id: idMap.get(node.id)!,
        text: node.text,
        parentId: node.parentId ? (idMap.get(node.parentId) || null) : null,
        position: node.position,
        type: node.type,
        sortOrder: node.sortOrder ?? index,
        style: node.style,
        metadata: node.metadata,
        isCollapsed: node.isCollapsed ?? false,
        width: node.size?.width ?? 150,
        height: node.size?.height ?? 50,
      }));

      if (parsed.connections) {
        connections = parsed.connections.map(conn => ({
          sourceNodeId: idMap.get(conn.sourceNodeId)!,
          targetNodeId: idMap.get(conn.targetNodeId)!,
          type: conn.type || 'HIERARCHICAL',
          label: conn.label,
          style: conn.style,
        })).filter(c => c.sourceNodeId && c.targetNodeId);
      }
    } else if (format === 'freemind' || (typeof data === 'string' && data.includes('<map'))) {
      // FreeMind XML format
      const parsed = parseFreeMindXml(typeof data === 'string' ? data : JSON.stringify(data));
      title = parsed.title;
      nodes = parsed.nodes.map((node, index) => ({
        ...node,
        sortOrder: index,
        width: 150,
        height: 50,
      }));
    } else if (format === 'simple' || (typeof data === 'object' && Array.isArray(data.nodes))) {
      // Simple JSON format with optional hierarchy
      const parsed = simpleJsonSchema.parse(data);
      title = parsed.title || 'Imported Mind Map';

      // Check if nodes have children (hierarchical) or parentId (flat)
      const hasHierarchy = parsed.nodes.some(n => n.children && n.children.length > 0);

      if (hasHierarchy) {
        nodes = flattenHierarchy(parsed.nodes).map(node => ({
          ...node,
          width: 150,
          height: 50,
        }));
      } else {
        // Flat format with parentId
        const idMap = new Map<string, string>();
        parsed.nodes.forEach(node => {
          if (node.id) {
            idMap.set(node.id, generateId());
          }
        });

        nodes = parsed.nodes.map((node, index) => {
          const id = node.id ? idMap.get(node.id)! : generateId();
          if (!node.id) idMap.set(String(index), id);

          return {
            id,
            text: node.text,
            parentId: node.parentId ? (idMap.get(node.parentId) || null) : null,
            position: {
              x: 400 + (index % 5) * 200,
              y: 100 + Math.floor(index / 5) * 100,
            },
            type: index === 0 && !node.parentId ? 'ROOT' : 'CHILD',
            sortOrder: index,
            width: 150,
            height: 50,
          };
        });
      }
    } else if (Array.isArray(data)) {
      // Plain array of text items - create simple hierarchy
      title = data[0] || 'Imported Mind Map';
      const rootId = generateId();

      nodes = [{
        id: rootId,
        text: title,
        parentId: null,
        position: { x: 400, y: 300 },
        type: 'ROOT',
        sortOrder: 0,
        width: 150,
        height: 50,
      }];

      data.slice(1).forEach((text, index) => {
        if (typeof text === 'string') {
          nodes.push({
            id: generateId(),
            text,
            parentId: rootId,
            position: { x: 600, y: 100 + index * 80 },
            type: 'CHILD',
            sortOrder: index + 1,
            width: 150,
            height: 50,
          });
        }
      });
    } else {
      throw new AppError(400, 'Unsupported import format');
    }

    // Ensure user exists
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
        title,
        description,
        userId,
        folderId: folderId || null,
      },
    });

    // Create nodes
    for (const node of nodes) {
      await prisma.node.create({
        data: {
          id: node.id,
          mindMapId: map.id,
          parentId: node.parentId,
          type: node.type as 'ROOT' | 'CHILD' | 'FLOATING',
          text: node.text,
          positionX: node.position.x,
          positionY: node.position.y,
          width: node.width || 150,
          height: node.height || 50,
          style: node.style || {
            backgroundColor: node.type === 'ROOT' ? '#3b82f6' : '#ffffff',
            borderColor: node.type === 'ROOT' ? '#2563eb' : '#d1d5db',
            borderWidth: 1,
            borderRadius: node.type === 'ROOT' ? 12 : 8,
            textColor: node.type === 'ROOT' ? '#ffffff' : '#1f2937',
            fontSize: node.type === 'ROOT' ? 18 : 14,
            fontWeight: node.type === 'ROOT' ? 'bold' : 'normal',
            fontStyle: 'normal',
            shape: 'rounded',
          },
          metadata: node.metadata || {},
          sortOrder: node.sortOrder || 0,
          isCollapsed: node.isCollapsed || false,
        },
      });
    }

    // Create connections
    for (const conn of connections) {
      await prisma.connection.create({
        data: {
          mindMapId: map.id,
          sourceNodeId: conn.sourceNodeId,
          targetNodeId: conn.targetNodeId,
          type: (conn.type as 'HIERARCHICAL' | 'CROSS_LINK') || 'HIERARCHICAL',
          label: conn.label || null,
          style: conn.style || {},
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: map.id,
        title: map.title,
        nodeCount: nodes.length,
        connectionCount: connections.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, `Invalid import data: ${error.errors.map(e => e.message).join(', ')}`));
    } else {
      next(error);
    }
  }
});

// POST /api/maps/import/detect - Detect import format
importRouter.post('/import/detect', async (req: Request, res: Response, next) => {
  try {
    const { data } = req.body;

    if (!data) {
      throw new AppError(400, 'No data provided');
    }

    let format = 'unknown';
    let confidence = 0;
    let details: Record<string, unknown> = {};

    if (typeof data === 'object') {
      if (data.format === 'mindmapper-json') {
        format = 'mindmapper-json';
        confidence = 1.0;
        details = {
          version: data.version,
          nodeCount: data.nodes?.length || 0,
          hasConnections: !!data.connections?.length,
        };
      } else if (Array.isArray(data.nodes)) {
        format = 'simple';
        confidence = 0.8;
        details = {
          nodeCount: data.nodes.length,
          hasHierarchy: data.nodes.some((n: any) => n.children?.length > 0),
        };
      } else if (Array.isArray(data)) {
        format = 'array';
        confidence = 0.6;
        details = {
          itemCount: data.length,
        };
      }
    } else if (typeof data === 'string') {
      if (data.includes('<map') && data.includes('<node')) {
        format = 'freemind';
        confidence = 0.9;
        const nodeCount = (data.match(/<node/g) || []).length;
        details = { nodeCount };
      } else if (data.includes('<?xml')) {
        format = 'xml-unknown';
        confidence = 0.5;
      }
    }

    res.json({
      success: true,
      data: {
        format,
        confidence,
        details,
        supported: ['mindmapper-json', 'simple', 'freemind', 'array'].includes(format),
      },
    });
  } catch (error) {
    next(error);
  }
});
