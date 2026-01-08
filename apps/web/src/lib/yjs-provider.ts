import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { NodeStyle, ConnectionStyle } from '@mindmapper/types';
import {
  OfflineSyncManager,
  createOfflineSyncManager,
  type OfflineSyncState,
  type OfflineSyncEvents,
} from './offline-sync-manager';
import {
  YjsWebSocketProvider,
  createYjsWebSocketProvider,
  type ConnectionState,
  type SyncState as ProviderSyncState,
  type ProviderState,
  type ProviderError,
  type YjsWebSocketProviderOptions,
  type YjsWebSocketProviderEvents,
  developmentProviderConfig,
  productionProviderConfig,
} from './yjs-websocket-provider';

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

// Create WebSocket provider (legacy - uses basic y-websocket)
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

/**
 * Create enhanced WebSocket provider with robust connection handling
 *
 * This provides:
 * - Granular connection state tracking (disconnected, connecting, connected, reconnecting, error, closed)
 * - Sync state tracking (unsynced, syncing, synced)
 * - Exponential backoff with jitter for reconnection
 * - Configurable reconnection attempts
 * - Connection timeout handling
 * - Error categorization and reporting
 * - Event-driven status updates
 *
 * @param mapId - The map ID to connect to
 * @param doc - The Y.Doc instance
 * @param options - Provider configuration options
 * @param events - Event handlers for state changes
 * @returns Enhanced WebSocket provider instance
 */
export function createEnhancedWebsocketProvider(
  mapId: string,
  doc: Y.Doc,
  options?: YjsWebSocketProviderOptions,
  events?: YjsWebSocketProviderEvents
): YjsWebSocketProvider {
  // Use appropriate config based on environment
  const envConfig = import.meta.env.PROD
    ? productionProviderConfig
    : developmentProviderConfig;

  return createYjsWebSocketProvider(mapId, doc, {
    ...envConfig,
    ...options,
  }, events);
}

/**
 * Get default provider configuration based on environment
 */
export function getDefaultProviderConfig(): YjsWebSocketProviderOptions {
  return import.meta.env.PROD
    ? productionProviderConfig
    : developmentProviderConfig;
}

// Create IndexedDB persistence for offline support (basic version)
export function createOfflinePersistence(mapId: string, doc: Y.Doc) {
  const persistence = new IndexeddbPersistence(`mindmap-${mapId}`, doc);

  persistence.on('synced', () => {
    console.log('[Yjs] IndexedDB synced');
  });

  return persistence;
}

/**
 * Create an enhanced offline persistence with sync tracking
 * This provides better offline/online sync management
 */
export function createEnhancedOfflinePersistence(
  mapId: string,
  doc: Y.Doc,
  events?: Partial<OfflineSyncEvents>
): {
  persistence: IndexeddbPersistence;
  syncManager: OfflineSyncManager;
} {
  const syncManager = createOfflineSyncManager(mapId);

  if (events) {
    syncManager.setEvents(events);
  }

  const persistence = syncManager.initialize(doc);

  return { persistence, syncManager };
}

// Re-export types for convenience
export type { OfflineSyncState, OfflineSyncEvents, OfflineSyncManager };

// Re-export enhanced provider types
export {
  YjsWebSocketProvider,
  type ConnectionState,
  type ProviderSyncState,
  type ProviderState,
  type ProviderError,
  type YjsWebSocketProviderOptions,
  type YjsWebSocketProviderEvents,
};

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
