import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Panel,
  useReactFlow,
  type Node,
  type NodeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { MindMapNode, type ExtendedNodeData } from './MindMapNode';
import { CanvasControls } from './CanvasControls';
import { Toolbar } from '../toolbar/Toolbar';
import { Cursors } from '../collaboration/Cursors';
import { MobileToolbar } from '../mobile/MobileToolbar';
import { OfflineIndicator } from '../mobile/OfflineIndicator';
import { KeyboardShortcutsModal } from '../help/KeyboardShortcutsModal';
import { ConnectionErrorToast } from './ConnectionErrorToast';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { TouchContextMenu, createNodeActions } from '../touch';
import { useMapStore } from '@/stores/mapStore';
import { useAutoLayout } from '@/hooks/useAutoLayout';
import { useKeyboardShortcuts } from '@/hooks/useKeyboard';
import { useNodeComments } from '@/hooks/useNodeComments';
import { useTouchGestures, type LongPressContext } from '@/hooks/useTouchGestures';
import { useSvgExport, type ExportOptions } from '@/hooks/useSvgExport';

interface CursorState {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}

// Enhanced cursor state with editing information
interface EnhancedCursorState extends CursorState {
  isEditingNodeId?: string | null;
}

/** Export functions provided by the Canvas component */
export interface CanvasExportFunctions {
  /** Export the canvas as SVG string */
  exportToSvg: (options?: ExportOptions) => Promise<string | null>;
  /** Export the canvas as PNG data URL with optional export options */
  exportToPng: (options?: ExportOptions) => Promise<string | null>;
}

interface CanvasProps {
  awarenessStates?: EnhancedCursorState[];
  currentUserId?: string;
  mapId?: string;
  onCommentClick?: (nodeId: string) => void;
  onExport?: () => void;
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onCommentCountsRefresh?: (refresh: () => Promise<void>) => void;
  /** Callback to expose export functions to parent component */
  onExportFunctionsReady?: (exportFunctions: CanvasExportFunctions) => void;
  /** Callback when a user starts editing a node */
  onEditingStart?: (nodeId: string) => void;
  /** Callback when a user stops editing a node */
  onEditingStop?: (nodeId: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: NodeTypes = {
  mindMapNode: MindMapNode as any,
};

export function Canvas({
  awarenessStates = [],
  currentUserId,
  mapId,
  onCommentClick,
  onExport,
  undo,
  redo,
  canUndo,
  canRedo,
  onCommentCountsRefresh,
  onExportFunctionsReady,
  onEditingStart,
  onEditingStop,
}: CanvasProps) {
  const {
    nodes,
    edges,
    selectedNodeId: _selectedNodeId, // Used by context menu logic
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    lastConnectionError,
    clearConnectionError,
    setSelectedNode,
    initializeNewMap,
    isSyncing,
    syncError,
    pendingChanges,
    clearSyncError,
    addNode,
    deleteNode,
    duplicateNode,
  } = useMapStore();

  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isPanModeState, setIsPanModeState] = useState(false);

  // Context menu state for long-press
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);

  // SVG/PNG export functionality using React Flow canvas
  const { exportToSvg, exportToPng } = useSvgExport();

  // Expose export functions to parent component
  useEffect(() => {
    if (onExportFunctionsReady) {
      onExportFunctionsReady({
        exportToSvg,
        exportToPng,
      });
    }
  }, [onExportFunctionsReady, exportToSvg, exportToPng]);

  // Fetch comment counts for nodes
  const { commentCounts, refresh: refreshCommentCounts } = useNodeComments({
    mapId: mapId || '',
    enabled: !!mapId,
    pollInterval: 30000,
  });

  // Expose the refresh function to parent for real-time updates
  useEffect(() => {
    if (onCommentCountsRefresh) {
      onCommentCountsRefresh(refreshCommentCounts);
    }
  }, [onCommentCountsRefresh, refreshCommentCounts]);

  // Initialize new map if empty
  useEffect(() => {
    if (nodes.length === 0) {
      initializeNewMap();
    }
  }, [nodes.length, initializeNewMap]);

  // Apply auto layout hook
  useAutoLayout();

  // Handle long press for context menu
  const handleLongPress = useCallback((context: LongPressContext) => {
    setContextMenuPosition({ x: context.x, y: context.y });
    setContextMenuNodeId(context.nodeId);
    setContextMenuOpen(true);

    // Select the node if one was long-pressed
    if (context.nodeId) {
      setSelectedNode(context.nodeId);
    }
  }, [setSelectedNode]);

  // Close context menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenuOpen(false);
    setContextMenuPosition(null);
    setContextMenuNodeId(null);
  }, []);

  // Touch gestures for mobile with long-press support
  useTouchGestures({
    enabled: true,
    onLongPress: handleLongPress,
    longPressDelay: 500,
    longPressMoveThreshold: 10,
  });

  // Keyboard shortcuts with undo/redo support
  const { isPanMode } = useKeyboardShortcuts({
    undo,
    redo,
    canUndo,
    canRedo,
    onShowHelp: () => setIsShortcutsModalOpen(true),
    onToggleMinimap: () => setShowMinimap((prev) => !prev),
    onSetPanMode: setIsPanModeState,
    onTogglePanMode: () => setIsPanModeState((prev) => !prev),
  });

  // Combine keyboard pan mode with button-triggered pan mode
  const effectivePanMode = isPanMode || isPanModeState;

  // Handle node selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // Memoize minimap node color
  const minimapNodeColor = useCallback((node: Node) => {
    const data = node.data as { type?: string };
    if (data?.type === 'ROOT') return '#3b82f6';
    return '#9ca3af';
  }, []);

  // Build a map of nodeId -> users selecting it (excluding current user)
  const nodeSelections = useMemo(() => {
    const selections = new Map<
      string,
      Array<{ id: string; name: string; color: string }>
    >();

    awarenessStates.forEach((state) => {
      if (state.id !== currentUserId && state.selectedNodeId) {
        const existing = selections.get(state.selectedNodeId) || [];
        existing.push({
          id: state.id,
          name: state.name,
          color: state.color,
        });
        selections.set(state.selectedNodeId, existing);
      }
    });

    return selections;
  }, [awarenessStates, currentUserId]);

  // Build a map of nodeId -> users editing it (excluding current user)
  const nodeEditing = useMemo(() => {
    const editing = new Map<
      string,
      Array<{ id: string; name: string; color: string }>
    >();

    awarenessStates.forEach((state) => {
      if (state.id !== currentUserId && state.isEditingNodeId) {
        const existing = editing.get(state.isEditingNodeId) || [];
        existing.push({
          id: state.id,
          name: state.name,
          color: state.color,
        });
        editing.set(state.isEditingNodeId, existing);
      }
    });

    return editing;
  }, [awarenessStates, currentUserId]);

  // Get node info for context menu
  const contextMenuNode = useMemo(() => {
    if (!contextMenuNodeId) return null;
    return nodes.find(n => n.id === contextMenuNodeId) || null;
  }, [contextMenuNodeId, nodes]);

  // Create context menu actions
  const contextMenuActions = useMemo(() => {
    const nodeType = contextMenuNode?.data?.type as string | undefined;
    const isRoot = nodeType === 'ROOT';
    const parentId = contextMenuNode?.data?.parentId as string | undefined;

    return createNodeActions({
      nodeId: contextMenuNodeId,
      nodeType,
      onAddChild: contextMenuNodeId ? () => {
        const position = contextMenuNode ? {
          x: contextMenuNode.position.x + 200,
          y: contextMenuNode.position.y,
        } : undefined;
        addNode(contextMenuNodeId, position);
        handleCloseContextMenu();
      } : undefined,
      onAddSibling: contextMenuNodeId && parentId && !isRoot ? () => {
        const position = contextMenuNode ? {
          x: contextMenuNode.position.x,
          y: contextMenuNode.position.y + 80,
        } : undefined;
        addNode(parentId, position);
        handleCloseContextMenu();
      } : undefined,
      onEdit: contextMenuNodeId ? () => {
        // Select the node to enable editing
        setSelectedNode(contextMenuNodeId);
        handleCloseContextMenu();
      } : undefined,
      onDuplicate: contextMenuNodeId && !isRoot ? () => {
        duplicateNode(contextMenuNodeId);
        handleCloseContextMenu();
      } : undefined,
      onDelete: contextMenuNodeId && !isRoot ? () => {
        deleteNode(contextMenuNodeId);
        handleCloseContextMenu();
      } : undefined,
    });
  }, [contextMenuNodeId, contextMenuNode, addNode, deleteNode, duplicateNode, setSelectedNode, handleCloseContextMenu]);

  // Enrich nodes with comment counts, selection indicators, and editing indicators
  const enrichedNodes = useMemo(() => {
    return nodes.map((node) => {
      const commentData = commentCounts.get(node.id);
      const selectedBy = nodeSelections.get(node.id);
      const editingBy = nodeEditing.get(node.id);

      return {
        ...node,
        data: {
          ...node.data,
          commentCount: commentData?.total,
          unresolvedComments: commentData?.unresolved,
          selectedBy,
          editingBy,
          onCommentClick,
          onEditingStart,
          onEditingStop,
        } as ExtendedNodeData,
      };
    });
  }, [nodes, commentCounts, nodeSelections, nodeEditing, onCommentClick, onEditingStart, onEditingStop]);

  return (
    <div className="w-full h-full">
      {/* Offline indicator */}
      <OfflineIndicator />

      <ReactFlow
        nodes={enrichedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={4}
        panOnDrag={effectivePanMode ? true : [1, 2]}
        selectionOnDrag={!effectivePanMode}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
        className={`bg-slate-50 ${effectivePanMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#d1d5db"
        />
        {showMinimap && (
          <MiniMap
            nodeColor={minimapNodeColor}
            maskColor="rgba(0,0,0,0.1)"
            className="!shadow-lg !rounded-lg !border !border-border hidden md:block"
            data-testid="minimap"
          />
        )}
        <Panel position="top-center" className="hidden md:block">
          <Toolbar
            onExport={onExport}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </Panel>
        <Panel position="bottom-center" className="hidden md:block">
          <CanvasControls
            isPanMode={effectivePanMode}
            onPanModeChange={setIsPanModeState}
            showMinimap={showMinimap}
            onMinimapChange={setShowMinimap}
            onShowHelp={() => setIsShortcutsModalOpen(true)}
            minZoom={0.25}
            maxZoom={4}
          />
        </Panel>
      </ReactFlow>

      {/* Remote cursors overlay */}
      <Cursors awarenessStates={awarenessStates} currentUserId={currentUserId} />

      {/* Mobile toolbar */}
      <MobileToolbar
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitView={() => fitView({ padding: 0.2 })}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsModal
        open={isShortcutsModalOpen}
        onOpenChange={setIsShortcutsModalOpen}
      />

      {/* Connection error toast */}
      <ConnectionErrorToast
        error={lastConnectionError}
        onDismiss={clearConnectionError}
      />

      {/* Sync status indicator */}
      <SyncStatusIndicator
        isSyncing={isSyncing}
        syncError={syncError}
        pendingChanges={pendingChanges}
        onDismissError={clearSyncError}
      />

      {/* Touch Context Menu for long-press */}
      <TouchContextMenu
        isOpen={contextMenuOpen}
        position={contextMenuPosition}
        nodeId={contextMenuNodeId}
        onClose={handleCloseContextMenu}
        actions={contextMenuActions}
        title={contextMenuNode ? String(contextMenuNode.data?.label || 'Node') : 'Options'}
      />
    </div>
  );
}
