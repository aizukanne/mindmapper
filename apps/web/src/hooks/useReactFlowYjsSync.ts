import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import * as Y from 'yjs';
import { UndoManager } from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import {
  type NodeChange,
  type EdgeChange,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import { useMapStore, type MindMapNode, type MindMapEdge } from '@/stores/mapStore';
import {
  createYjsDoc,
  createWebsocketProvider,
  createEnhancedOfflinePersistence,
  yjsMapToArray,
  getRandomPresenceColor,
  type YjsNodeData,
  type YjsConnectionData,
  type OfflineSyncState,
  type OfflineSyncManager,
} from '@/lib/yjs-provider';
import {
  validateConnection,
  DEFAULT_CONNECTION_RULES,
} from '@/lib/connection-validation';
import type { NodeStyle, ConnectionStyle } from '@mindmapper/types';

// ============================================================================
// Types
// ============================================================================

export interface UseReactFlowYjsSyncOptions {
  /** The map ID to sync with */
  mapId: string;
  /** User ID for presence tracking */
  userId?: string;
  /** Display name for presence tracking */
  userName?: string;
  /** Whether sync is enabled (default: true) */
  enabled?: boolean;
  /** Debounce delay for position updates in ms (default: 100) */
  positionDebounceMs?: number;
}

export interface SyncState {
  /** Whether connected to WebSocket server */
  isConnected: boolean;
  /** Whether Yjs document is synced with server */
  isSynced: boolean;
  /** Whether currently offline */
  isOffline: boolean;
  /** Offline sync state details */
  offlineSync: OfflineSyncState | null;
}

export interface UndoState {
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
}

export interface PresenceState {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}

export interface UseReactFlowYjsSyncReturn {
  // React Flow handlers (enhanced with Yjs sync)
  onNodesChange: OnNodesChange<MindMapNode>;
  onEdgesChange: OnEdgesChange<MindMapEdge>;
  onConnect: OnConnect;

  // Sync state
  syncState: SyncState;
  undoState: UndoState;

  // Presence/awareness
  awarenessStates: PresenceState[];
  updateCursor: (x: number, y: number) => void;
  updateSelectedNode: (nodeId: string | null) => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  stopCapturing: () => void;

  // Manual sync operations
  syncNodeToYjs: (node: MindMapNode) => void;
  syncConnectionToYjs: (edge: MindMapEdge) => void;
  deleteNodeFromYjs: (nodeId: string) => void;
  deleteConnectionFromYjs: (edgeId: string) => void;

  // State
  isReady: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const defaultNodeStyle: NodeStyle = {
  backgroundColor: '#ffffff',
  borderColor: '#d1d5db',
  borderWidth: 1,
  borderRadius: 8,
  borderStyle: 'solid',
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

// Unique origin for tracking changes from React Flow vs Yjs
const REACT_FLOW_ORIGIN = 'react-flow-sync';

// ============================================================================
// Hook Implementation
// ============================================================================

export function useReactFlowYjsSync({
  mapId,
  userId,
  userName,
  enabled = true,
  positionDebounceMs = 100,
}: UseReactFlowYjsSyncOptions): UseReactFlowYjsSyncReturn {
  // Store access
  const { setNodes, setEdges } = useMapStore();

  // State
  const [syncState, setSyncState] = useState<SyncState>({
    isConnected: false,
    isSynced: false,
    isOffline: false,
    offlineSync: null,
  });
  const [undoState, setUndoState] = useState<UndoState>({
    canUndo: false,
    canRedo: false,
  });
  const [awarenessStates, setAwarenessStates] = useState<PresenceState[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Refs for Yjs instances
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const syncManagerRef = useRef<OfflineSyncManager | null>(null);
  const nodesMapRef = useRef<Y.Map<YjsNodeData> | null>(null);
  const connectionsMapRef = useRef<Y.Map<YjsConnectionData> | null>(null);
  const undoManagerRef = useRef<UndoManager | null>(null);

  // Refs for preventing infinite loops
  const isUpdatingFromYjsRef = useRef(false);
  const isUpdatingFromReactFlowRef = useRef(false);
  const lastUpdateSourceRef = useRef<'yjs' | 'react-flow' | null>(null);

  // Position debouncing refs
  const positionUpdateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingPositionUpdatesRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // ============================================================================
  // Yjs -> React Flow Sync
  // ============================================================================

  /**
   * Converts Yjs data to React Flow format and updates the store.
   * Guards against triggering when we're already updating from React Flow.
   */
  const syncFromYjs = useCallback(() => {
    if (!nodesMapRef.current || !connectionsMapRef.current) return;

    // Prevent infinite loops: don't sync if we're updating from React Flow
    if (isUpdatingFromReactFlowRef.current) {
      return;
    }

    isUpdatingFromYjsRef.current = true;
    lastUpdateSourceRef.current = 'yjs';

    try {
      const yjsNodes = yjsMapToArray(nodesMapRef.current);
      const yjsConnections = yjsMapToArray(connectionsMapRef.current);

      // Convert to React Flow nodes
      const flowNodes: MindMapNode[] = yjsNodes.map((node) => ({
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
    } finally {
      // Use setTimeout to prevent race conditions with React state updates
      setTimeout(() => {
        isUpdatingFromYjsRef.current = false;
      }, 0);
    }
  }, [setNodes, setEdges]);

  // ============================================================================
  // React Flow -> Yjs Sync
  // ============================================================================

  /**
   * Syncs a single node to Yjs document.
   * Guards against triggering when we're already updating from Yjs.
   */
  const syncNodeToYjs = useCallback((node: MindMapNode) => {
    if (!nodesMapRef.current || !docRef.current) return;

    // Prevent infinite loops: don't sync if we're updating from Yjs
    if (isUpdatingFromYjsRef.current) {
      return;
    }

    isUpdatingFromReactFlowRef.current = true;
    lastUpdateSourceRef.current = 'react-flow';

    try {
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

      // Use transaction with origin to track source
      docRef.current.transact(() => {
        nodesMapRef.current!.set(node.id, yjsNode);
      }, REACT_FLOW_ORIGIN);
    } finally {
      setTimeout(() => {
        isUpdatingFromReactFlowRef.current = false;
      }, 0);
    }
  }, []);

  /**
   * Syncs a single edge/connection to Yjs document.
   */
  const syncConnectionToYjs = useCallback((edge: MindMapEdge) => {
    if (!connectionsMapRef.current || !docRef.current) return;

    if (isUpdatingFromYjsRef.current) {
      return;
    }

    isUpdatingFromReactFlowRef.current = true;
    lastUpdateSourceRef.current = 'react-flow';

    try {
      const yjsConnection: YjsConnectionData = {
        id: edge.id,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        type: 'HIERARCHICAL',
        label: null,
        style: edge.data?.style || defaultConnectionStyle,
      };

      docRef.current.transact(() => {
        connectionsMapRef.current!.set(edge.id, yjsConnection);
      }, REACT_FLOW_ORIGIN);
    } finally {
      setTimeout(() => {
        isUpdatingFromReactFlowRef.current = false;
      }, 0);
    }
  }, []);

  /**
   * Deletes a node from Yjs document.
   */
  const deleteNodeFromYjs = useCallback((nodeId: string) => {
    if (!nodesMapRef.current || !docRef.current) return;

    if (isUpdatingFromYjsRef.current) {
      return;
    }

    isUpdatingFromReactFlowRef.current = true;

    try {
      docRef.current.transact(() => {
        nodesMapRef.current!.delete(nodeId);
      }, REACT_FLOW_ORIGIN);
    } finally {
      setTimeout(() => {
        isUpdatingFromReactFlowRef.current = false;
      }, 0);
    }
  }, []);

  /**
   * Deletes an edge/connection from Yjs document.
   */
  const deleteConnectionFromYjs = useCallback((edgeId: string) => {
    if (!connectionsMapRef.current || !docRef.current) return;

    if (isUpdatingFromYjsRef.current) {
      return;
    }

    isUpdatingFromReactFlowRef.current = true;

    try {
      docRef.current.transact(() => {
        connectionsMapRef.current!.delete(edgeId);
      }, REACT_FLOW_ORIGIN);
    } finally {
      setTimeout(() => {
        isUpdatingFromReactFlowRef.current = false;
      }, 0);
    }
  }, []);

  /**
   * Debounced position update to Yjs.
   * Prevents flooding Yjs with updates during drag operations.
   */
  const debouncedPositionUpdate = useCallback((nodeId: string, x: number, y: number) => {
    // Store the pending update
    pendingPositionUpdatesRef.current.set(nodeId, { x, y });

    // Clear existing timer for this node
    const existingTimer = positionUpdateTimersRef.current.get(nodeId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      const pendingPosition = pendingPositionUpdatesRef.current.get(nodeId);
      if (pendingPosition && nodesMapRef.current && docRef.current) {
        const existingNode = nodesMapRef.current.get(nodeId);
        if (existingNode) {
          isUpdatingFromReactFlowRef.current = true;
          try {
            docRef.current.transact(() => {
              nodesMapRef.current!.set(nodeId, {
                ...existingNode,
                positionX: pendingPosition.x,
                positionY: pendingPosition.y,
              });
            }, REACT_FLOW_ORIGIN);
          } finally {
            setTimeout(() => {
              isUpdatingFromReactFlowRef.current = false;
            }, 0);
          }
        }
      }
      pendingPositionUpdatesRef.current.delete(nodeId);
      positionUpdateTimersRef.current.delete(nodeId);
    }, positionDebounceMs);

    positionUpdateTimersRef.current.set(nodeId, timer);
  }, [positionDebounceMs]);

  // ============================================================================
  // Enhanced React Flow Handlers
  // ============================================================================

  /**
   * Enhanced onNodesChange handler that syncs changes to Yjs.
   */
  const onNodesChange: OnNodesChange<MindMapNode> = useCallback((changes: NodeChange<MindMapNode>[]) => {
    // Skip if we're updating from Yjs (to prevent infinite loops)
    if (isUpdatingFromYjsRef.current) {
      return;
    }

    // Apply changes to local state first
    const currentNodes = useMapStore.getState().nodes;
    const newNodes = applyNodeChanges(changes, currentNodes) as MindMapNode[];
    setNodes(newNodes);

    // Then sync relevant changes to Yjs
    if (!nodesMapRef.current || !docRef.current) return;

    isUpdatingFromReactFlowRef.current = true;
    lastUpdateSourceRef.current = 'react-flow';

    try {
      for (const change of changes) {
        switch (change.type) {
          case 'position': {
            // Handle position changes with debouncing
            if (change.position && change.id) {
              debouncedPositionUpdate(change.id, change.position.x, change.position.y);
            }
            break;
          }
          case 'dimensions': {
            // Sync dimension changes immediately
            if (change.dimensions && change.id) {
              const existingNode = nodesMapRef.current.get(change.id);
              if (existingNode) {
                docRef.current.transact(() => {
                  nodesMapRef.current!.set(change.id, {
                    ...existingNode,
                    width: change.dimensions!.width,
                    height: change.dimensions!.height,
                  });
                }, REACT_FLOW_ORIGIN);
              }
            }
            break;
          }
          case 'remove': {
            // Sync removal
            if (change.id) {
              deleteNodeFromYjs(change.id);
            }
            break;
          }
          case 'add': {
            // Sync additions
            if (change.item) {
              syncNodeToYjs(change.item);
            }
            break;
          }
          // 'select' and 'reset' don't need Yjs sync
        }
      }
    } finally {
      setTimeout(() => {
        isUpdatingFromReactFlowRef.current = false;
      }, 0);
    }
  }, [setNodes, debouncedPositionUpdate, deleteNodeFromYjs, syncNodeToYjs]);

  /**
   * Enhanced onEdgesChange handler that syncs changes to Yjs.
   */
  const onEdgesChange: OnEdgesChange<MindMapEdge> = useCallback((changes: EdgeChange<MindMapEdge>[]) => {
    // Skip if we're updating from Yjs (to prevent infinite loops)
    if (isUpdatingFromYjsRef.current) {
      return;
    }

    // Apply changes to local state first
    const currentEdges = useMapStore.getState().edges;
    const newEdges = applyEdgeChanges(changes, currentEdges) as MindMapEdge[];
    setEdges(newEdges);

    // Then sync relevant changes to Yjs
    if (!connectionsMapRef.current || !docRef.current) return;

    isUpdatingFromReactFlowRef.current = true;
    lastUpdateSourceRef.current = 'react-flow';

    try {
      for (const change of changes) {
        switch (change.type) {
          case 'remove': {
            if (change.id) {
              deleteConnectionFromYjs(change.id);
            }
            break;
          }
          case 'add': {
            if (change.item) {
              syncConnectionToYjs(change.item);
            }
            break;
          }
          // 'select' and 'reset' don't need Yjs sync
        }
      }
    } finally {
      setTimeout(() => {
        isUpdatingFromReactFlowRef.current = false;
      }, 0);
    }
  }, [setEdges, deleteConnectionFromYjs, syncConnectionToYjs]);

  /**
   * Enhanced onConnect handler that validates connections and syncs to Yjs.
   */
  const onConnect: OnConnect = useCallback((connection: Connection) => {
    // Skip if we're updating from Yjs (to prevent infinite loops)
    if (isUpdatingFromYjsRef.current) {
      return;
    }

    const { nodes: currentNodes, edges: currentEdges } = useMapStore.getState();

    // Validate the connection
    const validation = validateConnection(connection, currentNodes, currentEdges, DEFAULT_CONNECTION_RULES);
    if (!validation.isValid) {
      useMapStore.setState({ lastConnectionError: validation.reason || 'Invalid connection' });
      setTimeout(() => {
        useMapStore.setState({ lastConnectionError: null });
      }, 3000);
      return;
    }

    // Clear any previous error
    useMapStore.setState({ lastConnectionError: null });

    // Create the new edge
    const newEdge: MindMapEdge = {
      id: `edge-${connection.source}-${connection.target}`,
      source: connection.source!,
      target: connection.target!,
      type: 'smoothstep',
      data: { style: defaultConnectionStyle },
    };

    // Update local state
    const newEdges = addEdge(newEdge, currentEdges) as MindMapEdge[];
    setEdges(newEdges);

    // Sync to Yjs
    syncConnectionToYjs(newEdge);
  }, [setEdges, syncConnectionToYjs]);

  // ============================================================================
  // Presence/Awareness
  // ============================================================================

  const updateCursor = useCallback((x: number, y: number) => {
    if (!providerRef.current) return;

    const currentState = providerRef.current.awareness.getLocalState();
    providerRef.current.awareness.setLocalState({
      ...currentState,
      cursor: { x, y },
    });
  }, []);

  const updateSelectedNode = useCallback((nodeId: string | null) => {
    if (!providerRef.current) return;

    const currentState = providerRef.current.awareness.getLocalState();
    providerRef.current.awareness.setLocalState({
      ...currentState,
      selectedNodeId: nodeId,
    });
  }, []);

  // ============================================================================
  // Undo/Redo
  // ============================================================================

  const undo = useCallback(() => {
    if (!undoManagerRef.current) return;
    undoManagerRef.current.undo();
  }, []);

  const redo = useCallback(() => {
    if (!undoManagerRef.current) return;
    undoManagerRef.current.redo();
  }, []);

  const clearHistory = useCallback(() => {
    if (!undoManagerRef.current) return;
    undoManagerRef.current.clear();
  }, []);

  const stopCapturing = useCallback(() => {
    if (!undoManagerRef.current) return;
    undoManagerRef.current.stopCapturing();
  }, []);

  // ============================================================================
  // Initialization Effect
  // ============================================================================

  useEffect(() => {
    if (!mapId || !enabled) return;

    // Create Yjs document
    const { doc, nodesMap, connectionsMap } = createYjsDoc(mapId);
    docRef.current = doc;
    nodesMapRef.current = nodesMap;
    connectionsMapRef.current = connectionsMap;

    // Create UndoManager with origin tracking
    const undoManager = new UndoManager([nodesMap, connectionsMap], {
      trackedOrigins: new Set([doc.clientID, REACT_FLOW_ORIGIN]),
      captureTimeout: 500,
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

    // Create enhanced offline persistence
    const { persistence, syncManager } = createEnhancedOfflinePersistence(mapId, doc, {
      onStatusChange: (state) => {
        setSyncState((prev) => ({ ...prev, offlineSync: state }));
      },
      onSyncComplete: () => {
        console.log('[useReactFlowYjsSync] Offline changes synced successfully');
      },
      onSyncError: (error) => {
        console.error('[useReactFlowYjsSync] Sync error:', error);
      },
      onOfflineChangesQueued: (count) => {
        console.log(`[useReactFlowYjsSync] ${count} changes queued for sync`);
      },
    });
    persistenceRef.current = persistence;
    syncManagerRef.current = syncManager;

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

    // Connection status listener
    provider.on('status', (event: { status: string }) => {
      const isConnected = event.status === 'connected';
      const isOffline = event.status === 'disconnected';

      syncManager.setConnected(isConnected);

      setSyncState((prev) => ({
        ...prev,
        isConnected,
        isOffline,
      }));
    });

    // Sync status listener
    provider.on('sync', (isSynced: boolean) => {
      setSyncState((prev) => ({ ...prev, isSynced }));
      if (isSynced) {
        syncFromYjs();
        syncManager.checkAndSync();
        setIsReady(true);
      }
    });

    // Yjs data change observers
    const nodesObserver = (_event: Y.YMapEvent<YjsNodeData>, transaction: Y.Transaction) => {
      // Only sync from Yjs if the change didn't originate from React Flow
      if (transaction.origin !== REACT_FLOW_ORIGIN) {
        syncFromYjs();
      }
    };

    const connectionsObserver = (_event: Y.YMapEvent<YjsConnectionData>, transaction: Y.Transaction) => {
      if (transaction.origin !== REACT_FLOW_ORIGIN) {
        syncFromYjs();
      }
    };

    nodesMap.observe(nodesObserver);
    connectionsMap.observe(connectionsObserver);

    // Awareness change listener for presence updates
    const awarenessChangeHandler = () => {
      const states: PresenceState[] = [];
      provider.awareness.getStates().forEach((state, clientId) => {
        if (clientId !== provider.awareness.clientID && state) {
          states.push(state as PresenceState);
        }
      });
      setAwarenessStates(states);
    };

    provider.awareness.on('change', awarenessChangeHandler);

    // Initial sync when persistence is ready
    persistence.on('synced', () => {
      syncFromYjs();
      setIsReady(true);
    });

    // Cleanup
    return () => {
      // Clear all position update timers
      positionUpdateTimersRef.current.forEach((timer) => clearTimeout(timer));
      positionUpdateTimersRef.current.clear();
      pendingPositionUpdatesRef.current.clear();

      // Clean up Yjs
      nodesMap.unobserve(nodesObserver);
      connectionsMap.unobserve(connectionsObserver);
      provider.awareness.off('change', awarenessChangeHandler);
      undoManager.destroy();
      provider.disconnect();
      provider.destroy();
      syncManager.destroy();
      doc.destroy();

      // Reset state
      setIsReady(false);
      setSyncState({
        isConnected: false,
        isSynced: false,
        isOffline: false,
        offlineSync: null,
      });
    };
  }, [mapId, userId, userName, enabled, syncFromYjs]);

  // ============================================================================
  // Return Value
  // ============================================================================

  return useMemo(() => ({
    // Enhanced React Flow handlers
    onNodesChange,
    onEdgesChange,
    onConnect,

    // Sync state
    syncState,
    undoState,

    // Presence/awareness
    awarenessStates,
    updateCursor,
    updateSelectedNode,

    // Undo/redo
    undo,
    redo,
    clearHistory,
    stopCapturing,

    // Manual sync operations
    syncNodeToYjs,
    syncConnectionToYjs,
    deleteNodeFromYjs,
    deleteConnectionFromYjs,

    // State
    isReady,
  }), [
    onNodesChange,
    onEdgesChange,
    onConnect,
    syncState,
    undoState,
    awarenessStates,
    updateCursor,
    updateSelectedNode,
    undo,
    redo,
    clearHistory,
    stopCapturing,
    syncNodeToYjs,
    syncConnectionToYjs,
    deleteNodeFromYjs,
    deleteConnectionFromYjs,
    isReady,
  ]);
}

export default useReactFlowYjsSync;
