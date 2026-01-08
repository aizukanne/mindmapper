import { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MoreHorizontal,
  Palette,
  Type,
  Undo2,
  Redo2,
  Layout,
  Download,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetSection,
  BottomSheetAction,
  BottomSheetClose,
} from '@/components/ui/bottom-sheet';
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
  onExport?: () => void;
  onLayout?: () => void;
  onCollaborate?: () => void;
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
  onExport,
  onLayout,
  onCollaborate,
}: MobileToolbarProps) {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
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
      setIsBottomSheetOpen(false);
    }
  };

  const handleActionWithClose = (action: (() => void) | undefined) => {
    if (action) {
      action();
      setIsBottomSheetOpen(false);
    }
  };

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      data-testid="mobile-toolbar"
    >
      {/* Main toolbar */}
      <div className="bg-background/95 backdrop-blur-sm border-t border-border px-2 py-2 safe-area-inset-bottom">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Left: Quick node actions */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAddChild}
              disabled={!selectedNodeId}
              className="h-11 w-11 rounded-xl"
              data-testid="mobile-toolbar-add"
            >
              <Plus className="h-5 w-5" />
              <span className="sr-only">Add child node</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={!canDelete}
              className={cn(
                'h-11 w-11 rounded-xl',
                canDelete && 'text-destructive hover:text-destructive'
              )}
              data-testid="mobile-toolbar-delete"
            >
              <Trash2 className="h-5 w-5" />
              <span className="sr-only">Delete node</span>
            </Button>
          </div>

          {/* Center: Zoom controls */}
          <div className="flex items-center gap-0.5 bg-muted rounded-xl p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onZoomOut}
              className="h-10 w-10 rounded-lg"
              data-testid="mobile-toolbar-zoom-out"
            >
              <ZoomOut className="h-5 w-5" />
              <span className="sr-only">Zoom out</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onFitView}
              className="h-10 w-10 rounded-lg"
              data-testid="mobile-toolbar-fit-view"
            >
              <Maximize2 className="h-5 w-5" />
              <span className="sr-only">Fit view</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onZoomIn}
              className="h-10 w-10 rounded-lg"
              data-testid="mobile-toolbar-zoom-in"
            >
              <ZoomIn className="h-5 w-5" />
              <span className="sr-only">Zoom in</span>
            </Button>
          </div>

          {/* Right: More options (triggers bottom sheet) */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              className="h-11 w-11 rounded-xl"
              data-testid="mobile-toolbar-undo"
            >
              <Undo2 className="h-5 w-5" />
              <span className="sr-only">Undo</span>
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsBottomSheetOpen(true)}
              className="h-11 w-11 rounded-xl"
              data-testid="mobile-toolbar-more"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="sr-only">More options</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Sheet for additional options */}
      <BottomSheet open={isBottomSheetOpen} onOpenChange={setIsBottomSheetOpen}>
        <BottomSheetContent
          size="md"
          data-testid="mobile-toolbar-bottom-sheet"
          aria-describedby="bottom-sheet-description"
        >
          <BottomSheetHeader>
            <div className="flex items-center justify-between">
              <BottomSheetTitle>Actions</BottomSheetTitle>
              <BottomSheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  data-testid="mobile-toolbar-close-sheet"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </BottomSheetClose>
            </div>
            <p id="bottom-sheet-description" className="text-sm text-muted-foreground">
              Additional actions and options for your mind map
            </p>
          </BottomSheetHeader>

          {/* Node Actions Section */}
          {selectedNodeId && (
            <BottomSheetSection title="Node Actions">
              <div className="grid grid-cols-2 gap-2">
                <BottomSheetAction
                  icon={<Plus className="h-5 w-5" />}
                  label="Add Child"
                  description="Create a child node"
                  onClick={handleAddChild}
                  disabled={!selectedNodeId}
                  data-testid="mobile-sheet-add-child"
                />
                <BottomSheetAction
                  icon={<Plus className="h-5 w-5" />}
                  label="Add Sibling"
                  description="Create a sibling node"
                  onClick={handleAddSibling}
                  disabled={!selectedNode?.data.parentId}
                  data-testid="mobile-sheet-add-sibling"
                />
                <BottomSheetAction
                  icon={<Copy className="h-5 w-5" />}
                  label="Duplicate"
                  description="Copy this node"
                  onClick={handleDuplicate}
                  disabled={!canDuplicate}
                  data-testid="mobile-sheet-duplicate"
                />
                <BottomSheetAction
                  icon={<Trash2 className="h-5 w-5" />}
                  label="Delete"
                  description="Remove this node"
                  onClick={handleDelete}
                  disabled={!canDelete}
                  destructive
                  data-testid="mobile-sheet-delete"
                />
              </div>
            </BottomSheetSection>
          )}

          {/* Styling Section */}
          {selectedNodeId && onStyleClick && (
            <BottomSheetSection title="Styling">
              <div className="grid grid-cols-2 gap-2">
                <BottomSheetAction
                  icon={<Palette className="h-5 w-5" />}
                  label="Colors"
                  description="Change node colors"
                  onClick={() => handleActionWithClose(onStyleClick)}
                  data-testid="mobile-sheet-colors"
                />
                <BottomSheetAction
                  icon={<Type className="h-5 w-5" />}
                  label="Text Style"
                  description="Format text"
                  onClick={() => handleActionWithClose(onStyleClick)}
                  data-testid="mobile-sheet-text"
                />
              </div>
            </BottomSheetSection>
          )}

          {/* Tools Section */}
          <BottomSheetSection title="Tools">
            <div className="grid grid-cols-2 gap-2">
              <BottomSheetAction
                icon={<Undo2 className="h-5 w-5" />}
                label="Undo"
                description="Undo last action"
                onClick={() => handleActionWithClose(onUndo)}
                disabled={!canUndo}
                data-testid="mobile-sheet-undo"
              />
              <BottomSheetAction
                icon={<Redo2 className="h-5 w-5" />}
                label="Redo"
                description="Redo last action"
                onClick={() => handleActionWithClose(onRedo)}
                disabled={!canRedo}
                data-testid="mobile-sheet-redo"
              />
              {onLayout && (
                <BottomSheetAction
                  icon={<Layout className="h-5 w-5" />}
                  label="Auto Layout"
                  description="Organize nodes"
                  onClick={() => handleActionWithClose(onLayout)}
                  data-testid="mobile-sheet-layout"
                />
              )}
              {onExport && (
                <BottomSheetAction
                  icon={<Download className="h-5 w-5" />}
                  label="Export"
                  description="Save as image"
                  onClick={() => handleActionWithClose(onExport)}
                  data-testid="mobile-sheet-export"
                />
              )}
              {onCollaborate && (
                <BottomSheetAction
                  icon={<Users className="h-5 w-5" />}
                  label="Collaborate"
                  description="Share with others"
                  onClick={() => handleActionWithClose(onCollaborate)}
                  data-testid="mobile-sheet-collaborate"
                />
              )}
            </div>
          </BottomSheetSection>
        </BottomSheetContent>
      </BottomSheet>
    </div>
  );
}
