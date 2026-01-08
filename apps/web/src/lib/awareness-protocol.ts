/**
 * Awareness Protocol Implementation
 *
 * This module provides a comprehensive awareness protocol for real-time collaboration.
 * It handles:
 * - User presence tracking
 * - Cursor position broadcasting
 * - Node selection sharing
 * - Viewport synchronization
 * - Activity status management
 * - Stale user cleanup
 */

import type {
  AwarenessState,
  AwarenessStateUpdate,
  AwarenessConfig,
  AwarenessEvent,
  AwarenessEventType,
  ActivityStatus,
  CursorPosition,
  Viewport,
} from '@mindmapper/types';
import { DEFAULT_AWARENESS_CONFIG } from '@mindmapper/types';

// Re-export types for convenience
export type {
  AwarenessState,
  AwarenessStateUpdate,
  AwarenessConfig,
  AwarenessEvent,
  AwarenessEventType,
  ActivityStatus,
  CursorPosition,
  Viewport,
};

export { DEFAULT_AWARENESS_CONFIG };

/**
 * Awareness type from y-protocols
 * We use a minimal interface to avoid importing the full library
 * This interface is compatible with y-protocols/awareness.Awareness
 */
export interface Awareness {
  clientID: number;
  getLocalState(): Record<string, unknown> | null;
  setLocalState(state: Record<string, unknown> | null): void;
  getStates(): Map<number, Record<string, unknown>>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

/**
 * Event listener type for awareness events
 */
export type AwarenessEventListener = (event: AwarenessEvent) => void;

/**
 * Throttle function implementation
 */
function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay: number
): (...args: TArgs) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: TArgs) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, delay - timeSinceLastCall);
    }
  };
}

/**
 * AwarenessProtocol class manages user presence and collaboration state
 */
export class AwarenessProtocol {
  private awareness: Awareness;
  private config: AwarenessConfig;
  private _userId: string;

  private localState: AwarenessState;
  private remoteStates: Map<string, AwarenessState> = new Map();

  private eventListeners: Map<AwarenessEventType | '*', Set<AwarenessEventListener>> = new Map();
  private activityCheckInterval: ReturnType<typeof setInterval> | null = null;
  private staleCheckInterval: ReturnType<typeof setInterval> | null = null;

  // Throttled update functions
  private throttledCursorUpdate: (cursor: CursorPosition | null) => void;
  private throttledViewportUpdate: (viewport: Viewport | null) => void;

  constructor(
    awareness: Awareness,
    userId: string,
    userName: string,
    userColor: string,
    avatarUrl?: string,
    config: Partial<AwarenessConfig> = {}
  ) {
    this.awareness = awareness;
    this._userId = userId;
    this.config = { ...DEFAULT_AWARENESS_CONFIG, ...config };

    // Initialize local state
    const now = Date.now();
    this.localState = {
      userId,
      userName,
      userColor,
      avatarUrl,
      cursor: null,
      selectedNodeIds: [],
      viewport: null,
      activityStatus: 'active',
      lastActiveAt: now,
      isEditingNodeId: null,
      clientId: awareness.clientID,
      connectedAt: now,
    };

    // Set up throttled update functions
    this.throttledCursorUpdate = throttle<[CursorPosition | null]>(
      (cursor) => this._updateCursor(cursor),
      this.config.cursorThrottleMs
    );
    this.throttledViewportUpdate = throttle<[Viewport | null]>(
      (viewport) => this._updateViewport(viewport),
      this.config.viewportThrottleMs
    );

    // Initialize
    this._initialize();
  }

  /**
   * Initialize the awareness protocol
   */
  private _initialize(): void {
    // Set initial local state
    this._broadcastLocalState();

    // Listen for awareness changes
    this.awareness.on('update', (args: unknown) => {
      const update = args as { added: number[]; updated: number[]; removed: number[] };
      this._handleAwarenessUpdate(update);
    });

    // Start activity status checking
    this._startActivityCheck();

    // Start stale user cleanup
    this._startStaleCheck();

    // Sync initial remote states
    this._syncRemoteStates();
  }

  /**
   * Broadcast local state to all users
   */
  private _broadcastLocalState(): void {
    this.awareness.setLocalState(this.localState as unknown as Record<string, unknown>);
  }

  /**
   * Handle awareness updates from Yjs
   */
  private _handleAwarenessUpdate({
    added,
    updated,
    removed,
  }: {
    added: number[];
    updated: number[];
    removed: number[];
  }): void {
    const states = this.awareness.getStates();
    const now = Date.now();

    // Handle added users
    for (const clientId of added) {
      const state = states.get(clientId) as AwarenessState | undefined;
      if (state && state.userId !== this._userId) {
        const previousState = this.remoteStates.get(state.userId);
        this.remoteStates.set(state.userId, state);
        this._emitEvent({
          type: 'user-joined',
          userId: state.userId,
          state,
          previousState,
          timestamp: now,
        });
      }
    }

    // Handle updated users
    for (const clientId of updated) {
      const state = states.get(clientId) as AwarenessState | undefined;
      if (state && state.userId !== this._userId) {
        const previousState = this.remoteStates.get(state.userId);
        this.remoteStates.set(state.userId, state);

        // Emit specific event types based on what changed
        if (previousState) {
          this._emitChangeEvents(state, previousState, now);
        }

        this._emitEvent({
          type: 'user-updated',
          userId: state.userId,
          state,
          previousState,
          timestamp: now,
        });
      }
    }

    // Handle removed users
    for (const clientId of removed) {
      // Find the user by client ID
      for (const [userId, state] of this.remoteStates.entries()) {
        if (state.clientId === clientId) {
          this.remoteStates.delete(userId);
          this._emitEvent({
            type: 'user-left',
            userId,
            state,
            timestamp: now,
          });
          break;
        }
      }
    }
  }

  /**
   * Emit specific change events based on what changed
   */
  private _emitChangeEvents(
    state: AwarenessState,
    previousState: AwarenessState,
    timestamp: number
  ): void {
    // Cursor changed
    if (JSON.stringify(state.cursor) !== JSON.stringify(previousState.cursor)) {
      this._emitEvent({
        type: 'cursor-moved',
        userId: state.userId,
        state,
        previousState,
        timestamp,
      });
    }

    // Selection changed
    if (JSON.stringify(state.selectedNodeIds) !== JSON.stringify(previousState.selectedNodeIds)) {
      this._emitEvent({
        type: 'selection-changed',
        userId: state.userId,
        state,
        previousState,
        timestamp,
      });
    }

    // Viewport changed
    if (JSON.stringify(state.viewport) !== JSON.stringify(previousState.viewport)) {
      this._emitEvent({
        type: 'viewport-changed',
        userId: state.userId,
        state,
        previousState,
        timestamp,
      });
    }

    // Activity status changed
    if (state.activityStatus !== previousState.activityStatus) {
      this._emitEvent({
        type: 'activity-changed',
        userId: state.userId,
        state,
        previousState,
        timestamp,
      });
    }

    // Editing state changed
    if (state.isEditingNodeId !== previousState.isEditingNodeId) {
      if (state.isEditingNodeId && !previousState.isEditingNodeId) {
        this._emitEvent({
          type: 'editing-started',
          userId: state.userId,
          state,
          previousState,
          timestamp,
        });
      } else if (!state.isEditingNodeId && previousState.isEditingNodeId) {
        this._emitEvent({
          type: 'editing-stopped',
          userId: state.userId,
          state,
          previousState,
          timestamp,
        });
      }
    }
  }

  /**
   * Emit an awareness event
   */
  private _emitEvent(event: AwarenessEvent): void {
    // Emit to specific event type listeners
    const typeListeners = this.eventListeners.get(event.type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`[AwarenessProtocol] Error in event listener:`, error);
        }
      }
    }

    // Emit to wildcard listeners
    const wildcardListeners = this.eventListeners.get('*');
    if (wildcardListeners) {
      for (const listener of wildcardListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`[AwarenessProtocol] Error in wildcard listener:`, error);
        }
      }
    }
  }

  /**
   * Sync remote states from awareness
   */
  private _syncRemoteStates(): void {
    const states = this.awareness.getStates();
    const now = Date.now();

    states.forEach((state) => {
      const awarenessState = state as unknown as AwarenessState;
      if (awarenessState.userId && awarenessState.userId !== this._userId) {
        const previousState = this.remoteStates.get(awarenessState.userId);
        this.remoteStates.set(awarenessState.userId, awarenessState);

        if (!previousState) {
          this._emitEvent({
            type: 'user-joined',
            userId: awarenessState.userId,
            state: awarenessState,
            timestamp: now,
          });
        }
      }
    });
  }

  /**
   * Start activity status checking
   */
  private _startActivityCheck(): void {
    this.activityCheckInterval = setInterval(() => {
      this._updateActivityStatus();
    }, this.config.activityPollMs);
  }

  /**
   * Start stale user cleanup
   */
  private _startStaleCheck(): void {
    this.staleCheckInterval = setInterval(() => {
      this._cleanupStaleUsers();
    }, this.config.staleTimeoutMs / 2);
  }

  /**
   * Update activity status based on last activity time
   */
  private _updateActivityStatus(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.localState.lastActiveAt;

    let newStatus: ActivityStatus;
    if (timeSinceLastActivity < this.config.idleThresholdMs) {
      newStatus = 'active';
    } else if (timeSinceLastActivity < this.config.awayThresholdMs) {
      newStatus = 'idle';
    } else {
      newStatus = 'away';
    }

    if (newStatus !== this.localState.activityStatus) {
      this.localState.activityStatus = newStatus;
      this._broadcastLocalState();
    }
  }

  /**
   * Clean up stale users that haven't been heard from
   */
  private _cleanupStaleUsers(): void {
    const now = Date.now();

    for (const [userId, state] of this.remoteStates.entries()) {
      const timeSinceLastUpdate = now - state.lastActiveAt;
      if (timeSinceLastUpdate > this.config.staleTimeoutMs) {
        this.remoteStates.delete(userId);
        this._emitEvent({
          type: 'user-left',
          userId,
          state,
          timestamp: now,
        });
      }
    }
  }

  /**
   * Record user activity (call on any user interaction)
   */
  public recordActivity(): void {
    const now = Date.now();
    if (this.localState.activityStatus !== 'active' || now - this.localState.lastActiveAt > 1000) {
      this.localState.lastActiveAt = now;
      if (this.localState.activityStatus !== 'active') {
        this.localState.activityStatus = 'active';
        this._broadcastLocalState();
      }
    }
  }

  /**
   * Update cursor position (throttled)
   */
  public updateCursor(cursor: CursorPosition | null): void {
    this.recordActivity();
    this.throttledCursorUpdate(cursor);
  }

  /**
   * Internal cursor update (called by throttled function)
   */
  private _updateCursor(cursor: CursorPosition | null): void {
    this.localState.cursor = cursor;
    this._broadcastLocalState();
  }

  /**
   * Update selected nodes
   */
  public updateSelectedNodes(nodeIds: string[]): void {
    this.recordActivity();
    if (JSON.stringify(this.localState.selectedNodeIds) !== JSON.stringify(nodeIds)) {
      this.localState.selectedNodeIds = nodeIds;
      this._broadcastLocalState();
    }
  }

  /**
   * Update selected node (single selection convenience method)
   */
  public updateSelectedNode(nodeId: string | null): void {
    this.updateSelectedNodes(nodeId ? [nodeId] : []);
  }

  /**
   * Update viewport (throttled)
   */
  public updateViewport(viewport: Viewport | null): void {
    this.throttledViewportUpdate(viewport);
  }

  /**
   * Internal viewport update (called by throttled function)
   */
  private _updateViewport(viewport: Viewport | null): void {
    this.localState.viewport = viewport;
    this._broadcastLocalState();
  }

  /**
   * Set editing node
   */
  public setEditingNode(nodeId: string | null): void {
    this.recordActivity();
    if (this.localState.isEditingNodeId !== nodeId) {
      this.localState.isEditingNodeId = nodeId;
      this._broadcastLocalState();
    }
  }

  /**
   * Get local awareness state
   */
  public getLocalState(): AwarenessState {
    return { ...this.localState };
  }

  /**
   * Get all remote user states
   */
  public getRemoteStates(): AwarenessState[] {
    return Array.from(this.remoteStates.values());
  }

  /**
   * Get a specific user's state
   */
  public getUserState(userId: string): AwarenessState | undefined {
    if (userId === this._userId) {
      return this.getLocalState();
    }
    return this.remoteStates.get(userId);
  }

  /**
   * Get all states (including local user)
   */
  public getAllStates(): AwarenessState[] {
    return [this.getLocalState(), ...this.getRemoteStates()];
  }

  /**
   * Add event listener
   */
  public on(
    eventType: AwarenessEventType | '*',
    listener: AwarenessEventListener
  ): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(eventType)?.delete(listener);
    };
  }

  /**
   * Remove event listener
   */
  public off(
    eventType: AwarenessEventType | '*',
    listener: AwarenessEventListener
  ): void {
    this.eventListeners.get(eventType)?.delete(listener);
  }

  /**
   * Update user info (name, color, avatar)
   */
  public updateUserInfo(updates: {
    userName?: string;
    userColor?: string;
    avatarUrl?: string;
  }): void {
    if (updates.userName !== undefined) {
      this.localState.userName = updates.userName;
    }
    if (updates.userColor !== undefined) {
      this.localState.userColor = updates.userColor;
    }
    if (updates.avatarUrl !== undefined) {
      this.localState.avatarUrl = updates.avatarUrl;
    }
    this._broadcastLocalState();
  }

  /**
   * Destroy the awareness protocol instance
   */
  public destroy(): void {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
    if (this.staleCheckInterval) {
      clearInterval(this.staleCheckInterval);
      this.staleCheckInterval = null;
    }

    this.eventListeners.clear();
    this.remoteStates.clear();

    // Remove local state from awareness
    this.awareness.setLocalState(null);
  }
}

/**
 * Create an awareness protocol instance
 */
export function createAwarenessProtocol(
  awareness: Awareness,
  userId: string,
  userName: string,
  userColor: string,
  avatarUrl?: string,
  config?: Partial<AwarenessConfig>
): AwarenessProtocol {
  return new AwarenessProtocol(
    awareness,
    userId,
    userName,
    userColor,
    avatarUrl,
    config
  );
}

/**
 * Convert legacy awareness state format to new format
 * This helps with backwards compatibility
 */
export function convertLegacyState(legacyState: {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}): AwarenessState {
  const now = Date.now();
  return {
    userId: legacyState.id,
    userName: legacyState.name,
    userColor: legacyState.color,
    cursor: legacyState.cursor,
    selectedNodeIds: legacyState.selectedNodeId ? [legacyState.selectedNodeId] : [],
    viewport: null,
    activityStatus: 'active',
    lastActiveAt: now,
    isEditingNodeId: null,
    clientId: 0,
    connectedAt: now,
  };
}

/**
 * Convert new awareness state to legacy format for backwards compatibility
 */
export function convertToLegacyState(state: AwarenessState): {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
} {
  return {
    id: state.userId,
    name: state.userName,
    color: state.userColor,
    cursor: state.cursor ? { x: state.cursor.x, y: state.cursor.y } : null,
    selectedNodeId: state.selectedNodeIds[0] || null,
  };
}
