import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useYjsSync } from './useYjsSync';
import { getRandomPresenceColor, type OfflineSyncState } from '@/lib/yjs-provider';
import {
  AwarenessProtocol,
  createAwarenessProtocol,
  convertToLegacyState,
  type AwarenessState,
  type AwarenessEvent,
  type CursorPosition,
  type Viewport,
  type ActivityStatus,
} from '@/lib/awareness-protocol';

// Re-export types for external use
export type { AwarenessState, CursorPosition, Viewport, ActivityStatus };

/**
 * Legacy presence user format for backwards compatibility
 */
export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}

/**
 * Enhanced presence user with full awareness state
 */
export interface EnhancedPresenceUser {
  userId: string;
  userName: string;
  userColor: string;
  avatarUrl?: string;
  cursor: CursorPosition | null;
  selectedNodeIds: string[];
  viewport: Viewport | null;
  activityStatus: ActivityStatus;
  lastActiveAt: number;
  isEditingNodeId: string | null;
  clientId: number;
  connectedAt: number;
}

interface UsePresenceOptions {
  mapId: string;
  enabled?: boolean;
}

interface UsePresenceReturn {
  // Legacy format (backwards compatibility)
  awarenessStates: PresenceUser[];
  currentUser: PresenceUser | null;

  // Enhanced format with full awareness data
  enhancedStates: EnhancedPresenceUser[];
  enhancedCurrentUser: EnhancedPresenceUser | null;

  // Update functions
  updateCursor: (x: number, y: number, canvasX?: number, canvasY?: number) => void;
  updateSelectedNode: (nodeId: string | null) => void;
  updateSelectedNodes: (nodeIds: string[]) => void;
  updateViewport: (viewport: Viewport | null) => void;
  setEditingNode: (nodeId: string | null) => void;
  recordActivity: () => void;

  // Connection state
  isConnected: boolean;
  isSynced: boolean;
  isOffline: boolean;
  offlineSync: OfflineSyncState | null;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Event subscription
  onAwarenessEvent: (
    eventType: 'user-joined' | 'user-left' | 'user-updated' | 'cursor-moved' |
               'selection-changed' | 'viewport-changed' | 'activity-changed' |
               'editing-started' | 'editing-stopped' | '*',
    listener: (event: AwarenessEvent) => void
  ) => () => void;
}

export function usePresence({ mapId, enabled = true }: UsePresenceOptions): UsePresenceReturn {
  const { user, isLoaded } = useUser();

  // State for awareness
  const [awarenessStates, setAwarenessStates] = useState<PresenceUser[]>([]);
  const [enhancedStates, setEnhancedStates] = useState<EnhancedPresenceUser[]>([]);

  // Refs for stable values
  const colorRef = useRef<string>(getRandomPresenceColor());
  const awarenessProtocolRef = useRef<AwarenessProtocol | null>(null);

  const userId = user?.id || 'anonymous';
  const userName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Anonymous';
  const avatarUrl = user?.imageUrl;

  const {
    syncState,
    undoState,
    updateCursor: yjsUpdateCursor,
    updateSelectedNode: yjsUpdateSelectedNode,
    getAwarenessStates,
    undo,
    redo,
    awareness,
  } = useYjsSync({
    mapId: enabled ? mapId : '',
    userId,
    userName,
  });

  // Initialize awareness protocol when awareness is available
  useEffect(() => {
    if (!enabled || !awareness) return;

    const protocol = createAwarenessProtocol(
      awareness,
      userId,
      userName,
      colorRef.current,
      avatarUrl
    );

    awarenessProtocolRef.current = protocol;

    // Subscribe to all events to update states
    const unsubscribe = protocol.on('*', () => {
      // Update enhanced states
      const remote = protocol.getRemoteStates();
      setEnhancedStates(remote);

      // Convert to legacy format for backwards compatibility
      const legacyStates = remote.map(convertToLegacyState);
      setAwarenessStates(legacyStates);
    });

    // Initial state sync
    const remote = protocol.getRemoteStates();
    setEnhancedStates(remote);
    setAwarenessStates(remote.map(convertToLegacyState));

    return () => {
      unsubscribe();
      protocol.destroy();
      awarenessProtocolRef.current = null;
    };
  }, [enabled, awareness, userId, userName, avatarUrl]);

  // Also poll for awareness states (fallback for when events might be missed)
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      if (awarenessProtocolRef.current) {
        const remote = awarenessProtocolRef.current.getRemoteStates();
        setEnhancedStates(remote);
        setAwarenessStates(remote.map(convertToLegacyState));
      } else {
        // Fallback to legacy method
        const states = getAwarenessStates();
        setAwarenessStates(states);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [enabled, getAwarenessStates]);

  // Current user states
  const currentUser: PresenceUser | null = useMemo(() => {
    if (!isLoaded || !user) return null;
    return {
      id: userId,
      name: userName,
      color: colorRef.current,
      cursor: null,
      selectedNodeId: null,
    };
  }, [isLoaded, user, userId, userName]);

  const enhancedCurrentUser: EnhancedPresenceUser | null = useMemo(() => {
    if (!awarenessProtocolRef.current) return null;
    const state = awarenessProtocolRef.current.getLocalState();
    return state;
  }, [awarenessStates]); // Re-compute when states change

  // Throttled cursor update
  const lastCursorUpdate = useRef<number>(0);
  const updateCursor = useCallback(
    (x: number, y: number, canvasX?: number, canvasY?: number) => {
      const now = Date.now();
      if (now - lastCursorUpdate.current < 50) return;
      lastCursorUpdate.current = now;

      if (awarenessProtocolRef.current) {
        awarenessProtocolRef.current.updateCursor({
          x,
          y,
          canvasX,
          canvasY,
        });
      } else {
        // Fallback to legacy
        yjsUpdateCursor(x, y);
      }
    },
    [yjsUpdateCursor]
  );

  // Update selected node
  const updateSelectedNode = useCallback(
    (nodeId: string | null) => {
      if (awarenessProtocolRef.current) {
        awarenessProtocolRef.current.updateSelectedNode(nodeId);
      } else {
        // Fallback to legacy
        yjsUpdateSelectedNode(nodeId);
      }
    },
    [yjsUpdateSelectedNode]
  );

  // Update multiple selected nodes
  const updateSelectedNodes = useCallback((nodeIds: string[]) => {
    if (awarenessProtocolRef.current) {
      awarenessProtocolRef.current.updateSelectedNodes(nodeIds);
    }
  }, []);

  // Update viewport
  const updateViewport = useCallback((viewport: Viewport | null) => {
    if (awarenessProtocolRef.current) {
      awarenessProtocolRef.current.updateViewport(viewport);
    }
  }, []);

  // Set editing node
  const setEditingNode = useCallback((nodeId: string | null) => {
    if (awarenessProtocolRef.current) {
      awarenessProtocolRef.current.setEditingNode(nodeId);
    }
  }, []);

  // Record activity
  const recordActivity = useCallback(() => {
    if (awarenessProtocolRef.current) {
      awarenessProtocolRef.current.recordActivity();
    }
  }, []);

  // Event subscription
  const onAwarenessEvent = useCallback(
    (
      eventType: Parameters<AwarenessProtocol['on']>[0],
      listener: (event: AwarenessEvent) => void
    ) => {
      if (awarenessProtocolRef.current) {
        return awarenessProtocolRef.current.on(eventType, listener);
      }
      // Return no-op unsubscribe if protocol not available
      return () => {};
    },
    []
  );

  return {
    // Legacy format
    awarenessStates,
    currentUser,

    // Enhanced format
    enhancedStates,
    enhancedCurrentUser,

    // Update functions
    updateCursor,
    updateSelectedNode,
    updateSelectedNodes,
    updateViewport,
    setEditingNode,
    recordActivity,

    // Connection state
    isConnected: syncState.isConnected,
    isSynced: syncState.isSynced,
    isOffline: syncState.isOffline,
    offlineSync: syncState.offlineSync,

    // Undo/redo
    undo,
    redo,
    canUndo: undoState.canUndo,
    canRedo: undoState.canRedo,

    // Event subscription
    onAwarenessEvent,
  };
}
