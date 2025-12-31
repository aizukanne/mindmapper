import { useEffect, useState, useCallback, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useYjsSync } from './useYjsSync';
import { getRandomPresenceColor } from '@/lib/yjs-provider';

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}

interface UsePresenceOptions {
  mapId: string;
  enabled?: boolean;
}

interface UsePresenceReturn {
  awarenessStates: PresenceUser[];
  currentUser: PresenceUser | null;
  updateCursor: (x: number, y: number) => void;
  updateSelectedNode: (nodeId: string | null) => void;
  isConnected: boolean;
  isSynced: boolean;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function usePresence({ mapId, enabled = true }: UsePresenceOptions): UsePresenceReturn {
  const { user, isLoaded } = useUser();
  const [awarenessStates, setAwarenessStates] = useState<PresenceUser[]>([]);
  const colorRef = useRef<string>(getRandomPresenceColor());

  const userId = user?.id || 'anonymous';
  const userName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Anonymous';

  const {
    syncState,
    undoState,
    updateCursor: yjsUpdateCursor,
    updateSelectedNode: yjsUpdateSelectedNode,
    getAwarenessStates,
    undo,
    redo,
  } = useYjsSync({
    mapId: enabled ? mapId : '',
    userId,
    userName,
  });

  const currentUser: PresenceUser | null = isLoaded && user ? {
    id: userId,
    name: userName,
    color: colorRef.current,
    cursor: null,
    selectedNodeId: null,
  } : null;

  // Poll for awareness state updates
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const states = getAwarenessStates();
      setAwarenessStates(states);
    }, 100);

    return () => clearInterval(interval);
  }, [enabled, getAwarenessStates]);

  // Throttled cursor update
  const lastCursorUpdate = useRef<number>(0);
  const updateCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorUpdate.current < 50) return;
    lastCursorUpdate.current = now;
    yjsUpdateCursor(x, y);
  }, [yjsUpdateCursor]);

  const updateSelectedNode = useCallback((nodeId: string | null) => {
    yjsUpdateSelectedNode(nodeId);
  }, [yjsUpdateSelectedNode]);

  return {
    awarenessStates,
    currentUser,
    updateCursor,
    updateSelectedNode,
    isConnected: syncState.isConnected,
    isSynced: syncState.isSynced,
    undo,
    redo,
    canUndo: undoState.canUndo,
    canRedo: undoState.canRedo,
  };
}
