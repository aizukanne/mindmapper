/**
 * Offline Sync Manager
 *
 * Manages offline persistence for Yjs documents using IndexedDB.
 * Tracks pending changes and syncs them when connection is restored.
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

// Sync status types
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'pending';

export interface OfflineSyncState {
  status: SyncStatus;
  pendingChanges: number;
  lastSyncedAt: Date | null;
  lastError: string | null;
  isIndexedDbReady: boolean;
}

export interface OfflineSyncEvents {
  onStatusChange: (state: OfflineSyncState) => void;
  onSyncComplete: () => void;
  onSyncError: (error: Error) => void;
  onOfflineChangesQueued: (count: number) => void;
}

// Storage key for tracking pending changes metadata
const PENDING_CHANGES_KEY = 'mindmapper_yjs_pending_changes';

interface PendingChangesMeta {
  [mapId: string]: {
    count: number;
    lastModified: number;
    wasOffline: boolean;
  };
}

/**
 * Enhanced IndexedDB persistence manager for Yjs documents
 * Provides offline sync capabilities with status tracking
 */
export class OfflineSyncManager {
  private persistence: IndexeddbPersistence | null = null;
  private doc: Y.Doc | null = null;
  private mapId: string;
  private isConnectedToServer = false;
  private pendingChangeCount = 0;
  private lastSyncedAt: Date | null = null;
  private lastError: string | null = null;
  private isIndexedDbReady = false;
  private events: Partial<OfflineSyncEvents> = {};
  private updateHandler: ((update: Uint8Array, origin: unknown) => void) | null = null;
  private wasOfflineBeforeSync = false;

  constructor(mapId: string) {
    this.mapId = mapId;
    this.loadPendingChangesCount();
  }

  /**
   * Initialize the offline persistence for a Yjs document
   */
  initialize(doc: Y.Doc): IndexeddbPersistence {
    this.doc = doc;

    // Create IndexedDB persistence
    this.persistence = new IndexeddbPersistence(`mindmap-${this.mapId}`, doc);

    // Track when IndexedDB is ready
    this.persistence.on('synced', () => {
      console.log(`[OfflineSync] IndexedDB synced for map: ${this.mapId}`);
      this.isIndexedDbReady = true;

      // If we have pending changes from a previous session and we're connected, sync them
      if (this.pendingChangeCount > 0 && this.isConnectedToServer) {
        this.triggerSync();
      }

      this.notifyStatusChange();
    });

    // Track document updates to count pending changes when offline
    this.updateHandler = (_update: Uint8Array, origin: unknown) => {
      // Only count changes made locally (not from server sync)
      if (origin !== 'remote' && origin !== 'server' && !this.isConnectedToServer) {
        this.incrementPendingChanges();
        this.wasOfflineBeforeSync = true;
      }
    };

    doc.on('update', this.updateHandler);

    return this.persistence;
  }

  /**
   * Set event handlers
   */
  setEvents(events: Partial<OfflineSyncEvents>): void {
    this.events = events;
  }

  /**
   * Update connection status (called by WebSocket provider)
   */
  setConnected(connected: boolean): void {
    const wasDisconnected = !this.isConnectedToServer;
    this.isConnectedToServer = connected;

    if (connected && wasDisconnected) {
      // Connection restored - trigger sync if there are pending changes
      console.log(`[OfflineSync] Connection restored for map: ${this.mapId}`);

      if (this.pendingChangeCount > 0 || this.wasOfflineBeforeSync) {
        this.triggerSync();
      }
    } else if (!connected) {
      console.log(`[OfflineSync] Connection lost for map: ${this.mapId}`);
      this.wasOfflineBeforeSync = true;
    }

    this.notifyStatusChange();
  }

  /**
   * Trigger a sync when connection is restored
   */
  private triggerSync(): void {
    console.log(`[OfflineSync] Triggering sync for ${this.pendingChangeCount} pending changes`);

    // The actual sync happens automatically through Yjs WebSocket provider
    // when it reconnects. We just need to track the status.

    // Reset pending changes count after sync is triggered
    // The WebSocket provider will handle the actual sync
    setTimeout(() => {
      if (this.isConnectedToServer) {
        this.clearPendingChanges();
        this.lastSyncedAt = new Date();
        this.wasOfflineBeforeSync = false;
        this.events.onSyncComplete?.();
        this.notifyStatusChange();
      }
    }, 1000); // Give the WebSocket provider time to sync
  }

  /**
   * Increment pending changes counter
   */
  private incrementPendingChanges(): void {
    this.pendingChangeCount++;
    this.savePendingChangesCount();
    this.events.onOfflineChangesQueued?.(this.pendingChangeCount);
    this.notifyStatusChange();
  }

  /**
   * Clear pending changes counter
   */
  private clearPendingChanges(): void {
    this.pendingChangeCount = 0;
    this.savePendingChangesCount();
    this.notifyStatusChange();
  }

  /**
   * Get current sync state
   */
  getState(): OfflineSyncState {
    let status: SyncStatus;

    if (this.lastError) {
      status = 'error';
    } else if (!this.isConnectedToServer) {
      status = 'offline';
    } else if (this.pendingChangeCount > 0) {
      status = 'syncing';
    } else if (!this.isIndexedDbReady) {
      status = 'pending';
    } else {
      status = 'synced';
    }

    return {
      status,
      pendingChanges: this.pendingChangeCount,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
      isIndexedDbReady: this.isIndexedDbReady,
    };
  }

  /**
   * Notify listeners of status change
   */
  private notifyStatusChange(): void {
    this.events.onStatusChange?.(this.getState());
  }

  /**
   * Set an error
   */
  setError(error: string | null): void {
    this.lastError = error;
    if (error) {
      this.events.onSyncError?.(new Error(error));
    }
    this.notifyStatusChange();
  }

  /**
   * Save pending changes count to localStorage for persistence across page reloads
   */
  private savePendingChangesCount(): void {
    try {
      const stored = localStorage.getItem(PENDING_CHANGES_KEY);
      const meta: PendingChangesMeta = stored ? JSON.parse(stored) : {};

      meta[this.mapId] = {
        count: this.pendingChangeCount,
        lastModified: Date.now(),
        wasOffline: this.wasOfflineBeforeSync,
      };

      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(meta));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Load pending changes count from localStorage
   */
  private loadPendingChangesCount(): void {
    try {
      const stored = localStorage.getItem(PENDING_CHANGES_KEY);
      if (stored) {
        const meta: PendingChangesMeta = JSON.parse(stored);
        const mapMeta = meta[this.mapId];
        if (mapMeta) {
          this.pendingChangeCount = mapMeta.count;
          this.wasOfflineBeforeSync = mapMeta.wasOffline;
        }
      }
    } catch {
      this.pendingChangeCount = 0;
    }
  }

  /**
   * Force a sync check - useful when the page becomes visible again
   */
  checkAndSync(): void {
    if (this.isConnectedToServer && (this.pendingChangeCount > 0 || this.wasOfflineBeforeSync)) {
      this.triggerSync();
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.updateHandler && this.doc) {
      this.doc.off('update', this.updateHandler);
    }

    if (this.persistence) {
      this.persistence.destroy();
    }

    this.persistence = null;
    this.doc = null;
  }
}

/**
 * Create an offline sync manager for a map
 */
export function createOfflineSyncManager(mapId: string): OfflineSyncManager {
  return new OfflineSyncManager(mapId);
}

/**
 * Get total pending changes across all maps
 */
export function getTotalPendingChanges(): number {
  try {
    const stored = localStorage.getItem(PENDING_CHANGES_KEY);
    if (stored) {
      const meta: PendingChangesMeta = JSON.parse(stored);
      return Object.values(meta).reduce((sum, m) => sum + m.count, 0);
    }
  } catch {
    // Ignore errors
  }
  return 0;
}

/**
 * Clear all pending changes metadata (e.g., after successful full sync)
 */
export function clearAllPendingChanges(): void {
  try {
    localStorage.removeItem(PENDING_CHANGES_KEY);
  } catch {
    // Ignore errors
  }
}
