import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  type Node,
  type NodeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { MindMapNode, type ExtendedNodeData } from './MindMapNode';
import { Toolbar } from '../toolbar/Toolbar';
import { Cursors } from '../collaboration/Cursors';
import { MobileToolbar } from '../mobile/MobileToolbar';
import { OfflineIndicator } from '../mobile/OfflineIndicator';
import { KeyboardShortcutsModal } from '../help/KeyboardShortcutsModal';
import { useMapStore } from '@/stores/mapStore';
import { useAutoLayout } from '@/hooks/useAutoLayout';
import { useKeyboardShortcuts } from '@/hooks/useKeyboard';
import { useNodeComments } from '@/hooks/useNodeComments';
import { useTouchGestures } from '@/hooks/useTouchGestures';

interface CursorState {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}

interface CanvasProps {
  awarenessStates?: CursorState[];
  currentUserId?: string;
  mapId?: string;
  onCommentClick?: (nodeId: string) => void;
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
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
  undo,
  redo,
  canUndo,
  canRedo,
}: CanvasProps) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNode,
    initializeNewMap,
  } = useMapStore();

  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Fetch comment counts for nodes
  const { commentCounts } = useNodeComments({
    mapId: mapId || '',
    enabled: !!mapId,
    pollInterval: 30000,
  });

  // Initialize new map if empty
  useEffect(() => {
    if (nodes.length === 0) {
      initializeNewMap();
    }
  }, [nodes.length, initializeNewMap]);

  // Apply auto layout hook
  useAutoLayout();

  // Touch gestures for mobile
  useTouchGestures({ enabled: true });

  // Keyboard shortcuts with undo/redo support
  const { isPanMode } = useKeyboardShortcuts({
    undo,
    redo,
    canUndo,
    canRedo,
    onShowHelp: () => setIsShortcutsModalOpen(true),
  });

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

  // Enrich nodes with comment counts and selection indicators
  const enrichedNodes = useMemo(() => {
    return nodes.map((node) => {
      const commentData = commentCounts.get(node.id);
      const selectedBy = nodeSelections.get(node.id);

      return {
        ...node,
        data: {
          ...node.data,
          commentCount: commentData?.total,
          unresolvedComments: commentData?.unresolved,
          selectedBy,
          onCommentClick,
        } as ExtendedNodeData,
      };
    });
  }, [nodes, commentCounts, nodeSelections, onCommentClick]);

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
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={4}
        panOnDrag={isPanMode ? true : [1, 2]}
        selectionOnDrag={!isPanMode}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
        className={`bg-slate-50 ${isPanMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#d1d5db"
        />
        <Controls
          showInteractive={false}
          className="!shadow-lg !rounded-lg !border !border-border hidden md:flex"
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="rgba(0,0,0,0.1)"
          className="!shadow-lg !rounded-lg !border !border-border hidden md:block"
        />
        <Panel position="top-center" className="hidden md:block">
          <Toolbar />
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
    </div>
  );
}
