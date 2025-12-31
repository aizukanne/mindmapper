import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import type { NodeStyle, ConnectionStyle } from '@mindmapper/types';
import { generateId } from '@/lib/utils';

// Define node data interface with index signature for React Flow compatibility
export interface NodeData extends Record<string, unknown> {
  id: string;
  text: string;
  type: 'ROOT' | 'CHILD' | 'FLOATING';
  parentId: string | null;
  style: NodeStyle;
  isCollapsed: boolean;
  metadata: Record<string, unknown>;
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

  // Actions
  setMapId: (id: string | null) => void;
  setTitle: (title: string) => void;
  setNodes: (nodes: MindMapNode[]) => void;
  setEdges: (edges: MindMapEdge[]) => void;

  onNodesChange: OnNodesChange<MindMapNode>;
  onEdgesChange: OnEdgesChange<MindMapEdge>;
  onConnect: OnConnect;

  // Node operations
  addNode: (parentId: string | null, position?: { x: number; y: number }) => string;
  updateNodeText: (nodeId: string, text: string) => void;
  updateNodeStyle: (nodeId: string, style: Partial<NodeStyle>) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => string | null;
  setSelectedNode: (nodeId: string | null) => void;

  // Initialization
  initializeNewMap: () => void;
  loadMap: (mapId: string, nodes: MindMapNode[], edges: MindMapEdge[], title: string) => void;
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

const defaultRootStyle: NodeStyle = {
  ...defaultNodeStyle,
  backgroundColor: '#3b82f6',
  borderColor: '#2563eb',
  textColor: '#ffffff',
  fontSize: 18,
  fontWeight: 'bold',
  borderRadius: 12,
};

export const useMapStore = create<MapState>((set, get) => ({
  // Initial state
  mapId: null,
  title: 'Untitled Mind Map',
  nodes: [],
  edges: [],
  selectedNodeId: null,

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
    });
  },
}));
