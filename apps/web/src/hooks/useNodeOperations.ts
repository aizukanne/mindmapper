/**
 * useNodeOperations Hook
 *
 * A custom hook that provides node CRUD operations with automatic API synchronization.
 * Combines local Zustand state management with backend API calls for persistence.
 *
 * Features:
 * - Optimistic updates for immediate UI feedback
 * - Automatic API sync with error handling
 * - Offline support with queued operations
 * - Yjs integration for real-time collaboration
 */

import { useCallback, useMemo } from 'react';
import { useMapStore } from '@/stores/mapStore';
import type { NodeStyle } from '@mindmapper/types';

interface UseNodeOperationsOptions {
  /** If true, use sync versions of operations that persist to API */
  syncToApi?: boolean;
  /** Callback for Yjs sync (if collaboration is enabled) */
  onNodeCreate?: (nodeId: string) => void;
  onNodeUpdate?: (nodeId: string) => void;
  onNodeDelete?: (nodeId: string) => void;
}

interface NodeOperations {
  // Create operations
  createNode: (parentId: string | null, position?: { x: number; y: number }) => Promise<string>;

  // Update operations
  updateNodeText: (nodeId: string, text: string) => Promise<void>;
  updateNodeStyle: (nodeId: string, style: Partial<NodeStyle>) => Promise<void>;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => Promise<void>;
  toggleNodeCollapse: (nodeId: string) => void;

  // Delete operations
  deleteNode: (nodeId: string) => Promise<void>;

  // Duplicate operations
  duplicateNode: (nodeId: string) => string | null;

  // Selection
  selectNode: (nodeId: string | null) => void;

  // State
  selectedNodeId: string | null;
  isSyncing: boolean;
  syncError: string | null;
  pendingChanges: number;

  // Error management
  clearSyncError: () => void;
}

export function useNodeOperations(options: UseNodeOperationsOptions = {}): NodeOperations {
  const {
    syncToApi = true,
    onNodeCreate,
    onNodeUpdate,
    onNodeDelete,
  } = options;

  // Get store state and actions
  const {
    selectedNodeId,
    isSyncing,
    syncError,
    pendingChanges,
    // Local-only operations
    addNode,
    updateNodeText: localUpdateNodeText,
    updateNodeStyle: localUpdateNodeStyle,
    deleteNode: localDeleteNode,
    duplicateNode,
    setSelectedNode,
    toggleNodeCollapse,
    clearSyncError,
    // Sync operations
    createNodeWithSync,
    updateNodeTextWithSync,
    updateNodeStyleWithSync,
    deleteNodeWithSync,
    updateNodePositionWithSync,
  } = useMapStore();

  /**
   * Create a new node with optional API sync
   */
  const createNode = useCallback(async (
    parentId: string | null,
    position?: { x: number; y: number }
  ): Promise<string> => {
    let nodeId: string;

    if (syncToApi) {
      nodeId = await createNodeWithSync(parentId, position);
    } else {
      nodeId = addNode(parentId, position);
    }

    // Trigger Yjs sync callback if provided
    onNodeCreate?.(nodeId);

    return nodeId;
  }, [syncToApi, createNodeWithSync, addNode, onNodeCreate]);

  /**
   * Update node text with optional API sync
   */
  const updateNodeText = useCallback(async (
    nodeId: string,
    text: string
  ): Promise<void> => {
    if (syncToApi) {
      await updateNodeTextWithSync(nodeId, text);
    } else {
      localUpdateNodeText(nodeId, text);
    }

    onNodeUpdate?.(nodeId);
  }, [syncToApi, updateNodeTextWithSync, localUpdateNodeText, onNodeUpdate]);

  /**
   * Update node style with optional API sync
   */
  const updateNodeStyle = useCallback(async (
    nodeId: string,
    style: Partial<NodeStyle>
  ): Promise<void> => {
    if (syncToApi) {
      await updateNodeStyleWithSync(nodeId, style);
    } else {
      localUpdateNodeStyle(nodeId, style);
    }

    onNodeUpdate?.(nodeId);
  }, [syncToApi, updateNodeStyleWithSync, localUpdateNodeStyle, onNodeUpdate]);

  /**
   * Update node position with debounced API sync
   */
  const updateNodePosition = useCallback(async (
    nodeId: string,
    position: { x: number; y: number }
  ): Promise<void> => {
    if (syncToApi) {
      await updateNodePositionWithSync(nodeId, position);
    }
    // Position updates are handled directly by React Flow's onNodesChange
    // This is mainly for explicit position updates
  }, [syncToApi, updateNodePositionWithSync]);

  /**
   * Delete a node with optional API sync
   */
  const deleteNode = useCallback(async (nodeId: string): Promise<void> => {
    // Trigger Yjs sync callback before deletion
    onNodeDelete?.(nodeId);

    if (syncToApi) {
      await deleteNodeWithSync(nodeId);
    } else {
      localDeleteNode(nodeId);
    }
  }, [syncToApi, deleteNodeWithSync, localDeleteNode, onNodeDelete]);

  /**
   * Select a node
   */
  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNode(nodeId);
  }, [setSelectedNode]);

  return useMemo(() => ({
    // Create
    createNode,
    // Update
    updateNodeText,
    updateNodeStyle,
    updateNodePosition,
    toggleNodeCollapse,
    // Delete
    deleteNode,
    // Duplicate
    duplicateNode,
    // Selection
    selectNode,
    // State
    selectedNodeId,
    isSyncing,
    syncError,
    pendingChanges,
    // Error management
    clearSyncError,
  }), [
    createNode,
    updateNodeText,
    updateNodeStyle,
    updateNodePosition,
    toggleNodeCollapse,
    deleteNode,
    duplicateNode,
    selectNode,
    selectedNodeId,
    isSyncing,
    syncError,
    pendingChanges,
    clearSyncError,
  ]);
}

/**
 * Hook for node operations integrated with Yjs collaboration
 */
export function useNodeOperationsWithYjs(yjsSync?: {
  syncNodeToYjs: (node: { id: string }) => void;
  deleteNodeFromYjs: (nodeId: string) => void;
}) {
  const nodes = useMapStore((state) => state.nodes);

  const operations = useNodeOperations({
    syncToApi: true,
    onNodeCreate: yjsSync ? (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        yjsSync.syncNodeToYjs(node);
      }
    } : undefined,
    onNodeUpdate: yjsSync ? (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        yjsSync.syncNodeToYjs(node);
      }
    } : undefined,
    onNodeDelete: yjsSync ? (nodeId) => {
      yjsSync.deleteNodeFromYjs(nodeId);
    } : undefined,
  });

  return operations;
}

export default useNodeOperations;
