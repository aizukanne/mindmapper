import { Router, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  parseAndConvertFreeMind,
  parseFreeMindXml,
  generateFreeMindPreview,
} from '../lib/freemind-parser.js';
import {
  parseJson,
  parseMindMapperJson,
  parseSimpleJson,
  parseGenericJson,
  detectJsonFormat,
  validateJsonParseResult,
  generateJsonPreview,
  type JsonParseResult,
} from '../lib/json-parser.js';

export const importRouter = Router();

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// Note: Validation schemas and parsing logic have been moved to ../lib/json-parser.ts

// Generate a unique ID for imported entities
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
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
    let isPublic = false;
    let isFavorite = false;
    let settings: Record<string, unknown> = {};
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
    let comments: Array<{
      id: string;
      nodeId: string | null;
      text: string;
      resolved: boolean;
      parentId: string | null;
    }> = [];

    // Detect and parse format
    if (format === 'mindmapper-json' || (typeof data === 'object' && data.format === 'mindmapper-json')) {
      // MindMapper native format (v1.0 and v1.1) - use new JSON parser
      const parseResult = parseMindMapperJson(data);

      // Check for fatal errors
      const fatalErrors = parseResult.errors.filter(e => e.fatal);
      if (fatalErrors.length > 0) {
        throw new AppError(400, `Failed to parse MindMapper JSON: ${fatalErrors.map(e => e.message).join(', ')}`);
      }

      title = parseResult.title;
      description = parseResult.description;
      isPublic = parseResult.isPublic;
      isFavorite = parseResult.isFavorite;
      settings = parseResult.settings;

      // Map parsed nodes to import format
      nodes = parseResult.nodes.map(node => ({
        id: node.id,
        text: node.text,
        parentId: node.parentId,
        position: node.position,
        type: node.type,
        sortOrder: node.sortOrder,
        style: node.style,
        metadata: node.metadata,
        isCollapsed: node.isCollapsed,
        width: node.size.width,
        height: node.size.height,
      }));

      // Map connections
      connections = parseResult.connections.map(conn => ({
        sourceNodeId: conn.sourceNodeId,
        targetNodeId: conn.targetNodeId,
        type: conn.type,
        label: conn.label,
        style: conn.style,
      }));

      // Map comments
      comments = parseResult.comments.map(comment => ({
        id: comment.id,
        nodeId: comment.nodeId,
        text: comment.text,
        resolved: comment.resolved,
        parentId: comment.parentId,
      }));
    } else if (format === 'freemind' || (typeof data === 'string' && data.includes('<map'))) {
      // FreeMind XML format - use the enhanced parser
      const xmlContent = typeof data === 'string' ? data : JSON.stringify(data);
      const conversionResult = parseAndConvertFreeMind(xmlContent);

      // Check for fatal errors
      const fatalErrors = conversionResult.errors.filter(e => e.fatal);
      if (fatalErrors.length > 0) {
        throw new AppError(400, `Failed to parse FreeMind file: ${fatalErrors.map(e => e.message).join(', ')}`);
      }

      title = conversionResult.title;

      // Create ID mapping for imported nodes
      const idMap = new Map<string, string>();
      conversionResult.nodes.forEach(node => {
        const newId = generateId();
        idMap.set(node.id, newId);
      });

      // Map nodes with new IDs
      nodes = conversionResult.nodes.map((node, index) => ({
        id: idMap.get(node.id)!,
        text: node.text,
        parentId: node.parentId ? (idMap.get(node.parentId) || null) : null,
        position: node.position,
        type: node.type,
        sortOrder: node.sortOrder,
        style: node.style,
        metadata: node.metadata,
        isCollapsed: node.isCollapsed,
        width: node.size.width,
        height: node.size.height,
      }));

      // Map connections (arrow links become cross-links)
      connections = conversionResult.connections.map(conn => ({
        sourceNodeId: idMap.get(conn.sourceNodeId)!,
        targetNodeId: idMap.get(conn.targetNodeId)!,
        type: conn.type,
        label: conn.label,
        style: conn.style,
      })).filter(c => c.sourceNodeId && c.targetNodeId);
    } else if (format === 'simple' || (typeof data === 'object' && Array.isArray(data.nodes))) {
      // Simple JSON format with optional hierarchy - use new JSON parser
      const parseResult = parseSimpleJson(data);

      // Check for fatal errors
      const fatalErrors = parseResult.errors.filter(e => e.fatal);
      if (fatalErrors.length > 0) {
        throw new AppError(400, `Failed to parse simple JSON: ${fatalErrors.map(e => e.message).join(', ')}`);
      }

      title = parseResult.title;
      description = parseResult.description;

      // Map parsed nodes to import format
      nodes = parseResult.nodes.map(node => ({
        id: node.id,
        text: node.text,
        parentId: node.parentId,
        position: node.position,
        type: node.type,
        sortOrder: node.sortOrder,
        style: node.style,
        metadata: node.metadata,
        isCollapsed: node.isCollapsed,
        width: node.size.width,
        height: node.size.height,
      }));

      // Map connections if present
      connections = parseResult.connections.map(conn => ({
        sourceNodeId: conn.sourceNodeId,
        targetNodeId: conn.targetNodeId,
        type: conn.type,
        label: conn.label,
        style: conn.style,
      }));
    } else if (Array.isArray(data)) {
      // Plain array of text items or generic array - use new JSON parser
      const parseResult = parseGenericJson(data);

      // Check for fatal errors
      const fatalErrors = parseResult.errors.filter(e => e.fatal);
      if (fatalErrors.length > 0) {
        throw new AppError(400, `Failed to parse array data: ${fatalErrors.map(e => e.message).join(', ')}`);
      }

      title = parseResult.title;

      // Map parsed nodes to import format
      nodes = parseResult.nodes.map(node => ({
        id: node.id,
        text: node.text,
        parentId: node.parentId,
        position: node.position,
        type: node.type,
        sortOrder: node.sortOrder,
        style: node.style,
        metadata: node.metadata,
        isCollapsed: node.isCollapsed,
        width: node.size.width,
        height: node.size.height,
      }));
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

    // Create the map with enhanced settings
    const map = await prisma.mindMap.create({
      data: {
        title,
        description,
        isPublic,
        isFavorite,
        settings: Object.keys(settings).length > 0 ? settings as Prisma.InputJsonValue : undefined, // Include map settings from import
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

    // Create comments (v1.1+ feature)
    for (const comment of comments) {
      await prisma.comment.create({
        data: {
          id: comment.id,
          mindMapId: map.id,
          nodeId: comment.nodeId,
          userId,
          text: comment.text,
          resolved: comment.resolved,
          parentId: comment.parentId,
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
        commentCount: comments.length,
      },
    });
  } catch (error) {
    next(error);
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

    // Check for FreeMind XML first (string-based detection)
    if (typeof data === 'string') {
      if (data.includes('<map') && data.includes('<node')) {
        format = 'freemind';
        confidence = 0.9;

        // Use the FreeMind parser for detailed analysis
        try {
          const parseResult = parseFreeMindXml(data);
          const preview = generateFreeMindPreview(parseResult);
          details = {
            nodeCount: preview.summary.totalNodes,
            maxDepth: preview.summary.maxDepth,
            arrowLinks: preview.summary.arrowLinks,
            version: preview.summary.version,
            title: preview.summary.title,
            hasWarnings: preview.summary.warnings > 0,
            hasErrors: preview.summary.errors > 0,
            sampleNodes: preview.sampleNodes.slice(0, 5),
          };
          confidence = parseResult.errors.length === 0 ? 0.95 : 0.7;
        } catch {
          // Fall back to basic counting
          const nodeCount = (data.match(/<node/g) || []).length;
          details = { nodeCount };
        }
      } else if (data.includes('<?xml')) {
        format = 'xml-unknown';
        confidence = 0.5;
      } else {
        // Try to parse as JSON string
        try {
          const parsed = JSON.parse(data);
          const detection = detectJsonFormat(parsed);
          format = detection.format;
          confidence = detection.confidence;
          details = detection.details;
        } catch {
          format = 'unknown';
          confidence = 0;
          details = { error: 'Invalid JSON string' };
        }
      }
    } else {
      // Use the new JSON format detection
      const detection = detectJsonFormat(data);
      format = detection.format;
      confidence = detection.confidence;
      details = detection.details;

      // If detected as a JSON format, add preview info
      if (detection.format === 'mindmapper-json' ||
          detection.format === 'simple' ||
          detection.format === 'generic' ||
          detection.format === 'array') {
        try {
          const parseResult = parseJson(data);
          if (parseResult.errors.filter(e => e.fatal).length === 0) {
            const preview = generateJsonPreview(parseResult);
            details = {
              ...details,
              title: preview.summary.title,
              nodeCount: preview.summary.totalNodes,
              connectionCount: preview.summary.totalConnections,
              commentCount: preview.summary.totalComments,
              maxDepth: preview.summary.maxDepth,
              formatVersion: preview.summary.formatVersion,
              hasWarnings: preview.summary.warnings > 0,
              hasErrors: preview.summary.errors > 0,
              sampleNodes: preview.sampleNodes.slice(0, 5),
            };
          }
        } catch {
          // Keep original detection details
        }
      }
    }

    res.json({
      success: true,
      data: {
        format,
        confidence,
        details,
        supported: ['mindmapper-json', 'simple', 'freemind', 'array', 'generic'].includes(format),
      },
    });
  } catch (error) {
    next(error);
  }
});
