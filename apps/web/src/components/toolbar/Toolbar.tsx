import { useCallback, useState } from 'react';
import {
  Plus,
  Trash2,
  Layout,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Download,
  ChevronDown,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowLeft,
  Circle,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useMapStore } from '@/stores/mapStore';
import { useAutoLayout, type LayoutDirection } from '@/hooks/useAutoLayout';
import { useOnDemandLayout, type LayoutMode, type TreeDirection } from '@/hooks/useOnDemandLayout';
import { cn } from '@/lib/utils';

// Layout direction configuration for tree layout
const TREE_DIRECTIONS: {
  value: TreeDirection;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: 'LR',
    label: 'Left to Right',
    icon: <ArrowRight className="h-4 w-4" />,
    description: 'Horizontal layout from left to right',
  },
  {
    value: 'RL',
    label: 'Right to Left',
    icon: <ArrowLeft className="h-4 w-4" />,
    description: 'Horizontal layout from right to left',
  },
  {
    value: 'TB',
    label: 'Top to Bottom',
    icon: <ArrowDown className="h-4 w-4" />,
    description: 'Vertical layout from top to bottom',
  },
  {
    value: 'BT',
    label: 'Bottom to Top',
    icon: <ArrowUp className="h-4 w-4" />,
    description: 'Vertical layout from bottom to top',
  },
];

// Layout mode configuration
const LAYOUT_MODES: {
  value: LayoutMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: 'tree',
    label: 'Tree Layout',
    icon: <Layout className="h-4 w-4" />,
    description: 'Hierarchical tree structure',
  },
  {
    value: 'radial',
    label: 'Radial Layout',
    icon: <Circle className="h-4 w-4" />,
    description: 'Circular arrangement from center',
  },
];

// For backward compatibility, keep original type
const LAYOUT_DIRECTIONS = TREE_DIRECTIONS;

interface ToolbarProps {
  onExport?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
}

function ToolbarButton({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
  className,
  'data-testid': testId,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
          className={className}
          data-testid={testId}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {label}
          {shortcut && (
            <span className="ml-2 text-muted-foreground">({shortcut})</span>
          )}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-1" />;
}

export function Toolbar({
  onExport,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: ToolbarProps) {
  const { selectedNodeId, addNode, deleteNode, nodes } = useMapStore();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  // Note: We use useAutoLayout for backward compatibility, but prefer useOnDemandLayout
  const { isLayouting } = useAutoLayout();
  const {
    triggerLayout,
    isLayouting: isOnDemandLayouting,
  } = useOnDemandLayout();
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('LR');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('tree');

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const canDelete = selectedNode && selectedNode.data.type !== 'ROOT';
  const isAnyLayouting = isLayouting || isOnDemandLayouting;

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
    if (layoutMode === 'radial') {
      triggerLayout({ mode: 'radial', animate: true });
    } else {
      triggerLayout({ mode: 'tree', direction: layoutDirection, animate: true });
    }
  }, [triggerLayout, layoutMode, layoutDirection]);

  const handleLayoutWithDirection = useCallback(
    (direction: LayoutDirection) => {
      setLayoutDirection(direction);
      setLayoutMode('tree');
      triggerLayout({ mode: 'tree', direction, animate: true });
    },
    [triggerLayout]
  );

  const handleLayoutWithMode = useCallback(
    (mode: LayoutMode) => {
      setLayoutMode(mode);
      if (mode === 'radial') {
        triggerLayout({ mode: 'radial', animate: true });
      } else {
        triggerLayout({ mode: 'tree', direction: layoutDirection, animate: true });
      }
    },
    [triggerLayout, layoutDirection]
  );

  const currentDirection = LAYOUT_DIRECTIONS.find(
    (d) => d.value === layoutDirection
  );

  const currentLayoutMode = LAYOUT_MODES.find(
    (m) => m.value === layoutMode
  );

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);

  const handleUndo = useCallback(() => {
    if (onUndo && canUndo) {
      onUndo();
    }
  }, [onUndo, canUndo]);

  const handleRedo = useCallback(() => {
    if (onRedo && canRedo) {
      onRedo();
    }
  }, [onRedo, canRedo]);

  const handleExport = useCallback(() => {
    if (onExport) {
      onExport();
    }
  }, [onExport]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex items-center gap-1 px-2 py-1.5 bg-background border border-border rounded-lg shadow-lg"
        data-testid="toolbar"
      >
        {/* Node operations */}
        <ToolbarButton
          icon={<Plus className="h-4 w-4" />}
          label="Add child node"
          shortcut="Tab"
          onClick={handleAddChild}
          disabled={!selectedNodeId}
          data-testid="toolbar-add-node"
        />

        <ToolbarButton
          icon={<Trash2 className="h-4 w-4" />}
          label="Delete node"
          shortcut="Delete"
          onClick={handleDelete}
          disabled={!canDelete}
          data-testid="toolbar-delete-node"
        />

        <ToolbarDivider />

        {/* Undo/Redo */}
        <ToolbarButton
          icon={<Undo2 className="h-4 w-4" />}
          label="Undo"
          shortcut="Ctrl+Z"
          onClick={handleUndo}
          disabled={!canUndo}
          data-testid="toolbar-undo"
        />

        <ToolbarButton
          icon={<Redo2 className="h-4 w-4" />}
          label="Redo"
          shortcut="Ctrl+Y"
          onClick={handleRedo}
          disabled={!canRedo}
          data-testid="toolbar-redo"
        />

        <ToolbarDivider />

        {/* Layout with direction selector */}
        <div className="flex items-center" data-testid="layout-controls">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLayout}
                disabled={isAnyLayouting}
                data-testid="toolbar-layout"
                className="rounded-r-none"
              >
                {layoutMode === 'radial' ? (
                  <Circle
                    className={cn('h-4 w-4', isAnyLayouting && 'animate-spin')}
                  />
                ) : (
                  <Layout
                    className={cn('h-4 w-4', isAnyLayouting && 'animate-spin')}
                  />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Auto layout
                <span className="ml-2 text-muted-foreground">
                  ({currentLayoutMode?.label}{layoutMode === 'tree' ? ` - ${currentDirection?.label}` : ''})
                </span>
              </p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isAnyLayouting}
                    data-testid="toolbar-layout-direction"
                    className="rounded-l-none border-l border-border w-6 px-0"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Select layout mode & direction</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" data-testid="layout-direction-menu">
              <DropdownMenuLabel>Layout Mode</DropdownMenuLabel>
              {LAYOUT_MODES.map((mode) => (
                <DropdownMenuItem
                  key={mode.value}
                  onClick={() => handleLayoutWithMode(mode.value)}
                  className={cn(
                    'flex items-center gap-2',
                    mode.value === layoutMode && 'bg-accent'
                  )}
                  data-testid={`layout-mode-${mode.value}`}
                >
                  {mode.icon}
                  <div className="flex flex-col">
                    <span className="font-medium">{mode.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {mode.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Tree Direction</DropdownMenuLabel>
              {LAYOUT_DIRECTIONS.map((direction) => (
                <DropdownMenuItem
                  key={direction.value}
                  onClick={() => handleLayoutWithDirection(direction.value)}
                  className={cn(
                    'flex items-center gap-2',
                    direction.value === layoutDirection && 'bg-accent'
                  )}
                  data-testid={`layout-direction-${direction.value.toLowerCase()}`}
                >
                  {direction.icon}
                  <div className="flex flex-col">
                    <span className="font-medium">{direction.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {direction.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ToolbarDivider />

        {/* Zoom controls */}
        <ToolbarButton
          icon={<ZoomOut className="h-4 w-4" />}
          label="Zoom out"
          shortcut="Ctrl+-"
          onClick={() => zoomOut()}
          data-testid="toolbar-zoom-out"
        />

        <ToolbarButton
          icon={<ZoomIn className="h-4 w-4" />}
          label="Zoom in"
          shortcut="Ctrl++"
          onClick={() => zoomIn()}
          data-testid="toolbar-zoom-in"
        />

        <ToolbarButton
          icon={<Maximize2 className="h-4 w-4" />}
          label="Fit view"
          shortcut="Ctrl+0"
          onClick={handleFitView}
          data-testid="toolbar-fit-view"
        />

        {/* Export (only show if handler provided) */}
        {onExport && (
          <>
            <ToolbarDivider />
            <ToolbarButton
              icon={<Download className="h-4 w-4" />}
              label="Export"
              onClick={handleExport}
              data-testid="toolbar-export"
            />
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
