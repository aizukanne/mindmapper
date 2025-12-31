import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { NodeStyle, ConnectionStyle } from '@mindmapper/types';

// Types for Yjs document structure
export interface YjsNodeData {
  id: string;
  text: string;
  type: 'ROOT' | 'CHILD' | 'FLOATING';
  parentId: string | null;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  style: NodeStyle;
  isCollapsed: boolean;
  metadata: Record<string, unknown>;
  sortOrder: number;
}

export interface YjsConnectionData {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: 'HIERARCHICAL' | 'CROSS_LINK';
  label: string | null;
  style: ConnectionStyle;
}

export interface YjsAwareness {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}

// Create and configure Yjs document
export function createYjsDoc(_mapId: string) {
  const doc = new Y.Doc();

  // Define shared types
  const nodesMap = doc.getMap<YjsNodeData>('nodes');
  const connectionsMap = doc.getMap<YjsConnectionData>('connections');
  const metadataMap = doc.getMap('metadata');

  return {
    doc,
    nodesMap,
    connectionsMap,
    metadataMap,
  };
}

// Create WebSocket provider
export function createWebsocketProvider(
  mapId: string,
  doc: Y.Doc,
  options?: {
    url?: string;
    token?: string;
  }
) {
  const wsUrl = options?.url || import.meta.env.VITE_YJS_WEBSOCKET_URL || 'ws://localhost:3001/yjs';

  const provider = new WebsocketProvider(
    wsUrl,
    `mindmap-${mapId}`,
    doc,
    {
      params: options?.token ? { token: options.token } : undefined,
      connect: true,
      resyncInterval: 10000, // Resync every 10 seconds
      maxBackoffTime: 5000, // Max 5 seconds between reconnection attempts
    }
  );

  // Log connection status
  provider.on('status', (event: { status: string }) => {
    console.log('[Yjs] Connection status:', event.status);
  });

  provider.on('sync', (isSynced: boolean) => {
    console.log('[Yjs] Synced:', isSynced);
  });

  return provider;
}

// Create IndexedDB persistence for offline support
export function createOfflinePersistence(mapId: string, doc: Y.Doc) {
  const persistence = new IndexeddbPersistence(`mindmap-${mapId}`, doc);

  persistence.on('synced', () => {
    console.log('[Yjs] IndexedDB synced');
  });

  return persistence;
}

// Helper to convert Yjs map to array
export function yjsMapToArray<T>(map: Y.Map<T>): T[] {
  const result: T[] = [];
  map.forEach((value) => {
    result.push(value);
  });
  return result;
}

// Helper to generate a random color for presence
export function getRandomPresenceColor(): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
