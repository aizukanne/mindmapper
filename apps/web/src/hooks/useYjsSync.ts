import { useEffect, useCallback, useRef, useState } from 'react';
import * as Y from 'yjs';
import { UndoManager } from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useMapStore, type MindMapNode, type MindMapEdge } from '@/stores/mapStore';
import {
  createYjsDoc,
  createWebsocketProvider,
  createOfflinePersistence,
  yjsMapToArray,
  getRandomPresenceColor,
  type YjsNodeData,
  type YjsConnectionData,
} from '@/lib/yjs-provider';
import type { NodeStyle, ConnectionStyle } from '@mindmapper/types';

interface UseYjsSyncOptions {
  mapId: string;
  userId?: string;
  userName?: string;
}

interface SyncState {
  isConnected: boolean;
  isSynced: boolean;
  isOffline: boolean;
}

interface UndoState {
  canUndo: boolean;
  canRedo: boolean;
}

const defaultNodeStyle: NodeStyle = {
  backgroundColor: '#ffffff',
  borderColor: '#d1d5db',
  borderWidth: 1,
  borderRadius: 8,
  textColor: '#1f2937',
  fontSize: 14,
  fontWeight: 'normal',
  fontStyle: 'normal',
  shape: 'rounded',
};

const defaultConnectionStyle: ConnectionStyle = {
  strokeColor: '#9ca3af',
  strokeWidth: 2,
  strokeStyle: 'solid',
  animated: false,
  pathType: 'bezier',
};

export function useYjsSync({ mapId, userId, userName }: UseYjsSyncOptions) {
  const { setNodes, setEdges } = useMapStore();
  const [syncState, setSyncState] = useState<SyncState>({
    isConnected: false,
    isSynced: false,
    isOffline: false,
  });
  const [undoState, setUndoState] = useState<UndoState>({
    canUndo: false,
    canRedo: false,
  });

  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const nodesMapRef = useRef<Y.Map<YjsNodeData> | null>(null);
  const connectionsMapRef = useRef<Y.Map<YjsConnectionData> | null>(null);
  const undoManagerRef = useRef<UndoManager | null>(null);

  // Convert Yjs data to React Flow format
  const syncFromYjs = useCallback(() => {
    if (!nodesMapRef.current || !connectionsMapRef.current) return;

    const yjsNodes = yjsMapToArray(nodesMapRef.current);
    const yjsConnections = yjsMapToArray(connectionsMapRef.current);

    // Convert to React Flow nodes
    const flowNodes = yjsNodes.map((node): MindMapNode => ({
      id: node.id,
      type: 'mindMapNode',
      position: { x: node.positionX, y: node.positionY },
      data: {
        id: node.id,
        text: node.text,
        type: node.type,
        parentId: node.parentId ?? null,
        style: node.style || defaultNodeStyle,
        isCollapsed: node.isCollapsed,
        metadata: node.metadata || {},
      },
      width: node.width,
      height: node.height,
    }));

    // Convert to React Flow edges
    const flowEdges: MindMapEdge[] = yjsConnections.map((conn) => ({
      id: conn.id,
      source: conn.sourceNodeId,
      target: conn.targetNodeId,
      type: 'smoothstep',
      data: { style: conn.style || defaultConnectionStyle },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [setNodes, setEdges]);

  // Initialize Yjs
  useEffect(() => {
    if (!mapId) return;

    const { doc, nodesMap, connectionsMap } = createYjsDoc(mapId);
    docRef.current = doc;
    nodesMapRef.current = nodesMap;
    connectionsMapRef.current = connectionsMap;

    // Create UndoManager for undo/redo support
    const undoManager = new UndoManager([nodesMap, connectionsMap], {
      trackedOrigins: new Set([doc.clientID]),
      captureTimeout: 500, // Group changes within 500ms into single undo step
    });
    undoManagerRef.current = undoManager;

    // Update undo state when stack changes
    const updateUndoState = () => {
      setUndoState({
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo(),
      });
    };

    undoManager.on('stack-item-added', updateUndoState);
    undoManager.on('stack-item-popped', updateUndoState);
    undoManager.on('stack-cleared', updateUndoState);

    // Create offline persistence
    const persistence = createOfflinePersistence(mapId, doc);
    persistenceRef.current = persistence;

    // Create WebSocket provider
    const provider = createWebsocketProvider(mapId, doc);
    providerRef.current = provider;

    // Set up awareness (presence)
    if (userId) {
      provider.awareness.setLocalState({
        id: userId,
        name: userName || 'Anonymous',
        color: getRandomPresenceColor(),
        cursor: null,
        selectedNodeId: null,
      });
    }

    // Listen for connection status
    provider.on('status', (event: { status: string }) => {
      setSyncState((prev) => ({
        ...prev,
        isConnected: event.status === 'connected',
        isOffline: event.status === 'disconnected',
      }));
    });

    provider.on('sync', (isSynced: boolean) => {
      setSyncState((prev) => ({ ...prev, isSynced }));
      if (isSynced) {
        syncFromYjs();
      }
    });

    // Listen for Yjs changes
    const nodesObserver = () => {
      syncFromYjs();
    };

    const connectionsObserver = () => {
      syncFromYjs();
    };

    nodesMap.observe(nodesObserver);
    connectionsMap.observe(connectionsObserver);

    // Initial sync when persistence is ready
    persistence.on('synced', () => {
      syncFromYjs();
    });

    return () => {
      nodesMap.unobserve(nodesObserver);
      connectionsMap.unobserve(connectionsObserver);
      undoManager.destroy();
      provider.disconnect();
      provider.destroy();
      persistence.destroy();
      doc.destroy();
    };
  }, [mapId, userId, userName, syncFromYjs]);

  // Sync local changes to Yjs
  const syncNodeToYjs = useCallback((node: MindMapNode) => {
    if (!nodesMapRef.current) return;

    const yjsNode: YjsNodeData = {
      id: node.id,
      text: node.data.text,
      type: node.data.type,
      parentId: node.data.parentId || null,
      positionX: node.position.x,
      positionY: node.position.y,
      width: node.width || 150,
      height: node.height || 50,
      style: node.data.style,
      isCollapsed: node.data.isCollapsed,
      metadata: node.data.metadata,
      sortOrder: 0,
    };

    nodesMapRef.current.set(node.id, yjsNode);
  }, []);

  const syncConnectionToYjs = useCallback((edge: MindMapEdge) => {
    if (!connectionsMapRef.current) return;

    const yjsConnection: YjsConnectionData = {
      id: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      type: 'HIERARCHICAL',
      label: null,
      style: edge.data?.style || defaultConnectionStyle,
    };

    connectionsMapRef.current.set(edge.id, yjsConnection);
  }, []);

  const deleteNodeFromYjs = useCallback((nodeId: string) => {
    if (!nodesMapRef.current) return;
    nodesMapRef.current.delete(nodeId);
  }, []);

  const deleteConnectionFromYjs = useCallback((edgeId: string) => {
    if (!connectionsMapRef.current) return;
    connectionsMapRef.current.delete(edgeId);
  }, []);

  // Update cursor position in awareness
  const updateCursor = useCallback((x: number, y: number) => {
    if (!providerRef.current) return;

    const currentState = providerRef.current.awareness.getLocalState();
    providerRef.current.awareness.setLocalState({
      ...currentState,
      cursor: { x, y },
    });
  }, []);

  // Update selected node in awareness
  const updateSelectedNode = useCallback((nodeId: string | null) => {
    if (!providerRef.current) return;

    const currentState = providerRef.current.awareness.getLocalState();
    providerRef.current.awareness.setLocalState({
      ...currentState,
      selectedNodeId: nodeId,
    });
  }, []);

  // Get awareness states (other users)
  const getAwarenessStates = useCallback(() => {
    if (!providerRef.current) return [];

    const states: Array<{
      id: string;
      name: string;
      color: string;
      cursor: { x: number; y: number } | null;
      selectedNodeId: string | null;
    }> = [];

    providerRef.current.awareness.getStates().forEach((state, clientId) => {
      if (clientId !== providerRef.current?.awareness.clientID && state) {
        states.push(state as any);
      }
    });

    return states;
  }, []);

  // Undo operation
  const undo = useCallback(() => {
    if (!undoManagerRef.current) return;
    undoManagerRef.current.undo();
  }, []);

  // Redo operation
  const redo = useCallback(() => {
    if (!undoManagerRef.current) return;
    undoManagerRef.current.redo();
  }, []);

  // Clear undo/redo history
  const clearHistory = useCallback(() => {
    if (!undoManagerRef.current) return;
    undoManagerRef.current.clear();
  }, []);

  // Stop capturing (finalize current undo step)
  const stopCapturing = useCallback(() => {
    if (!undoManagerRef.current) return;
    undoManagerRef.current.stopCapturing();
  }, []);

  return {
    syncState,
    undoState,
    syncNodeToYjs,
    syncConnectionToYjs,
    deleteNodeFromYjs,
    deleteConnectionFromYjs,
    updateCursor,
    updateSelectedNode,
    getAwarenessStates,
    undo,
    redo,
    clearHistory,
    stopCapturing,
    awareness: providerRef.current?.awareness,
  };
}
