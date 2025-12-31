import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const exportRouter = Router();

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// Check if user has access to the map
async function checkMapAccess(req: Request, mapId: string): Promise<boolean> {
  const userId = getUserId(req);
  const map = await prisma.mindMap.findFirst({
    where: {
      id: mapId,
      OR: [
        { userId },
        { isPublic: true },
        {
          shares: {
            some: {
              OR: [
                { userId },
                { shareToken: { not: null } },
              ],
            },
          },
        },
      ],
    },
  });
  return !!map;
}

// Get full map data for export
async function getMapData(mapId: string) {
  const map = await prisma.mindMap.findUnique({
    where: { id: mapId },
    include: {
      nodes: {
        orderBy: { sortOrder: 'asc' },
      },
      connections: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
  return map;
}

// Interface for exported node
interface ExportedNode {
  id: string;
  text: string;
  type: string;
  parentId: string | null;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: unknown;
  metadata: unknown;
  isCollapsed: boolean;
  sortOrder: number;
  children?: ExportedNode[];
}

// Interface for exported map
interface ExportedMap {
  version: string;
  exportedAt: string;
  format: string;
  map: {
    id: string;
    title: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    author?: {
      name: string | null;
      email: string;
    };
  };
  nodes: ExportedNode[];
  connections: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    type: string;
    label: string | null;
    style: unknown;
  }>;
}

// Build hierarchical node structure
function buildNodeHierarchy(nodes: ExportedNode[]): ExportedNode[] {
  const nodeMap = new Map<string, ExportedNode>();
  const rootNodes: ExportedNode[] = [];

  // First pass: create map of all nodes
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Second pass: build hierarchy
  nodes.forEach(node => {
    const currentNode = nodeMap.get(node.id)!;
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(currentNode);
      }
    } else {
      rootNodes.push(currentNode);
    }
  });

  return rootNodes;
}

// Convert node to markdown outline
function nodeToMarkdown(node: ExportedNode, depth: number = 0): string {
  const indent = '  '.repeat(depth);
  const bullet = depth === 0 ? '#' : '-';
  let result = `${indent}${bullet} ${node.text}\n`;

  if (node.children && node.children.length > 0) {
    // Sort children by sortOrder
    const sortedChildren = [...node.children].sort((a, b) => a.sortOrder - b.sortOrder);
    sortedChildren.forEach(child => {
      result += nodeToMarkdown(child, depth + 1);
    });
  }

  return result;
}

// Generate SVG for the mind map
function generateSVG(
  nodes: Array<{ id: string; text: string; positionX: number; positionY: number; width: number; height: number; type: string; style: unknown }>,
  connections: Array<{ sourceNodeId: string; targetNodeId: string }>
): string {
  // Calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  nodes.forEach(node => {
    minX = Math.min(minX, node.positionX);
    minY = Math.min(minY, node.positionY);
    maxX = Math.max(maxX, node.positionX + (node.width || 150));
    maxY = Math.max(maxY, node.positionY + (node.height || 50));
  });

  // Add padding
  const padding = 50;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = maxX - minX;
  const height = maxY - minY;

  // Create node position map
  const nodePositions = new Map<string, { x: number; y: number; width: number; height: number }>();
  nodes.forEach(node => {
    nodePositions.set(node.id, {
      x: node.positionX - minX,
      y: node.positionY - minY,
      width: node.width || 150,
      height: node.height || 50,
    });
  });

  // Generate edges
  let edgesContent = '';
  connections.forEach(conn => {
    const source = nodePositions.get(conn.sourceNodeId);
    const target = nodePositions.get(conn.targetNodeId);
    if (source && target) {
      const x1 = source.x + source.width;
      const y1 = source.y + source.height / 2;
      const x2 = target.x;
      const y2 = target.y + target.height / 2;

      // Create a curved path
      const midX = (x1 + x2) / 2;
      edgesContent += `    <path d="M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}" stroke="#9ca3af" stroke-width="2" fill="none"/>\n`;
    }
  });

  // Generate nodes
  let nodesContent = '';
  nodes.forEach(node => {
    const pos = nodePositions.get(node.id)!;
    const style = node.style as { backgroundColor?: string; borderColor?: string; textColor?: string; borderRadius?: number } | null;
    const bgColor = style?.backgroundColor || (node.type === 'ROOT' ? '#3b82f6' : '#ffffff');
    const borderColor = style?.borderColor || '#d1d5db';
    const textColor = style?.textColor || (node.type === 'ROOT' ? '#ffffff' : '#1f2937');
    const borderRadius = style?.borderRadius || 8;

    nodesContent += `    <g transform="translate(${pos.x}, ${pos.y})">
      <rect width="${pos.width}" height="${pos.height}" rx="${borderRadius}" fill="${bgColor}" stroke="${borderColor}" stroke-width="1"/>
      <text x="${pos.width / 2}" y="${pos.height / 2}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="14">${escapeXml(node.text)}</text>
    </g>\n`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    text { user-select: none; }
  </style>
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <g id="edges">
${edgesContent}  </g>
  <g id="nodes">
${nodesContent}  </g>
</svg>`;
}

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// GET /api/maps/:id/export/json - Export as JSON
exportRouter.get('/:id/export/json', async (req: Request, res: Response, next) => {
  try {
    const { id: mapId } = req.params;

    const hasAccess = await checkMapAccess(req, mapId);
    if (!hasAccess) {
      throw new AppError(403, 'Access denied');
    }

    const map = await getMapData(mapId);
    if (!map) {
      throw new AppError(404, 'Mind map not found');
    }

    const exportData: ExportedMap = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      format: 'mindmapper-json',
      map: {
        id: map.id,
        title: map.title,
        description: map.description,
        createdAt: map.createdAt.toISOString(),
        updatedAt: map.updatedAt.toISOString(),
        author: map.user ? {
          name: map.user.name,
          email: map.user.email,
        } : undefined,
      },
      nodes: map.nodes.map(node => ({
        id: node.id,
        text: node.text,
        type: node.type,
        parentId: node.parentId,
        position: { x: node.positionX, y: node.positionY },
        size: { width: node.width, height: node.height },
        style: node.style,
        metadata: node.metadata,
        isCollapsed: node.isCollapsed,
        sortOrder: node.sortOrder,
      })),
      connections: map.connections.map(conn => ({
        id: conn.id,
        sourceNodeId: conn.sourceNodeId,
        targetNodeId: conn.targetNodeId,
        type: conn.type,
        label: conn.label,
        style: conn.style,
      })),
    };

    const filename = `${map.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(exportData);
  } catch (error) {
    next(error);
  }
});

// GET /api/maps/:id/export/markdown - Export as Markdown outline
exportRouter.get('/:id/export/markdown', async (req: Request, res: Response, next) => {
  try {
    const { id: mapId } = req.params;

    const hasAccess = await checkMapAccess(req, mapId);
    if (!hasAccess) {
      throw new AppError(403, 'Access denied');
    }

    const map = await getMapData(mapId);
    if (!map) {
      throw new AppError(404, 'Mind map not found');
    }

    // Convert nodes to hierarchical structure
    const flatNodes: ExportedNode[] = map.nodes.map(node => ({
      id: node.id,
      text: node.text,
      type: node.type,
      parentId: node.parentId,
      position: { x: node.positionX, y: node.positionY },
      size: { width: node.width, height: node.height },
      style: node.style,
      metadata: node.metadata,
      isCollapsed: node.isCollapsed,
      sortOrder: node.sortOrder,
    }));

    const hierarchy = buildNodeHierarchy(flatNodes);

    // Generate markdown
    let markdown = `# ${map.title}\n\n`;

    if (map.description) {
      markdown += `> ${map.description}\n\n`;
    }

    markdown += `---\n\n`;

    hierarchy.forEach(rootNode => {
      markdown += nodeToMarkdown(rootNode, 0);
      markdown += '\n';
    });

    markdown += `\n---\n\n`;
    markdown += `*Exported from MindMapper on ${new Date().toLocaleDateString()}*\n`;

    const filename = `${map.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(markdown);
  } catch (error) {
    next(error);
  }
});

// GET /api/maps/:id/export/svg - Export as SVG
exportRouter.get('/:id/export/svg', async (req: Request, res: Response, next) => {
  try {
    const { id: mapId } = req.params;

    const hasAccess = await checkMapAccess(req, mapId);
    if (!hasAccess) {
      throw new AppError(403, 'Access denied');
    }

    const map = await getMapData(mapId);
    if (!map) {
      throw new AppError(404, 'Mind map not found');
    }

    const svg = generateSVG(map.nodes, map.connections);
    const filename = `${map.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.svg`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(svg);
  } catch (error) {
    next(error);
  }
});

// GET /api/maps/:id/export/png - Export as PNG (requires client-side rendering or puppeteer)
exportRouter.get('/:id/export/png', async (req: Request, res: Response, next) => {
  try {
    const { id: mapId } = req.params;

    const hasAccess = await checkMapAccess(req, mapId);
    if (!hasAccess) {
      throw new AppError(403, 'Access denied');
    }

    const map = await getMapData(mapId);
    if (!map) {
      throw new AppError(404, 'Mind map not found');
    }

    // For PNG export, we generate SVG first and let the client convert it
    // This is more reliable than server-side puppeteer in most environments
    const svg = generateSVG(map.nodes, map.connections);

    // Return SVG with instructions for client-side conversion
    res.json({
      success: true,
      data: {
        svg,
        width: 1920,
        height: 1080,
        format: 'png',
        instructions: 'Convert SVG to PNG client-side using canvas',
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/maps/:id/export/pdf - Export as PDF (returns data for client-side PDF generation)
exportRouter.get('/:id/export/pdf', async (req: Request, res: Response, next) => {
  try {
    const { id: mapId } = req.params;

    const hasAccess = await checkMapAccess(req, mapId);
    if (!hasAccess) {
      throw new AppError(403, 'Access denied');
    }

    const map = await getMapData(mapId);
    if (!map) {
      throw new AppError(404, 'Mind map not found');
    }

    // Generate SVG for embedding in PDF
    const svg = generateSVG(map.nodes, map.connections);

    // Return data for client-side PDF generation
    res.json({
      success: true,
      data: {
        title: map.title,
        description: map.description,
        author: map.user?.name || map.user?.email,
        createdAt: map.createdAt.toISOString(),
        svg,
        nodeCount: map.nodes.length,
        format: 'pdf',
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/maps/:id/export/text - Export as plain text outline
exportRouter.get('/:id/export/text', async (req: Request, res: Response, next) => {
  try {
    const { id: mapId } = req.params;

    const hasAccess = await checkMapAccess(req, mapId);
    if (!hasAccess) {
      throw new AppError(403, 'Access denied');
    }

    const map = await getMapData(mapId);
    if (!map) {
      throw new AppError(404, 'Mind map not found');
    }

    // Convert nodes to hierarchical structure
    const flatNodes: ExportedNode[] = map.nodes.map(node => ({
      id: node.id,
      text: node.text,
      type: node.type,
      parentId: node.parentId,
      position: { x: node.positionX, y: node.positionY },
      size: { width: node.width, height: node.height },
      style: node.style,
      metadata: node.metadata,
      isCollapsed: node.isCollapsed,
      sortOrder: node.sortOrder,
    }));

    const hierarchy = buildNodeHierarchy(flatNodes);

    // Generate plain text outline
    function nodeToText(node: ExportedNode, depth: number = 0): string {
      const indent = '    '.repeat(depth);
      let result = `${indent}${node.text}\n`;

      if (node.children && node.children.length > 0) {
        const sortedChildren = [...node.children].sort((a, b) => a.sortOrder - b.sortOrder);
        sortedChildren.forEach(child => {
          result += nodeToText(child, depth + 1);
        });
      }

      return result;
    }

    let text = `${map.title}\n`;
    text += '='.repeat(map.title.length) + '\n\n';

    if (map.description) {
      text += `${map.description}\n\n`;
    }

    hierarchy.forEach(rootNode => {
      text += nodeToText(rootNode, 0);
      text += '\n';
    });

    const filename = `${map.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(text);
  } catch (error) {
    next(error);
  }
});
