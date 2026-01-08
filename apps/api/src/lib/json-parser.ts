/**
 * JSON Parser for MindMapper
 *
 * Parses MindMapper JSON format (v1.0 and v1.1) and simple generic JSON formats
 * into the MindMapper internal format suitable for import.
 *
 * Supported formats:
 * 1. MindMapper JSON (v1.0, v1.1): Full native format with all metadata
 * 2. Simple JSON: Basic node array with optional hierarchy
 * 3. Generic JSON: Auto-detected common structures
 */

import { z } from 'zod';
import type { NodeStyle, ConnectionStyle, MindMapSettings } from '@mindmapper/types';

// ==========================================
// Types
// ==========================================

export interface JsonParseWarning {
  type: 'warning';
  message: string;
  context?: string;
  path?: string;
}

export interface JsonParseError {
  type: 'error';
  message: string;
  context?: string;
  path?: string;
  fatal: boolean;
}

export interface ParsedNode {
  id: string;
  text: string;
  type: 'ROOT' | 'CHILD' | 'FLOATING';
  parentId: string | null;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: Partial<NodeStyle>;
  metadata: Record<string, unknown>;
  isCollapsed: boolean;
  sortOrder: number;
}

export interface ParsedConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: 'HIERARCHICAL' | 'CROSS_LINK';
  label: string | null;
  style: Partial<ConnectionStyle>;
}

export interface ParsedComment {
  id: string;
  nodeId: string | null;
  text: string;
  resolved: boolean;
  parentId: string | null;
  createdAt?: string;
  author?: {
    name: string | null;
    email: string;
  };
}

export interface JsonParseResult {
  title: string;
  description: string | null;
  version?: string;
  formatVersion?: '1.0' | '1.1' | 'simple' | 'generic';
  nodes: ParsedNode[];
  connections: ParsedConnection[];
  comments: ParsedComment[];
  settings: Partial<MindMapSettings>;
  isPublic: boolean;
  isFavorite: boolean;
  warnings: JsonParseWarning[];
  errors: JsonParseError[];
  stats: {
    totalNodes: number;
    totalConnections: number;
    totalComments: number;
    maxDepth: number;
    parseTimeMs: number;
  };
}

export type JsonFormat = 'mindmapper-json' | 'simple' | 'array' | 'generic' | 'unknown';

export interface FormatDetectionResult {
  format: JsonFormat;
  confidence: number;
  details: Record<string, unknown>;
  supported: boolean;
}

// ==========================================
// Validation Schemas
// ==========================================

// Node style schema for partial validation
const nodeStyleSchema = z.object({
  backgroundColor: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().optional(),
  borderRadius: z.number().optional(),
  textColor: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.enum(['normal', 'bold']).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  icon: z.string().optional(),
  shape: z.enum(['rectangle', 'rounded', 'ellipse', 'diamond', 'cloud']).optional(),
}).passthrough();

// Connection style schema for partial validation
const connectionStyleSchema = z.object({
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
  animated: z.boolean().optional(),
  markerStart: z.string().optional(),
  markerEnd: z.string().optional(),
  pathType: z.enum(['bezier', 'smoothstep', 'step', 'straight']).optional(),
}).passthrough();

// Imported node schema
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
  style: nodeStyleSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  isCollapsed: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// Imported connection schema
const importedConnectionSchema = z.object({
  id: z.string().optional(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  type: z.enum(['HIERARCHICAL', 'CROSS_LINK']).optional(),
  label: z.string().nullable().optional(),
  style: connectionStyleSchema.optional(),
});

// Imported comment schema
const importedCommentSchema = z.object({
  id: z.string().optional(),
  nodeId: z.string().nullable().optional(),
  text: z.string(),
  resolved: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  author: z.object({
    name: z.string().nullable().optional(),
    email: z.string().optional(),
  }).optional(),
});

// MindMapper JSON format schema (v1.0 and v1.1)
const mindmapperJsonSchema = z.object({
  version: z.string(),
  format: z.literal('mindmapper-json'),
  schema: z.string().optional(),
  exportedAt: z.string().optional(),
  map: z.object({
    id: z.string().optional(),
    title: z.string(),
    description: z.string().nullable().optional(),
    isPublic: z.boolean().optional(),
    isFavorite: z.boolean().optional(),
    settings: z.record(z.unknown()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    author: z.object({
      name: z.string().nullable().optional(),
      email: z.string().optional(),
    }).optional(),
  }),
  nodes: z.array(importedNodeSchema),
  connections: z.array(importedConnectionSchema).optional(),
  comments: z.array(importedCommentSchema).optional(),
  metadata: z.object({
    nodeCount: z.number().optional(),
    connectionCount: z.number().optional(),
    commentCount: z.number().optional(),
    exportedBy: z.string().optional(),
  }).optional(),
});

// Simple JSON format schema
const simpleJsonSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  nodes: z.array(z.object({
    id: z.string().optional(),
    text: z.string(),
    parentId: z.string().nullable().optional(),
    children: z.array(z.lazy(() => z.any())).optional(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }).optional(),
    style: z.record(z.unknown()).optional(),
  })),
  connections: z.array(z.object({
    sourceNodeId: z.string(),
    targetNodeId: z.string(),
    label: z.string().optional(),
  })).optional(),
});

// Generic node schema for auto-detection
const genericNodeSchema = z.object({
  id: z.string().optional(),
  text: z.string().optional(),
  label: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  value: z.string().optional(),
  parentId: z.string().nullable().optional(),
  parent: z.string().nullable().optional(),
  children: z.array(z.any()).optional(),
  nodes: z.array(z.any()).optional(),
}).passthrough();

// ==========================================
// Helper Functions
// ==========================================

let idCounter = 0;

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `json-${Date.now().toString(36)}-${(idCounter++).toString(36)}-${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Reset ID counter for testing
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Extract text from a generic node object
 */
function extractNodeText(node: Record<string, unknown>): string {
  // Try common text field names in order of preference
  const textFields = ['text', 'label', 'name', 'title', 'content', 'value'];

  for (const field of textFields) {
    const value = node[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  // Fallback: stringify the object if nothing found
  return 'Unnamed Node';
}

/**
 * Extract node ID from a generic node object
 */
function extractNodeId(node: Record<string, unknown>): string | undefined {
  if (typeof node.id === 'string') return node.id;
  if (typeof node.id === 'number') return String(node.id);
  if (typeof node._id === 'string') return node._id;
  if (typeof node.key === 'string') return node.key;
  return undefined;
}

/**
 * Extract parent ID from a generic node object
 */
function extractParentId(node: Record<string, unknown>): string | null {
  const parentFields = ['parentId', 'parent', 'parent_id', 'parentID'];

  for (const field of parentFields) {
    const value = node[field];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
  }

  return null;
}

/**
 * Extract children from a generic node object
 */
function extractChildren(node: Record<string, unknown>): unknown[] {
  const childFields = ['children', 'nodes', 'items', 'subnodes', 'kids'];

  for (const field of childFields) {
    const value = node[field];
    if (Array.isArray(value)) return value;
  }

  return [];
}

/**
 * Calculate maximum depth of node tree
 */
function calculateMaxDepth(nodes: ParsedNode[]): number {
  // Build parent-child map
  const childrenMap = new Map<string | null, ParsedNode[]>();

  for (const node of nodes) {
    const parentId = node.parentId;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(node);
  }

  // DFS to find max depth
  function getDepth(nodeId: string | null, currentDepth: number): number {
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return currentDepth;

    let maxChildDepth = currentDepth;
    for (const child of children) {
      const childDepth = getDepth(child.id, currentDepth + 1);
      if (childDepth > maxChildDepth) maxChildDepth = childDepth;
    }
    return maxChildDepth;
  }

  return getDepth(null, 0);
}

/**
 * Layout constants for positioning nodes
 */
const LAYOUT = {
  ROOT_X: 400,
  ROOT_Y: 300,
  HORIZONTAL_SPACING: 250,
  VERTICAL_SPACING: 80,
  MIN_NODE_WIDTH: 150,
  MIN_NODE_HEIGHT: 50,
  MAX_NODE_WIDTH: 300,
};

/**
 * Calculate node size based on text content
 */
function calculateNodeSize(text: string): { width: number; height: number } {
  const textLength = text.length;
  const width = Math.max(LAYOUT.MIN_NODE_WIDTH, Math.min(LAYOUT.MAX_NODE_WIDTH, textLength * 8 + 40));
  const height = Math.max(LAYOUT.MIN_NODE_HEIGHT, Math.ceil(textLength / 30) * 25 + 25);
  return { width, height };
}

/**
 * Default node style
 */
function getDefaultNodeStyle(isRoot: boolean): Partial<NodeStyle> {
  if (isRoot) {
    return {
      backgroundColor: '#3b82f6',
      borderColor: '#2563eb',
      borderWidth: 1,
      borderRadius: 12,
      textColor: '#ffffff',
      fontSize: 18,
      fontWeight: 'bold',
      fontStyle: 'normal',
      shape: 'rounded',
    };
  }

  return {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    textColor: '#1f2937',
    fontSize: 14,
    fontWeight: 'normal',
    fontStyle: 'normal',
    shape: 'rounded',
  };
}

/**
 * Default connection style
 */
function getDefaultConnectionStyle(): Partial<ConnectionStyle> {
  return {
    strokeColor: '#9ca3af',
    strokeWidth: 2,
    strokeStyle: 'solid',
    animated: false,
    pathType: 'bezier',
  };
}

// ==========================================
// Format Detection
// ==========================================

/**
 * Detect the format of JSON data
 */
export function detectJsonFormat(data: unknown): FormatDetectionResult {
  // Check if it's an object
  if (typeof data !== 'object' || data === null) {
    if (typeof data === 'string') {
      // Try parsing as JSON string
      try {
        const parsed = JSON.parse(data);
        return detectJsonFormat(parsed);
      } catch {
        return {
          format: 'unknown',
          confidence: 0,
          details: { error: 'Invalid JSON string' },
          supported: false,
        };
      }
    }

    return {
      format: 'unknown',
      confidence: 0,
      details: { type: typeof data },
      supported: false,
    };
  }

  // Check if it's an array
  if (Array.isArray(data)) {
    // Could be an array of text items or nodes
    const hasTextNodes = data.every(item =>
      typeof item === 'string' ||
      (typeof item === 'object' && item !== null)
    );

    if (data.length > 0 && data.every(item => typeof item === 'string')) {
      return {
        format: 'array',
        confidence: 0.7,
        details: {
          itemCount: data.length,
          type: 'text-array',
        },
        supported: true,
      };
    }

    if (hasTextNodes && data.length > 0) {
      return {
        format: 'generic',
        confidence: 0.6,
        details: {
          itemCount: data.length,
          type: 'node-array',
        },
        supported: true,
      };
    }

    return {
      format: 'array',
      confidence: 0.5,
      details: {
        itemCount: data.length,
      },
      supported: true,
    };
  }

  const obj = data as Record<string, unknown>;

  // Check for MindMapper JSON format
  if (obj.format === 'mindmapper-json') {
    const isV11 = obj.version === '1.1' ||
                  typeof obj.schema === 'string' ||
                  Array.isArray(obj.comments) ||
                  (typeof obj.metadata === 'object' && obj.metadata !== null);

    // Validate the structure
    const validationResult = mindmapperJsonSchema.safeParse(obj);

    return {
      format: 'mindmapper-json',
      confidence: validationResult.success ? 1.0 : 0.8,
      details: {
        version: obj.version,
        formatVersion: isV11 ? '1.1' : '1.0',
        nodeCount: Array.isArray(obj.nodes) ? obj.nodes.length : 0,
        hasConnections: Array.isArray(obj.connections) && obj.connections.length > 0,
        hasComments: Array.isArray(obj.comments) && obj.comments.length > 0,
        hasSettings: typeof (obj.map as Record<string, unknown>)?.settings === 'object',
        hasMetadata: typeof obj.metadata === 'object',
        validationErrors: validationResult.success ? [] : validationResult.error.errors.slice(0, 5),
      },
      supported: true,
    };
  }

  // Check for simple JSON format (has nodes array)
  if (Array.isArray(obj.nodes)) {
    const nodes = obj.nodes;
    const hasHierarchy = nodes.some((n: Record<string, unknown>) =>
      Array.isArray(n.children) && n.children.length > 0
    );

    return {
      format: 'simple',
      confidence: 0.85,
      details: {
        title: obj.title || null,
        nodeCount: nodes.length,
        hasHierarchy,
        hasConnections: Array.isArray(obj.connections) && obj.connections.length > 0,
      },
      supported: true,
    };
  }

  // Check for generic hierarchical structure
  const hasChildren = extractChildren(obj).length > 0;
  const hasText = extractNodeText(obj) !== 'Unnamed Node';

  if (hasChildren || hasText) {
    return {
      format: 'generic',
      confidence: 0.6,
      details: {
        hasChildren,
        hasText,
        rootText: hasText ? extractNodeText(obj) : null,
      },
      supported: true,
    };
  }

  return {
    format: 'unknown',
    confidence: 0.1,
    details: {
      keys: Object.keys(obj).slice(0, 10),
    },
    supported: false,
  };
}

// ==========================================
// MindMapper JSON Parser
// ==========================================

/**
 * Parse MindMapper JSON format (v1.0 and v1.1)
 */
export function parseMindMapperJson(data: unknown): JsonParseResult {
  const startTime = Date.now();
  const warnings: JsonParseWarning[] = [];
  const errors: JsonParseError[] = [];

  resetIdCounter();

  // Validate input
  const validationResult = mindmapperJsonSchema.safeParse(data);

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map(e =>
      `${e.path.join('.')}: ${e.message}`
    );

    errors.push({
      type: 'error',
      message: `Invalid MindMapper JSON format: ${errorMessages.join('; ')}`,
      fatal: true,
    });

    return {
      title: 'Import Error',
      description: null,
      version: undefined,
      formatVersion: undefined,
      nodes: [],
      connections: [],
      comments: [],
      settings: {},
      isPublic: false,
      isFavorite: false,
      warnings,
      errors,
      stats: {
        totalNodes: 0,
        totalConnections: 0,
        totalComments: 0,
        maxDepth: 0,
        parseTimeMs: Date.now() - startTime,
      },
    };
  }

  const parsed = validationResult.data;

  // Determine format version
  const isV11 = parsed.version === '1.1' ||
                !!parsed.schema ||
                !!parsed.comments ||
                !!parsed.metadata;

  // Create ID mapping for remapping
  const nodeIdMap = new Map<string, string>();
  const connectionIdMap = new Map<string, string>();
  const commentIdMap = new Map<string, string>();

  // Generate new IDs for all nodes
  for (const node of parsed.nodes) {
    nodeIdMap.set(node.id, generateId());
  }

  // Generate new IDs for connections
  if (parsed.connections) {
    for (const conn of parsed.connections) {
      if (conn.id) {
        connectionIdMap.set(conn.id, generateId());
      }
    }
  }

  // Generate new IDs for comments
  if (parsed.comments) {
    for (const comment of parsed.comments) {
      if (comment.id) {
        commentIdMap.set(comment.id, generateId());
      }
    }
  }

  // Convert nodes with new IDs
  const nodes: ParsedNode[] = parsed.nodes.map((node, index) => {
    const newId = nodeIdMap.get(node.id)!;
    const newParentId = node.parentId ? (nodeIdMap.get(node.parentId) || null) : null;

    // Warn if parent ID is missing
    if (node.parentId && !nodeIdMap.has(node.parentId)) {
      warnings.push({
        type: 'warning',
        message: `Node "${node.text.substring(0, 30)}..." references unknown parent: ${node.parentId}`,
        path: `nodes[${index}].parentId`,
      });
    }

    return {
      id: newId,
      text: node.text,
      type: node.type,
      parentId: newParentId,
      position: node.position,
      size: node.size || calculateNodeSize(node.text),
      style: (node.style as Partial<NodeStyle>) || getDefaultNodeStyle(node.type === 'ROOT'),
      metadata: node.metadata || {},
      isCollapsed: node.isCollapsed ?? false,
      sortOrder: node.sortOrder ?? index,
    };
  });

  // Convert connections with new IDs
  const connections: ParsedConnection[] = [];
  if (parsed.connections) {
    for (const conn of parsed.connections) {
      const sourceId = nodeIdMap.get(conn.sourceNodeId);
      const targetId = nodeIdMap.get(conn.targetNodeId);

      if (!sourceId) {
        warnings.push({
          type: 'warning',
          message: `Connection references unknown source node: ${conn.sourceNodeId}`,
        });
        continue;
      }

      if (!targetId) {
        warnings.push({
          type: 'warning',
          message: `Connection references unknown target node: ${conn.targetNodeId}`,
        });
        continue;
      }

      connections.push({
        id: conn.id ? (connectionIdMap.get(conn.id) || generateId()) : generateId(),
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        type: conn.type || 'HIERARCHICAL',
        label: conn.label ?? null,
        style: (conn.style as Partial<ConnectionStyle>) || getDefaultConnectionStyle(),
      });
    }
  }

  // Convert comments with new IDs
  const comments: ParsedComment[] = [];
  if (parsed.comments) {
    for (const comment of parsed.comments) {
      const nodeId = comment.nodeId ? (nodeIdMap.get(comment.nodeId) || null) : null;
      const parentId = comment.parentId ? (commentIdMap.get(comment.parentId) || null) : null;

      if (comment.nodeId && !nodeIdMap.has(comment.nodeId)) {
        warnings.push({
          type: 'warning',
          message: `Comment references unknown node: ${comment.nodeId}`,
        });
      }

      comments.push({
        id: comment.id ? (commentIdMap.get(comment.id) || generateId()) : generateId(),
        nodeId,
        text: comment.text,
        resolved: comment.resolved ?? false,
        parentId,
        createdAt: comment.createdAt,
        author: comment.author ? {
          name: comment.author.name ?? null,
          email: comment.author.email || '',
        } : undefined,
      });
    }
  }

  // Extract settings
  const settings = (parsed.map.settings as Partial<MindMapSettings>) || {};

  return {
    title: parsed.map.title,
    description: parsed.map.description || null,
    version: parsed.version,
    formatVersion: isV11 ? '1.1' : '1.0',
    nodes,
    connections,
    comments,
    settings,
    isPublic: parsed.map.isPublic ?? false,
    isFavorite: parsed.map.isFavorite ?? false,
    warnings,
    errors,
    stats: {
      totalNodes: nodes.length,
      totalConnections: connections.length,
      totalComments: comments.length,
      maxDepth: calculateMaxDepth(nodes),
      parseTimeMs: Date.now() - startTime,
    },
  };
}

// ==========================================
// Simple JSON Parser
// ==========================================

/**
 * Flatten hierarchical nodes to flat array with positions
 */
function flattenHierarchicalNodes(
  nodes: Array<{
    id?: string;
    text: string;
    parentId?: string | null;
    children?: unknown[];
    position?: { x: number; y: number };
    style?: Record<string, unknown>;
  }>,
  parentId: string | null = null,
  depth: number = 0,
  yOffsetRef: { value: number } = { value: 0 },
  idMap: Map<string, string> = new Map()
): ParsedNode[] {
  const result: ParsedNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const originalId = node.id || `temp-${depth}-${i}`;
    const id = generateId();
    idMap.set(originalId, id);

    const isRoot = parentId === null && depth === 0 && i === 0;
    const text = node.text || 'Unnamed Node';

    // Calculate position
    let position: { x: number; y: number };
    if (node.position) {
      position = node.position;
    } else {
      position = {
        x: LAYOUT.ROOT_X + (depth * LAYOUT.HORIZONTAL_SPACING),
        y: LAYOUT.ROOT_Y + yOffsetRef.value,
      };
      yOffsetRef.value += LAYOUT.VERTICAL_SPACING;
    }

    result.push({
      id,
      text,
      type: isRoot ? 'ROOT' : 'CHILD',
      parentId: parentId ? (idMap.get(parentId) || parentId) : null,
      position,
      size: calculateNodeSize(text),
      style: {
        ...getDefaultNodeStyle(isRoot),
        ...(node.style as Partial<NodeStyle> || {}),
      },
      metadata: {},
      isCollapsed: false,
      sortOrder: result.length,
    });

    // Process children recursively
    if (node.children && Array.isArray(node.children)) {
      const childNodes = flattenHierarchicalNodes(
        node.children as typeof nodes,
        originalId,
        depth + 1,
        yOffsetRef,
        idMap
      );

      // Update parent IDs for children
      for (const child of childNodes) {
        if (child.parentId === originalId) {
          child.parentId = id;
        }
      }

      result.push(...childNodes);
    }
  }

  return result;
}

/**
 * Parse simple JSON format
 */
export function parseSimpleJson(data: unknown): JsonParseResult {
  const startTime = Date.now();
  const warnings: JsonParseWarning[] = [];
  const errors: JsonParseError[] = [];

  resetIdCounter();

  // Validate basic structure
  const validationResult = simpleJsonSchema.safeParse(data);

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map(e =>
      `${e.path.join('.')}: ${e.message}`
    );

    errors.push({
      type: 'error',
      message: `Invalid simple JSON format: ${errorMessages.join('; ')}`,
      fatal: true,
    });

    return {
      title: 'Import Error',
      description: null,
      formatVersion: 'simple',
      nodes: [],
      connections: [],
      comments: [],
      settings: {},
      isPublic: false,
      isFavorite: false,
      warnings,
      errors,
      stats: {
        totalNodes: 0,
        totalConnections: 0,
        totalComments: 0,
        maxDepth: 0,
        parseTimeMs: Date.now() - startTime,
      },
    };
  }

  const parsed = validationResult.data;

  // Check if nodes have children (hierarchical) or parentId (flat)
  const hasHierarchy = parsed.nodes.some(n =>
    n.children && Array.isArray(n.children) && n.children.length > 0
  );

  let nodes: ParsedNode[];
  const idMap = new Map<string, string>();

  if (hasHierarchy) {
    // Hierarchical format - flatten the tree
    nodes = flattenHierarchicalNodes(parsed.nodes, null, 0, { value: 0 }, idMap);
  } else {
    // Flat format with parentId

    // First pass: generate new IDs
    for (const node of parsed.nodes) {
      if (node.id) {
        idMap.set(node.id, generateId());
      }
    }

    // Second pass: create nodes
    nodes = parsed.nodes.map((node, index) => {
      const originalId = node.id || `temp-${index}`;
      let id = idMap.get(originalId);
      if (!id) {
        id = generateId();
        idMap.set(originalId, id);
      }

      const isRoot = index === 0 && !node.parentId;
      const text = node.text || 'Unnamed Node';

      // Warn if parent ID is missing
      if (node.parentId && !idMap.has(node.parentId)) {
        warnings.push({
          type: 'warning',
          message: `Node "${text.substring(0, 30)}..." references unknown parent: ${node.parentId}`,
          path: `nodes[${index}].parentId`,
        });
      }

      return {
        id,
        text,
        type: isRoot ? 'ROOT' : 'CHILD' as const,
        parentId: node.parentId ? (idMap.get(node.parentId) || null) : null,
        position: node.position || {
          x: LAYOUT.ROOT_X + (index % 5) * LAYOUT.HORIZONTAL_SPACING,
          y: LAYOUT.ROOT_Y + Math.floor(index / 5) * LAYOUT.VERTICAL_SPACING,
        },
        size: calculateNodeSize(text),
        style: {
          ...getDefaultNodeStyle(isRoot),
          ...(node.style as Partial<NodeStyle> || {}),
        },
        metadata: {},
        isCollapsed: false,
        sortOrder: index,
      };
    });
  }

  // Parse connections if present
  const connections: ParsedConnection[] = [];
  if (parsed.connections) {
    for (const conn of parsed.connections) {
      const sourceId = idMap.get(conn.sourceNodeId);
      const targetId = idMap.get(conn.targetNodeId);

      if (!sourceId) {
        warnings.push({
          type: 'warning',
          message: `Connection references unknown source node: ${conn.sourceNodeId}`,
        });
        continue;
      }

      if (!targetId) {
        warnings.push({
          type: 'warning',
          message: `Connection references unknown target node: ${conn.targetNodeId}`,
        });
        continue;
      }

      connections.push({
        id: generateId(),
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        type: 'HIERARCHICAL',
        label: conn.label || null,
        style: getDefaultConnectionStyle(),
      });
    }
  }

  return {
    title: parsed.title || 'Imported Mind Map',
    description: parsed.description || null,
    formatVersion: 'simple',
    nodes,
    connections,
    comments: [],
    settings: {},
    isPublic: false,
    isFavorite: false,
    warnings,
    errors,
    stats: {
      totalNodes: nodes.length,
      totalConnections: connections.length,
      totalComments: 0,
      maxDepth: calculateMaxDepth(nodes),
      parseTimeMs: Date.now() - startTime,
    },
  };
}

// ==========================================
// Generic JSON Parser
// ==========================================

/**
 * Parse a single generic object as a hierarchical tree
 */
function parseGenericObject(
  obj: Record<string, unknown>,
  parentId: string | null,
  depth: number,
  yOffsetRef: { value: number },
  idMap: Map<string, string>
): ParsedNode[] {
  const result: ParsedNode[] = [];

  const originalId = extractNodeId(obj) || `obj-${depth}-${yOffsetRef.value}`;
  const id = generateId();
  idMap.set(originalId, id);

  const text = extractNodeText(obj);
  const isRoot = depth === 0 && parentId === null;

  result.push({
    id,
    text,
    type: isRoot ? 'ROOT' : 'CHILD',
    parentId,
    position: {
      x: LAYOUT.ROOT_X + (depth * LAYOUT.HORIZONTAL_SPACING),
      y: LAYOUT.ROOT_Y + yOffsetRef.value,
    },
    size: calculateNodeSize(text),
    style: getDefaultNodeStyle(isRoot),
    metadata: {},
    isCollapsed: false,
    sortOrder: result.length,
  });

  yOffsetRef.value += LAYOUT.VERTICAL_SPACING;

  // Process children
  const children = extractChildren(obj);
  for (const child of children) {
    if (typeof child === 'object' && child !== null) {
      const childNodes = parseGenericObject(
        child as Record<string, unknown>,
        id,
        depth + 1,
        yOffsetRef,
        idMap
      );
      result.push(...childNodes);
    } else if (typeof child === 'string') {
      // Simple string child
      const childId = generateId();
      result.push({
        id: childId,
        text: child,
        type: 'CHILD',
        parentId: id,
        position: {
          x: LAYOUT.ROOT_X + ((depth + 1) * LAYOUT.HORIZONTAL_SPACING),
          y: LAYOUT.ROOT_Y + yOffsetRef.value,
        },
        size: calculateNodeSize(child),
        style: getDefaultNodeStyle(false),
        metadata: {},
        isCollapsed: false,
        sortOrder: result.length,
      });
      yOffsetRef.value += LAYOUT.VERTICAL_SPACING;
    }
  }

  return result;
}

/**
 * Parse generic JSON format with auto-detection
 */
export function parseGenericJson(data: unknown): JsonParseResult {
  const startTime = Date.now();
  const warnings: JsonParseWarning[] = [];
  const errors: JsonParseError[] = [];

  resetIdCounter();

  let nodes: ParsedNode[] = [];
  const idMap = new Map<string, string>();
  const yOffsetRef = { value: 0 };

  // Handle array of items
  if (Array.isArray(data)) {
    if (data.length === 0) {
      warnings.push({
        type: 'warning',
        message: 'Empty array provided',
      });
    } else if (data.every(item => typeof item === 'string')) {
      // Array of strings - first is root, rest are children
      const rootId = generateId();
      const rootText = data[0] as string;

      nodes.push({
        id: rootId,
        text: rootText,
        type: 'ROOT',
        parentId: null,
        position: { x: LAYOUT.ROOT_X, y: LAYOUT.ROOT_Y },
        size: calculateNodeSize(rootText),
        style: getDefaultNodeStyle(true),
        metadata: {},
        isCollapsed: false,
        sortOrder: 0,
      });

      // Add remaining items as children
      for (let i = 1; i < data.length; i++) {
        const text = data[i] as string;
        nodes.push({
          id: generateId(),
          text,
          type: 'CHILD',
          parentId: rootId,
          position: {
            x: LAYOUT.ROOT_X + LAYOUT.HORIZONTAL_SPACING,
            y: LAYOUT.ROOT_Y + (i - 1) * LAYOUT.VERTICAL_SPACING,
          },
          size: calculateNodeSize(text),
          style: getDefaultNodeStyle(false),
          metadata: {},
          isCollapsed: false,
          sortOrder: i,
        });
      }
    } else {
      // Array of objects - parse each as a node
      for (const item of data) {
        if (typeof item === 'object' && item !== null) {
          const itemNodes = parseGenericObject(
            item as Record<string, unknown>,
            null,
            0,
            yOffsetRef,
            idMap
          );

          // If this is not the first root, mark it as CHILD of first root
          if (nodes.length > 0 && itemNodes.length > 0) {
            itemNodes[0].type = 'CHILD';
            itemNodes[0].parentId = nodes[0].id;
          }

          nodes.push(...itemNodes);
        } else if (typeof item === 'string') {
          const childId = generateId();
          const isFirst = nodes.length === 0;

          nodes.push({
            id: childId,
            text: item,
            type: isFirst ? 'ROOT' : 'CHILD',
            parentId: isFirst ? null : nodes[0]?.id || null,
            position: {
              x: LAYOUT.ROOT_X + (isFirst ? 0 : LAYOUT.HORIZONTAL_SPACING),
              y: LAYOUT.ROOT_Y + yOffsetRef.value,
            },
            size: calculateNodeSize(item),
            style: getDefaultNodeStyle(isFirst),
            metadata: {},
            isCollapsed: false,
            sortOrder: nodes.length,
          });
          yOffsetRef.value += LAYOUT.VERTICAL_SPACING;
        }
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    // Single object - parse as hierarchical tree
    nodes = parseGenericObject(
      data as Record<string, unknown>,
      null,
      0,
      yOffsetRef,
      idMap
    );
  } else {
    errors.push({
      type: 'error',
      message: `Unsupported data type: ${typeof data}`,
      fatal: true,
    });
  }

  // Ensure we have at least one root node
  if (nodes.length > 0 && !nodes.some(n => n.type === 'ROOT')) {
    nodes[0].type = 'ROOT';
    nodes[0].parentId = null;
  }

  return {
    title: nodes.length > 0 ? nodes[0].text : 'Imported Mind Map',
    description: null,
    formatVersion: 'generic',
    nodes,
    connections: [],
    comments: [],
    settings: {},
    isPublic: false,
    isFavorite: false,
    warnings,
    errors,
    stats: {
      totalNodes: nodes.length,
      totalConnections: 0,
      totalComments: 0,
      maxDepth: calculateMaxDepth(nodes),
      parseTimeMs: Date.now() - startTime,
    },
  };
}

// ==========================================
// Main Parser Function
// ==========================================

/**
 * Auto-detect format and parse JSON data
 */
export function parseJson(data: unknown): JsonParseResult {
  const detection = detectJsonFormat(data);

  switch (detection.format) {
    case 'mindmapper-json':
      return parseMindMapperJson(data);
    case 'simple':
      return parseSimpleJson(data);
    case 'array':
    case 'generic':
      return parseGenericJson(data);
    default:
      return {
        title: 'Import Error',
        description: null,
        nodes: [],
        connections: [],
        comments: [],
        settings: {},
        isPublic: false,
        isFavorite: false,
        warnings: [],
        errors: [{
          type: 'error',
          message: `Unsupported format: ${detection.format}`,
          fatal: true,
        }],
        stats: {
          totalNodes: 0,
          totalConnections: 0,
          totalComments: 0,
          maxDepth: 0,
          parseTimeMs: 0,
        },
      };
  }
}

/**
 * Validate JSON parse result
 */
export function validateJsonParseResult(result: JsonParseResult): JsonParseResult {
  const { nodes, connections, warnings } = result;

  // Collect all node IDs
  const nodeIds = new Set(nodes.map(n => n.id));

  // Check for duplicate IDs
  if (nodeIds.size !== nodes.length) {
    warnings.push({
      type: 'warning',
      message: 'Duplicate node IDs detected',
    });
  }

  // Check for orphaned nodes (nodes with parentId that doesn't exist)
  for (const node of nodes) {
    if (node.parentId && !nodeIds.has(node.parentId)) {
      warnings.push({
        type: 'warning',
        message: `Node "${node.text.substring(0, 30)}..." has orphaned parent reference`,
      });
    }
  }

  // Check for invalid connections
  for (const conn of connections) {
    if (!nodeIds.has(conn.sourceNodeId)) {
      warnings.push({
        type: 'warning',
        message: `Connection source node not found: ${conn.sourceNodeId}`,
      });
    }
    if (!nodeIds.has(conn.targetNodeId)) {
      warnings.push({
        type: 'warning',
        message: `Connection target node not found: ${conn.targetNodeId}`,
      });
    }
  }

  // Check for empty root nodes
  const rootNodes = nodes.filter(n => n.type === 'ROOT');
  if (rootNodes.length === 0 && nodes.length > 0) {
    warnings.push({
      type: 'warning',
      message: 'No root node found',
    });
  }

  if (rootNodes.length > 1) {
    warnings.push({
      type: 'warning',
      message: `Multiple root nodes found: ${rootNodes.length}`,
    });
  }

  return result;
}

/**
 * Generate import preview summary
 */
export function generateJsonPreview(result: JsonParseResult): {
  summary: {
    title: string;
    description: string | null;
    version?: string;
    formatVersion?: string;
    totalNodes: number;
    totalConnections: number;
    totalComments: number;
    maxDepth: number;
    warnings: number;
    errors: number;
  };
  sampleNodes: Array<{ text: string; type: string; depth: number; childCount: number }>;
  issues: string[];
} {
  const { nodes, warnings, errors } = result;

  // Build parent-child map for depth calculation
  const childrenMap = new Map<string | null, ParsedNode[]>();
  for (const node of nodes) {
    const parentId = node.parentId;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(node);
  }

  // Calculate depth for each node
  const nodeDepths = new Map<string, number>();
  function calculateDepth(nodeId: string, depth: number): void {
    nodeDepths.set(nodeId, depth);
    const children = childrenMap.get(nodeId) || [];
    for (const child of children) {
      calculateDepth(child.id, depth + 1);
    }
  }

  // Start from root nodes
  for (const node of nodes.filter(n => n.parentId === null)) {
    calculateDepth(node.id, 0);
  }

  // Collect sample nodes
  const sampleNodes: Array<{ text: string; type: string; depth: number; childCount: number }> = [];
  for (const node of nodes.slice(0, 10)) {
    sampleNodes.push({
      text: node.text.substring(0, 50) + (node.text.length > 50 ? '...' : ''),
      type: node.type,
      depth: nodeDepths.get(node.id) || 0,
      childCount: (childrenMap.get(node.id) || []).length,
    });
  }

  return {
    summary: {
      title: result.title,
      description: result.description,
      version: result.version,
      formatVersion: result.formatVersion,
      totalNodes: result.stats.totalNodes,
      totalConnections: result.stats.totalConnections,
      totalComments: result.stats.totalComments,
      maxDepth: result.stats.maxDepth,
      warnings: warnings.length,
      errors: errors.length,
    },
    sampleNodes,
    issues: [
      ...errors.map(e => `Error: ${e.message}`),
      ...warnings.slice(0, 10).map(w => `Warning: ${w.message}`),
    ],
  };
}
