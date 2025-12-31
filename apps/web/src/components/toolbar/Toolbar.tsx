import { useCallback } from 'react';
import {
  Plus,
  Trash2,
  Layout,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { useMapStore } from '@/stores/mapStore';
import { useAutoLayout } from '@/hooks/useAutoLayout';
import { cn } from '@/lib/utils';

export function Toolbar() {
  const { selectedNodeId, addNode, deleteNode, nodes } = useMapStore();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const { layoutNodes, isLayouting } = useAutoLayout();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const canDelete = selectedNode && selectedNode.data.type !== 'ROOT';

  const handleAddChild = useCallback(() => {
    if (selectedNodeId) {
      addNode(selectedNodeId);
    }
  }, [selectedNodeId, addNode]);

  const handleDelete = useCallback(() => {
    if (selectedNodeId && canDelete) {
      deleteNode(selectedNodeId);
    }
  }, [selectedNodeId, canDelete, deleteNode]);

  const handleLayout = useCallback(() => {
    layoutNodes('LR');
  }, [layoutNodes]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-background border border-border rounded-lg shadow-lg">
      {/* Add node */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleAddChild}
        disabled={!selectedNodeId}
        title="Add child node (Tab)"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {/* Delete node */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={!canDelete}
        title="Delete node (Delete)"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Auto layout */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLayout}
        disabled={isLayouting}
        title="Auto layout"
      >
        <Layout className={cn('h-4 w-4', isLayouting && 'animate-spin')} />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Zoom controls */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomOut()}
        title="Zoom out (Ctrl+-)"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomIn()}
        title="Zoom in (Ctrl++)"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleFitView}
        title="Fit view (Ctrl+0)"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
