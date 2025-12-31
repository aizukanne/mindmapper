import { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronUp,
  Palette,
  Type,
  Undo2,
  Redo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/stores/mapStore';

interface MobileToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onStyleClick?: () => void;
}

export function MobileToolbar({
  onZoomIn,
  onZoomOut,
  onFitView,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onStyleClick,
}: MobileToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { selectedNodeId, addNode, deleteNode, duplicateNode, nodes } = useMapStore();

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;
  const canDelete = selectedNode && selectedNode.data.type !== 'ROOT';
  const canDuplicate = selectedNode && selectedNode.data.type !== 'ROOT';

  const handleAddChild = () => {
    if (selectedNodeId && selectedNode) {
      addNode(selectedNodeId, {
        x: selectedNode.position.x + 200,
        y: selectedNode.position.y,
      });
    }
  };

  const handleAddSibling = () => {
    if (selectedNode && selectedNode.data.parentId) {
      addNode(selectedNode.data.parentId, {
        x: selectedNode.position.x,
        y: selectedNode.position.y + 80,
      });
    }
  };

  const handleDelete = () => {
    if (selectedNodeId && canDelete) {
      deleteNode(selectedNodeId);
    }
  };

  const handleDuplicate = () => {
    if (selectedNodeId && canDuplicate) {
      duplicateNode(selectedNodeId);
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Expanded toolbar */}
      <div
        className={cn(
          'bg-background border-t border-border shadow-lg transition-all duration-300 ease-in-out overflow-hidden',
          isExpanded ? 'max-h-64' : 'max-h-0'
        )}
      >
        <div className="p-4 space-y-4">
          {/* Node actions */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              Node Actions
            </h4>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddChild}
                disabled={!selectedNodeId}
              >
                <Plus className="h-4 w-4 mr-1" />
                Child
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddSibling}
                disabled={!selectedNode?.data.parentId}
              >
                <Plus className="h-4 w-4 mr-1" />
                Sibling
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicate}
                disabled={!canDuplicate}
              >
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={!canDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>

          {/* Style actions */}
          {selectedNodeId && onStyleClick && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Styling
              </h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onStyleClick}>
                  <Palette className="h-4 w-4 mr-1" />
                  Colors
                </Button>
                <Button variant="outline" size="sm" onClick={onStyleClick}>
                  <Type className="h-4 w-4 mr-1" />
                  Text
                </Button>
              </div>
            </div>
          )}

          {/* History actions */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              History
            </h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 className="h-4 w-4 mr-1" />
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRedo}
                disabled={!canRedo}
              >
                <Redo2 className="h-4 w-4 mr-1" />
                Redo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main toolbar */}
      <div className="bg-background border-t border-border px-4 py-2 safe-area-inset-bottom">
        <div className="flex items-center justify-between">
          {/* Left: Quick actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAddChild}
              disabled={!selectedNodeId}
              className="h-10 w-10"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={!canDelete}
              className="h-10 w-10 text-red-600"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>

          {/* Center: Expand button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-10"
          >
            <ChevronUp
              className={cn(
                'h-5 w-5 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
            <span className="ml-1 text-sm">
              {isExpanded ? 'Less' : 'More'}
            </span>
          </Button>

          {/* Right: View controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onZoomOut}
              className="h-10 w-10"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onZoomIn}
              className="h-10 w-10"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onFitView}
              className="h-10 w-10"
            >
              <Maximize2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
