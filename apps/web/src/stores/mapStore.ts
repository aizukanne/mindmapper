import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  type IsValidConnection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import type { NodeStyle, ConnectionStyle } from '@mindmapper/types';
import { generateId } from '@/lib/utils';
import {
  validateConnection,
  DEFAULT_CONNECTION_RULES,
  type ConnectionValidationResult,
} from '@/lib/connection-validation';
import {
  createNode as apiCreateNode,
  updateNode as apiUpdateNode,
  deleteNode as apiDeleteNode,
  updateNodePosition as apiUpdateNodePosition,
  debounce,
  isNetworkError,
  getErrorMessage,
  offlineQueue,
  type CreateNodeRequest,
} from '@/lib/node-api';

// Define node data interface with index signature for React Flow compatibility
export interface NodeData extends Record<string, unknown> {
  id: string;
  text: string;
  type: 'ROOT' | 'CHILD' | 'FLOATING';
  parentId: string | null;
  style: NodeStyle;
  isCollapsed: boolean;
  metadata: Record<string, unknown>;
  /** Whether the node has been manually positioned by the user (affects auto-layout) */
  isManuallyPositioned?: boolean;
}

export type MindMapNode = Node<NodeData>;
export type MindMapEdge = Edge<{ style?: ConnectionStyle }>;

interface MapState {
  // Map metadata
  mapId: string | null;
  title: string;

  // React Flow state
  nodes: MindMapNode[];
  edges: MindMapEdge[];

  // Selection state
  selectedNodeId: string | null;

  // Connection validation state
  lastConnectionError: string | null;

  // Sync state
  isSyncing: boolean;
  syncError: string | null;
  pendingChanges: number;

  // Actions
  setMapId: (id: string | null) => void;
  setTitle: (title: string) => void;
  setNodes: (nodes: MindMapNode[]) => void;
  setEdges: (edges: MindMapEdge[]) => void;

  onNodesChange: OnNodesChange<MindMapNode>;
  onEdgesChange: OnEdgesChange<MindMapEdge>;
  onConnect: OnConnect;

  // Connection validation
  isValidConnection: IsValidConnection;
  validateConnectionAttempt: (connection: Connection) => ConnectionValidationResult;
  clearConnectionError: () => void;

  // Node operations (local state only)
  addNode: (parentId: string | null, position?: { x: number; y: number }) => string;
  updateNodeText: (nodeId: string, text: string) => void;
  updateNodeStyle: (nodeId: string, style: Partial<NodeStyle>) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => string | null;
  setSelectedNode: (nodeId: string | null) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  setNodeManuallyPositioned: (nodeId: string, isManual: boolean) => void;

  // Node operations with API sync
  createNodeWithSync: (parentId: string | null, position?: { x: number; y: number }) => Promise<string>;
  updateNodeTextWithSync: (nodeId: string, text: string) => Promise<void>;
  updateNodeStyleWithSync: (nodeId: string, style: Partial<NodeStyle>) => Promise<void>;
  deleteNodeWithSync: (nodeId: string) => Promise<void>;
  updateNodePositionWithSync: (nodeId: string, position: { x: number; y: number }) => Promise<void>;

  // Sync state management
  setSyncError: (error: string | null) => void;
  clearSyncError: () => void;

  // Initialization
  initializeNewMap: () => void;
  loadMap: (mapId: string, nodes: MindMapNode[], edges: MindMapEdge[], title: string) => void;
}

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

const defaultRootStyle: NodeStyle = {
  ...defaultNodeStyle,
  backgroundColor: '#3b82f6',
  borderColor: '#2563eb',
  textColor: '#ffffff',
  fontSize: 18,
  fontWeight: 'bold',
  borderRadius: 12,
};

// Debounced position update to avoid too many API calls during drag
const debouncedPositionUpdates = new Map<string, ReturnType<typeof debounce>>();

export const useMapStore = create<MapState>((set, get) => ({
  // Initial state
  mapId: null,
  title: 'Untitled Mind Map',
  nodes: [],
  edges: [],
  selectedNodeId: null,
  lastConnectionError: null,
  isSyncing: false,
  syncError: null,
  pendingChanges: 0,

  // Setters
  setMapId: (id) => set({ mapId: id }),
  setTitle: (title) => set({ title }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  // React Flow handlers
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as MindMapNode[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges) as MindMapEdge[],
    });
  },

  onConnect: (connection) => {
    const { nodes, edges } = get();

    // Validate the connection before adding
    const validation = validateConnection(connection, nodes, edges, DEFAULT_CONNECTION_RULES);

    if (!validation.isValid) {
      // Store the error message for UI feedback
      set({ lastConnectionError: validation.reason || 'Invalid connection' });
      // Auto-clear the error after 3 seconds
      setTimeout(() => {
        set({ lastConnectionError: null });
      }, 3000);
      return;
    }

    // Clear any previous error
    set({ lastConnectionError: null });

    // Add the valid connection
    set({
      edges: addEdge(
        {
          ...connection,
          type: 'smoothstep',
          animated: false,
        },
        get().edges
      ) as MindMapEdge[],
    });
  },

  // Connection validation methods
  isValidConnection: (connection) => {
    const { nodes, edges } = get();
    // Normalize the connection to ensure it has the required fields
    const normalizedConnection: Connection = {
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? null,
      targetHandle: connection.targetHandle ?? null,
    };
    const validation = validateConnection(normalizedConnection, nodes, edges, DEFAULT_CONNECTION_RULES);
    return validation.isValid;
  },

  validateConnectionAttempt: (connection) => {
    const { nodes, edges } = get();
    return validateConnection(connection, nodes, edges, DEFAULT_CONNECTION_RULES);
  },

  clearConnectionError: () => set({ lastConnectionError: null }),

  // Node operations
  addNode: (parentId, position) => {
    const id = generateId();
    const isRoot = parentId === null;

    const newNode: MindMapNode = {
      id,
      type: 'mindMapNode',
      position: position || { x: 0, y: 0 },
      data: {
        id,
        text: isRoot ? 'Central Idea' : 'New Node',
        type: isRoot ? 'ROOT' : 'CHILD',
        parentId,
        style: isRoot ? defaultRootStyle : defaultNodeStyle,
        isCollapsed: false,
        metadata: {},
      },
    };

    const newEdges = [...get().edges];

    // If has parent, create edge
    if (parentId) {
      newEdges.push({
        id: `edge-${parentId}-${id}`,
        source: parentId,
        target: id,
        type: 'smoothstep',
      });
    }

    set({
      nodes: [...get().nodes, newNode],
      edges: newEdges,
      selectedNodeId: id,
    });

    return id;
  },

  updateNodeText: (nodeId, text) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, text } }
          : node
      ),
    });
  },

  updateNodeStyle: (nodeId, style) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                style: { ...node.data.style, ...style },
              },
            }
          : node
      ),
    });
  },

  deleteNode: (nodeId) => {
    const { nodes, edges } = get();

    // Find all descendant nodes to delete
    const nodesToDelete = new Set<string>([nodeId]);
    let changed = true;

    while (changed) {
      changed = false;
      for (const node of nodes) {
        if (
          node.data.parentId &&
          nodesToDelete.has(node.data.parentId) &&
          !nodesToDelete.has(node.id)
        ) {
          nodesToDelete.add(node.id);
          changed = true;
        }
      }
    }

    set({
      nodes: nodes.filter((node) => !nodesToDelete.has(node.id)),
      edges: edges.filter(
        (edge) =>
          !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target)
      ),
      selectedNodeId:
        get().selectedNodeId && nodesToDelete.has(get().selectedNodeId!)
          ? null
          : get().selectedNodeId,
    });
  },

  duplicateNode: (nodeId) => {
    const { nodes, edges } = get();
    const nodeToDuplicate = nodes.find((n) => n.id === nodeId);

    if (!nodeToDuplicate || nodeToDuplicate.data.type === 'ROOT') {
      return null;
    }

    // Helper to duplicate a node and all its children
    const duplicateTree = (
      sourceId: string,
      newParentId: string | null,
      offsetX: number,
      offsetY: number
    ): { nodes: MindMapNode[]; edges: MindMapEdge[] } => {
      const sourceNode = nodes.find((n) => n.id === sourceId);
      if (!sourceNode) return { nodes: [], edges: [] };

      const newId = generateId();
      const newNode: MindMapNode = {
        id: newId,
        type: 'mindMapNode',
        position: {
          x: sourceNode.position.x + offsetX,
          y: sourceNode.position.y + offsetY,
        },
        data: {
          ...sourceNode.data,
          id: newId,
          text: sourceNode.data.text,
          parentId: newParentId,
        },
      };

      const newNodes: MindMapNode[] = [newNode];
      const newEdges: MindMapEdge[] = [];

      // Create edge to parent
      if (newParentId) {
        newEdges.push({
          id: `edge-${newParentId}-${newId}`,
          source: newParentId,
          target: newId,
          type: 'smoothstep',
        });
      }

      // Find and duplicate children
      const children = nodes.filter((n) => n.data.parentId === sourceId);
      for (const child of children) {
        const childResult = duplicateTree(child.id, newId, offsetX, offsetY);
        newNodes.push(...childResult.nodes);
        newEdges.push(...childResult.edges);
      }

      return { nodes: newNodes, edges: newEdges };
    };

    // Duplicate the node and its subtree
    const result = duplicateTree(
      nodeId,
      nodeToDuplicate.data.parentId,
      50,
      50
    );

    if (result.nodes.length > 0) {
      set({
        nodes: [...nodes, ...result.nodes],
        edges: [...edges, ...result.edges],
        selectedNodeId: result.nodes[0].id,
      });
      return result.nodes[0].id;
    }

    return null;
  },

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  toggleNodeCollapse: (nodeId) => {
    const { nodes, edges } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const newIsCollapsed = !node.data.isCollapsed;

    // Find all descendant node IDs
    const getDescendants = (parentId: string): string[] => {
      const children = nodes.filter((n) => n.data.parentId === parentId);
      return children.flatMap((child) => [child.id, ...getDescendants(child.id)]);
    };

    const descendantIds = new Set(getDescendants(nodeId));

    // Update nodes: toggle collapse state and hide/show descendants
    const updatedNodes = nodes.map((n) => {
      if (n.id === nodeId) {
        return {
          ...n,
          data: { ...n.data, isCollapsed: newIsCollapsed },
        };
      }
      if (descendantIds.has(n.id)) {
        return {
          ...n,
          hidden: newIsCollapsed,
        };
      }
      return n;
    });

    // Update edges: hide/show edges connected to hidden nodes
    const updatedEdges = edges.map((e) => {
      if (descendantIds.has(e.target) || descendantIds.has(e.source)) {
        return {
          ...e,
          hidden: newIsCollapsed,
        };
      }
      return e;
    });

    set({ nodes: updatedNodes, edges: updatedEdges });
  },

  setNodeManuallyPositioned: (nodeId, isManual) => {
    const { nodes } = get();
    set({
      nodes: nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, isManuallyPositioned: isManual } }
          : n
      ),
    });
  },

  // Initialization
  initializeNewMap: () => {
    const rootId = generateId();
    const rootNode: MindMapNode = {
      id: rootId,
      type: 'mindMapNode',
      position: { x: 400, y: 300 },
      data: {
        id: rootId,
        text: 'Central Idea',
        type: 'ROOT',
        parentId: null,
        style: defaultRootStyle,
        isCollapsed: false,
        metadata: {},
      },
    };

    set({
      mapId: null,
      title: 'Untitled Mind Map',
      nodes: [rootNode],
      edges: [],
      selectedNodeId: rootId,
    });
  },

  loadMap: (mapId, nodes, edges, title) => {
    set({
      mapId,
      title,
      nodes,
      edges,
      selectedNodeId: null,
      syncError: null,
      pendingChanges: 0,
    });
  },

  // Sync state management
  setSyncError: (error) => set({ syncError: error }),
  clearSyncError: () => set({ syncError: null }),

  // Node operations with API sync
  createNodeWithSync: async (parentId, position) => {
    const { mapId, nodes, edges } = get();
    const localId = generateId();
    const isRoot = parentId === null;

    // Create node locally first (optimistic update)
    const newNode: MindMapNode = {
      id: localId,
      type: 'mindMapNode',
      position: position || { x: 0, y: 0 },
      data: {
        id: localId,
        text: isRoot ? 'Central Idea' : 'New Node',
        type: isRoot ? 'ROOT' : 'CHILD',
        parentId,
        style: isRoot ? defaultRootStyle : defaultNodeStyle,
        isCollapsed: false,
        metadata: {},
      },
    };

    const newEdges = [...edges];
    if (parentId) {
      newEdges.push({
        id: `edge-${parentId}-${localId}`,
        source: parentId,
        target: localId,
        type: 'smoothstep',
      });
    }

    set({
      nodes: [...nodes, newNode],
      edges: newEdges,
      selectedNodeId: localId,
      pendingChanges: get().pendingChanges + 1,
    });

    // If no mapId, we're in a new unsaved map - just return local id
    if (!mapId) {
      set({ pendingChanges: get().pendingChanges - 1 });
      return localId;
    }

    // Sync to API
    try {
      set({ isSyncing: true });

      const createRequest: CreateNodeRequest = {
        parentId,
        type: isRoot ? 'ROOT' : 'CHILD',
        text: newNode.data.text,
        positionX: newNode.position.x,
        positionY: newNode.position.y,
        style: newNode.data.style,
      };

      const apiNode = await apiCreateNode(mapId, createRequest);

      // Update local node with server-generated ID if different
      if (apiNode.id !== localId) {
        const currentNodes = get().nodes;
        const currentEdges = get().edges;

        set({
          nodes: currentNodes.map((n) =>
            n.id === localId
              ? { ...n, id: apiNode.id, data: { ...n.data, id: apiNode.id } }
              : n.data.parentId === localId
              ? { ...n, data: { ...n.data, parentId: apiNode.id } }
              : n
          ),
          edges: currentEdges.map((e) => {
            if (e.source === localId || e.target === localId) {
              return {
                ...e,
                id: e.id.replace(localId, apiNode.id),
                source: e.source === localId ? apiNode.id : e.source,
                target: e.target === localId ? apiNode.id : e.target,
              };
            }
            return e;
          }),
          selectedNodeId: get().selectedNodeId === localId ? apiNode.id : get().selectedNodeId,
        });

        set({ isSyncing: false, pendingChanges: get().pendingChanges - 1, syncError: null });
        return apiNode.id;
      }

      set({ isSyncing: false, pendingChanges: get().pendingChanges - 1, syncError: null });
      return localId;
    } catch (error) {
      // Handle network errors - queue for later
      if (isNetworkError(error)) {
        offlineQueue.add(mapId, {
          type: 'create',
          data: {
            parentId,
            type: isRoot ? 'ROOT' : 'CHILD',
            text: newNode.data.text,
            positionX: newNode.position.x,
            positionY: newNode.position.y,
            style: newNode.data.style,
          },
        });
        set({
          isSyncing: false,
          pendingChanges: get().pendingChanges - 1,
          syncError: getErrorMessage(error),
        });
        return localId;
      }

      // For other errors, revert the optimistic update
      set({
        nodes: nodes,
        edges: edges,
        selectedNodeId: null,
        isSyncing: false,
        pendingChanges: get().pendingChanges - 1,
        syncError: getErrorMessage(error),
      });

      throw error;
    }
  },

  updateNodeTextWithSync: async (nodeId, text) => {
    const { mapId, nodes } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const oldText = node.data.text;

    // Optimistic update
    set({
      nodes: nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, text } } : n
      ),
      pendingChanges: get().pendingChanges + 1,
    });

    if (!mapId) {
      set({ pendingChanges: get().pendingChanges - 1 });
      return;
    }

    try {
      set({ isSyncing: true });
      await apiUpdateNode(mapId, nodeId, { text });
      set({ isSyncing: false, pendingChanges: get().pendingChanges - 1, syncError: null });
    } catch (error) {
      if (isNetworkError(error)) {
        offlineQueue.add(mapId, {
          type: 'update',
          nodeId,
          data: { text },
        });
        set({
          isSyncing: false,
          pendingChanges: get().pendingChanges - 1,
          syncError: getErrorMessage(error),
        });
        return;
      }

      // Revert on error
      set({
        nodes: get().nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, text: oldText } } : n
        ),
        isSyncing: false,
        pendingChanges: get().pendingChanges - 1,
        syncError: getErrorMessage(error),
      });
      throw error;
    }
  },

  updateNodeStyleWithSync: async (nodeId, style) => {
    const { mapId, nodes } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const oldStyle = node.data.style;

    // Optimistic update
    set({
      nodes: nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, style: { ...n.data.style, ...style } } }
          : n
      ),
      pendingChanges: get().pendingChanges + 1,
    });

    if (!mapId) {
      set({ pendingChanges: get().pendingChanges - 1 });
      return;
    }

    try {
      set({ isSyncing: true });
      await apiUpdateNode(mapId, nodeId, { style });
      set({ isSyncing: false, pendingChanges: get().pendingChanges - 1, syncError: null });
    } catch (error) {
      if (isNetworkError(error)) {
        offlineQueue.add(mapId, {
          type: 'update',
          nodeId,
          data: { style },
        });
        set({
          isSyncing: false,
          pendingChanges: get().pendingChanges - 1,
          syncError: getErrorMessage(error),
        });
        return;
      }

      // Revert on error
      set({
        nodes: get().nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, style: oldStyle } } : n
        ),
        isSyncing: false,
        pendingChanges: get().pendingChanges - 1,
        syncError: getErrorMessage(error),
      });
      throw error;
    }
  },

  deleteNodeWithSync: async (nodeId) => {
    const { mapId, nodes, edges } = get();
    const node = nodes.find((n) => n.id === nodeId);

    if (!node) return;
    if (node.data.type === 'ROOT') {
      set({ syncError: 'Cannot delete the root node' });
      return;
    }

    // Find all descendant nodes to delete
    const nodesToDelete = new Set<string>([nodeId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of nodes) {
        if (
          n.data.parentId &&
          nodesToDelete.has(n.data.parentId) &&
          !nodesToDelete.has(n.id)
        ) {
          nodesToDelete.add(n.id);
          changed = true;
        }
      }
    }

    const deletedNodes = nodes.filter((n) => nodesToDelete.has(n.id));
    const deletedEdges = edges.filter(
      (e) => nodesToDelete.has(e.source) || nodesToDelete.has(e.target)
    );

    // Optimistic delete
    set({
      nodes: nodes.filter((n) => !nodesToDelete.has(n.id)),
      edges: edges.filter(
        (e) => !nodesToDelete.has(e.source) && !nodesToDelete.has(e.target)
      ),
      selectedNodeId:
        get().selectedNodeId && nodesToDelete.has(get().selectedNodeId!)
          ? null
          : get().selectedNodeId,
      pendingChanges: get().pendingChanges + 1,
    });

    if (!mapId) {
      set({ pendingChanges: get().pendingChanges - 1 });
      return;
    }

    try {
      set({ isSyncing: true });
      await apiDeleteNode(mapId, nodeId);
      set({ isSyncing: false, pendingChanges: get().pendingChanges - 1, syncError: null });
    } catch (error) {
      if (isNetworkError(error)) {
        offlineQueue.add(mapId, {
          type: 'delete',
          nodeId,
        });
        set({
          isSyncing: false,
          pendingChanges: get().pendingChanges - 1,
          syncError: getErrorMessage(error),
        });
        return;
      }

      // Revert on error
      set({
        nodes: [...get().nodes, ...deletedNodes],
        edges: [...get().edges, ...deletedEdges],
        isSyncing: false,
        pendingChanges: get().pendingChanges - 1,
        syncError: getErrorMessage(error),
      });
      throw error;
    }
  },

  updateNodePositionWithSync: async (nodeId, position) => {
    const { mapId, nodes } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Update locally immediately
    set({
      nodes: nodes.map((n) =>
        n.id === nodeId ? { ...n, position } : n
      ),
    });

    if (!mapId) return;

    // Get or create debounced update function for this node
    let debouncedUpdate = debouncedPositionUpdates.get(nodeId);
    if (!debouncedUpdate) {
      debouncedUpdate = debounce(async (mapIdArg: unknown, nodeIdArg: unknown, posArg: unknown) => {
        try {
          await apiUpdateNodePosition(
            mapIdArg as string,
            nodeIdArg as string,
            posArg as { x: number; y: number }
          );
        } catch (error) {
          if (isNetworkError(error)) {
            offlineQueue.add(mapIdArg as string, {
              type: 'update',
              nodeId: nodeIdArg as string,
              data: {
                positionX: (posArg as { x: number; y: number }).x,
                positionY: (posArg as { x: number; y: number }).y,
              },
            });
          }
          // Don't revert position updates - they're too disruptive during drag
          console.error('Failed to sync position:', error);
        }
      }, 500);
      debouncedPositionUpdates.set(nodeId, debouncedUpdate);
    }

    debouncedUpdate(mapId, nodeId, position);
  },
}));
