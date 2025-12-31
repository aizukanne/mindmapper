import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import { redisSub, redisPub } from '../lib/redis.js';
import { schedulePersistence, loadDocument } from './persistence.js';

// Message types
const messageSync = 0;
const messageAwareness = 1;

// Redis channel prefix for cross-instance sync
const REDIS_CHANNEL_PREFIX = 'yjs:updates:';

// Store for Y.Doc instances per room
const docs = new Map<string, {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<WebSocket>;
  loaded: boolean;
}>();

// Get or create a Y.Doc for a room
async function getDoc(roomName: string): Promise<{
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<WebSocket>;
  loaded: boolean;
}> {
  if (!docs.has(roomName)) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);

    const room = {
      doc,
      awareness,
      clients: new Set<WebSocket>(),
      loaded: false,
    };

    docs.set(roomName, room);

    // Load existing document from database
    const mapId = extractMapId(roomName);
    if (mapId) {
      try {
        await loadDocument(mapId, doc);
        room.loaded = true;
      } catch (err) {
        console.error(`[Yjs] Failed to load document for room ${roomName}:`, err);
      }
    }

    // Subscribe to Redis channel for cross-instance updates
    try {
      await redisSub.subscribe(REDIS_CHANNEL_PREFIX + roomName);
    } catch (err) {
      console.error(`[Yjs] Failed to subscribe to Redis channel:`, err);
    }

    // Listen for document updates and schedule persistence
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      // Publish to Redis for other instances
      if (origin !== 'redis') {
        publishUpdate(roomName, update);
      }

      // Schedule persistence to database
      const mapId = extractMapId(roomName);
      if (mapId) {
        schedulePersistence(mapId, doc);
      }
    });
  }

  return docs.get(roomName)!;
}

// Extract map ID from room name (format: "mindmap-{mapId}")
function extractMapId(roomName: string): string | null {
  const match = roomName.match(/^mindmap-(.+)$/);
  return match ? match[1] : null;
}

// Publish update to Redis for cross-instance sync
function publishUpdate(roomName: string, update: Uint8Array) {
  try {
    redisPub.publish(
      REDIS_CHANNEL_PREFIX + roomName,
      Buffer.from(update).toString('base64')
    );
  } catch (err) {
    console.error(`[Yjs] Failed to publish update to Redis:`, err);
  }
}

// Send message to a client
function send(ws: WebSocket, message: Uint8Array) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(message);
  }
}

// Broadcast to all clients in a room
function broadcast(roomName: string, message: Uint8Array, excludeWs?: WebSocket) {
  const room = docs.get(roomName);
  if (room) {
    room.clients.forEach((client) => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

// Handle incoming messages
async function handleMessage(
  ws: WebSocket,
  roomName: string,
  message: Uint8Array
) {
  const room = await getDoc(roomName);
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case messageSync: {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      const syncMessageType = syncProtocol.readSyncMessage(
        decoder,
        encoder,
        room.doc,
        ws
      );

      if (encoding.length(encoder) > 1) {
        send(ws, encoding.toUint8Array(encoder));
      }

      // If sync step 2, broadcast to other clients
      if (syncMessageType === syncProtocol.messageYjsSyncStep2) {
        const update = Y.encodeStateAsUpdate(room.doc);
        const updateEncoder = encoding.createEncoder();
        encoding.writeVarUint(updateEncoder, messageSync);
        syncProtocol.writeUpdate(updateEncoder, update);
        broadcast(roomName, encoding.toUint8Array(updateEncoder), ws);
      }
      break;
    }

    case messageAwareness: {
      awarenessProtocol.applyAwarenessUpdate(
        room.awareness,
        decoding.readVarUint8Array(decoder),
        ws
      );
      break;
    }
  }
}

// Handle Redis messages for cross-instance sync
function setupRedisSubscriber() {
  redisSub.on('message', (channel: string, message: string) => {
    const roomName = channel.replace(REDIS_CHANNEL_PREFIX, '');
    const room = docs.get(roomName);

    if (room) {
      try {
        const update = Buffer.from(message, 'base64');
        Y.applyUpdate(room.doc, new Uint8Array(update), 'redis');

        // Broadcast to all local clients
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.writeUpdate(encoder, new Uint8Array(update));
        broadcast(roomName, encoding.toUint8Array(encoder));
      } catch (err) {
        console.error(`[Yjs] Failed to apply Redis update:`, err);
      }
    }
  });
}

// Setup the WebSocket server
export function setupYjsServer(wss: WebSocketServer) {
  // Setup Redis subscriber for cross-instance sync
  setupRedisSubscriber();

  wss.on('connection', async (ws: WebSocket, req) => {
    // Extract room name from URL path
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const roomName = url.searchParams.get('room') || 'default';

    // TODO: Validate JWT token from query params
    // const token = url.searchParams.get('token');
    // if (!validateToken(token, roomName)) {
    //   ws.close(4001, 'Unauthorized');
    //   return;
    // }

    console.log(`[Yjs] Client connected to room: ${roomName}`);

    const room = await getDoc(roomName);
    room.clients.add(ws);

    // Send initial sync
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, room.doc);
    send(ws, encoding.toUint8Array(encoder));

    // Send awareness state
    const awarenessStates = room.awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, messageAwareness);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(
          room.awareness,
          Array.from(awarenessStates.keys())
        )
      );
      send(ws, encoding.toUint8Array(awarenessEncoder));
    }

    // Handle document updates
    const updateHandler = (update: Uint8Array, origin: unknown) => {
      if (origin !== ws && origin !== 'redis') {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.writeUpdate(encoder, update);
        send(ws, encoding.toUint8Array(encoder));
      }
    };
    room.doc.on('update', updateHandler);

    // Handle awareness updates
    const awarenessHandler = (
      { added, updated, removed }: {
        added: number[];
        updated: number[];
        removed: number[];
      },
      _origin: unknown
    ) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(room.awareness, changedClients)
      );
      broadcast(roomName, encoding.toUint8Array(encoder));
    };
    room.awareness.on('update', awarenessHandler);

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        handleMessage(ws, roomName, new Uint8Array(data));
      } catch (err) {
        console.error('[Yjs] Error handling message:', err);
      }
    });

    // Handle disconnect
    ws.on('close', async () => {
      console.log(`[Yjs] Client disconnected from room: ${roomName}`);

      room.clients.delete(ws);
      room.doc.off('update', updateHandler);
      room.awareness.off('update', awarenessHandler);

      // Remove client from awareness
      awarenessProtocol.removeAwarenessStates(
        room.awareness,
        [room.doc.clientID],
        null
      );

      // Clean up empty rooms after a delay
      if (room.clients.size === 0) {
        setTimeout(async () => {
          const currentRoom = docs.get(roomName);
          if (currentRoom && currentRoom.clients.size === 0) {
            console.log(`[Yjs] Cleaning up empty room: ${roomName}`);

            // Unsubscribe from Redis channel
            try {
              await redisSub.unsubscribe(REDIS_CHANNEL_PREFIX + roomName);
            } catch (err) {
              console.error(`[Yjs] Failed to unsubscribe from Redis:`, err);
            }

            currentRoom.doc.destroy();
            docs.delete(roomName);
          }
        }, 30000); // 30 seconds
      }
    });

    ws.on('error', (err) => {
      console.error('[Yjs] WebSocket error:', err);
    });
  });

  console.log('[Yjs] WebSocket server initialized');
}

// Get active room count for monitoring
export function getActiveRoomCount(): number {
  return docs.size;
}

// Get client count for a room
export function getRoomClientCount(roomName: string): number {
  const room = docs.get(roomName);
  return room ? room.clients.size : 0;
}
