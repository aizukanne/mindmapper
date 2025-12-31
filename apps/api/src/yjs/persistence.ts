import * as Y from 'yjs';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';

// Debounce timers for each document
const persistenceTimers = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_MS = 2000; // 2 seconds debounce

// Yjs document state storage key prefix
const YJS_STATE_PREFIX = 'yjs:state:';
const YJS_PENDING_PREFIX = 'yjs:pending:';

interface YjsNodeData {
  id: string;
  text: string;
  type: 'ROOT' | 'CHILD' | 'FLOATING';
  parentId: string | null;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  style: Record<string, unknown>;
  isCollapsed: boolean;
  metadata: Record<string, unknown>;
  sortOrder: number;
}

interface YjsConnectionData {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: 'HIERARCHICAL' | 'CROSS_LINK';
  label: string | null;
  style: Record<string, unknown>;
}

/**
 * Schedule a debounced persistence of a Yjs document to the database
 */
export function schedulePersistence(mapId: string, doc: Y.Doc) {
  // Clear existing timer
  const existingTimer = persistenceTimers.get(mapId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Schedule new persistence
  const timer = setTimeout(async () => {
    persistenceTimers.delete(mapId);
    await persistDocument(mapId, doc);
  }, DEBOUNCE_MS);

  persistenceTimers.set(mapId, timer);

  // Also store pending state in Redis for crash recovery
  storePendingState(mapId, doc).catch(console.error);
}

/**
 * Store the current Yjs state in Redis as pending (not yet persisted to DB)
 */
async function storePendingState(mapId: string, doc: Y.Doc) {
  try {
    const state = Y.encodeStateAsUpdate(doc);
    await redis.set(
      `${YJS_PENDING_PREFIX}${mapId}`,
      Buffer.from(state).toString('base64'),
      'EX',
      3600 // 1 hour expiry
    );
  } catch (err) {
    console.error(`[Yjs Persistence] Failed to store pending state for ${mapId}:`, err);
  }
}

/**
 * Persist a Yjs document to the PostgreSQL database
 */
export async function persistDocument(mapId: string, doc: Y.Doc) {
  console.log(`[Yjs Persistence] Persisting document: ${mapId}`);

  try {
    // Extract nodes and connections from Yjs document
    const nodesMap = doc.getMap<YjsNodeData>('nodes');
    const connectionsMap = doc.getMap<YjsConnectionData>('connections');

    const nodes: YjsNodeData[] = [];
    nodesMap.forEach((node) => nodes.push(node));

    const connections: YjsConnectionData[] = [];
    connectionsMap.forEach((conn) => connections.push(conn));

    // Use transaction for atomic updates
    await prisma.$transaction(async (tx) => {
      // Get existing node IDs
      const existingNodes = await tx.node.findMany({
        where: { mindMapId: mapId },
        select: { id: true },
      });
      const existingNodeIds = new Set(existingNodes.map((n) => n.id));

      // Get existing connection IDs
      const existingConnections = await tx.connection.findMany({
        where: { mindMapId: mapId },
        select: { id: true },
      });
      const existingConnectionIds = new Set(existingConnections.map((c) => c.id));

      // Determine which nodes to create, update, or delete
      const yjsNodeIds = new Set(nodes.map((n) => n.id));
      const nodesToCreate = nodes.filter((n) => !existingNodeIds.has(n.id));
      const nodesToUpdate = nodes.filter((n) => existingNodeIds.has(n.id));
      const nodeIdsToDelete = [...existingNodeIds].filter((id) => !yjsNodeIds.has(id));

      // Determine which connections to create or delete
      const yjsConnectionIds = new Set(connections.map((c) => c.id));
      const connectionsToCreate = connections.filter((c) => !existingConnectionIds.has(c.id));
      const connectionIdsToDelete = [...existingConnectionIds].filter((id) => !yjsConnectionIds.has(id));

      // Delete removed nodes (cascade will handle connections)
      if (nodeIdsToDelete.length > 0) {
        await tx.node.deleteMany({
          where: { id: { in: nodeIdsToDelete } },
        });
      }

      // Delete removed connections
      if (connectionIdsToDelete.length > 0) {
        await tx.connection.deleteMany({
          where: { id: { in: connectionIdsToDelete } },
        });
      }

      // Create new nodes
      if (nodesToCreate.length > 0) {
        await tx.node.createMany({
          data: nodesToCreate.map((node) => ({
            id: node.id,
            mindMapId: mapId,
            parentId: node.parentId,
            type: node.type,
            text: node.text,
            positionX: node.positionX,
            positionY: node.positionY,
            width: node.width,
            height: node.height,
            style: node.style as Prisma.InputJsonValue,
            metadata: node.metadata as Prisma.InputJsonValue,
            sortOrder: node.sortOrder,
            isCollapsed: node.isCollapsed,
          })),
        });
      }

      // Update existing nodes
      for (const node of nodesToUpdate) {
        await tx.node.update({
          where: { id: node.id },
          data: {
            parentId: node.parentId,
            type: node.type,
            text: node.text,
            positionX: node.positionX,
            positionY: node.positionY,
            width: node.width,
            height: node.height,
            style: node.style as Prisma.InputJsonValue,
            metadata: node.metadata as Prisma.InputJsonValue,
            sortOrder: node.sortOrder,
            isCollapsed: node.isCollapsed,
          },
        });
      }

      // Create new connections
      if (connectionsToCreate.length > 0) {
        await tx.connection.createMany({
          data: connectionsToCreate.map((conn) => ({
            id: conn.id,
            mindMapId: mapId,
            sourceNodeId: conn.sourceNodeId,
            targetNodeId: conn.targetNodeId,
            type: conn.type,
            label: conn.label,
            style: conn.style as Prisma.InputJsonValue,
          })),
          skipDuplicates: true,
        });
      }

      // Update map's updatedAt timestamp
      await tx.mindMap.update({
        where: { id: mapId },
        data: { updatedAt: new Date() },
      });
    });

    // Store the persisted Yjs state in Redis
    const state = Y.encodeStateAsUpdate(doc);
    await redis.set(
      `${YJS_STATE_PREFIX}${mapId}`,
      Buffer.from(state).toString('base64')
    );

    // Clear pending state
    await redis.del(`${YJS_PENDING_PREFIX}${mapId}`);

    console.log(`[Yjs Persistence] Successfully persisted document: ${mapId}`);
  } catch (err) {
    console.error(`[Yjs Persistence] Failed to persist document ${mapId}:`, err);
    throw err;
  }
}

/**
 * Load a Yjs document state from the database
 */
export async function loadDocument(mapId: string, doc: Y.Doc): Promise<boolean> {
  console.log(`[Yjs Persistence] Loading document: ${mapId}`);

  try {
    // First, try to load from Redis cache
    const cachedState = await redis.get(`${YJS_STATE_PREFIX}${mapId}`);
    if (cachedState) {
      const state = Buffer.from(cachedState, 'base64');
      Y.applyUpdate(doc, new Uint8Array(state));
      console.log(`[Yjs Persistence] Loaded document from cache: ${mapId}`);
      return true;
    }

    // Check for pending state (crash recovery)
    const pendingState = await redis.get(`${YJS_PENDING_PREFIX}${mapId}`);
    if (pendingState) {
      const state = Buffer.from(pendingState, 'base64');
      Y.applyUpdate(doc, new Uint8Array(state));
      console.log(`[Yjs Persistence] Loaded document from pending state: ${mapId}`);
      // Schedule persistence to save the recovered state
      schedulePersistence(mapId, doc);
      return true;
    }

    // Load from database
    const map = await prisma.mindMap.findUnique({
      where: { id: mapId },
      include: {
        nodes: true,
        connections: true,
      },
    });

    if (!map) {
      console.log(`[Yjs Persistence] Map not found: ${mapId}`);
      return false;
    }

    // Populate Yjs document with data from database
    const nodesMap = doc.getMap<YjsNodeData>('nodes');
    const connectionsMap = doc.getMap<YjsConnectionData>('connections');
    const metadataMap = doc.getMap('metadata');

    doc.transact(() => {
      // Add nodes
      for (const node of map.nodes) {
        nodesMap.set(node.id, {
          id: node.id,
          text: node.text,
          type: node.type as 'ROOT' | 'CHILD' | 'FLOATING',
          parentId: node.parentId,
          positionX: node.positionX,
          positionY: node.positionY,
          width: node.width,
          height: node.height,
          style: node.style as Record<string, unknown>,
          isCollapsed: node.isCollapsed,
          metadata: node.metadata as Record<string, unknown>,
          sortOrder: node.sortOrder,
        });
      }

      // Add connections
      for (const conn of map.connections) {
        connectionsMap.set(conn.id, {
          id: conn.id,
          sourceNodeId: conn.sourceNodeId,
          targetNodeId: conn.targetNodeId,
          type: conn.type as 'HIERARCHICAL' | 'CROSS_LINK',
          label: conn.label,
          style: conn.style as Record<string, unknown>,
        });
      }

      // Add metadata
      metadataMap.set('title', map.title);
      metadataMap.set('description', map.description);
    });

    // Cache the loaded state
    const state = Y.encodeStateAsUpdate(doc);
    await redis.set(
      `${YJS_STATE_PREFIX}${mapId}`,
      Buffer.from(state).toString('base64')
    );

    console.log(`[Yjs Persistence] Loaded document from database: ${mapId}`);
    return true;
  } catch (err) {
    console.error(`[Yjs Persistence] Failed to load document ${mapId}:`, err);
    return false;
  }
}

/**
 * Clear cached state for a document (e.g., when deleted)
 */
export async function clearDocumentCache(mapId: string) {
  await redis.del(`${YJS_STATE_PREFIX}${mapId}`);
  await redis.del(`${YJS_PENDING_PREFIX}${mapId}`);
}

/**
 * Force immediate persistence of all pending documents
 */
export async function flushAllPending() {
  const pendingDocs = [...persistenceTimers.keys()];
  for (const mapId of pendingDocs) {
    const timer = persistenceTimers.get(mapId);
    if (timer) {
      clearTimeout(timer);
      persistenceTimers.delete(mapId);
    }
  }
  console.log(`[Yjs Persistence] Flushed ${pendingDocs.length} pending documents`);
}
