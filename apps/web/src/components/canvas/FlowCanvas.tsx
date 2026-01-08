import { ReactNode, useCallback, useMemo, type MouseEvent as ReactMouseEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeMouseHandler,
  type ProOptions,
  BackgroundVariant,
  type FitViewOptions,
  type DefaultEdgeOptions,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { cn } from '@/lib/utils';

/** Handler for pane (background) click events */
type OnPaneClick = (event: ReactMouseEvent) => void;

/**
 * Configuration options for the Background component
 */
export interface BackgroundConfig {
  /** Background variant: 'dots', 'lines', or 'cross' */
  variant?: BackgroundVariant;
  /** Gap between pattern elements */
  gap?: number;
  /** Size of pattern elements */
  size?: number;
  /** Color of the pattern */
  color?: string;
  /** Whether to show the background */
  enabled?: boolean;
}

/**
 * Configuration options for the Controls component
 */
export interface ControlsConfig {
  /** Whether to show the controls */
  enabled?: boolean;
  /** Whether to show the interactive/lock button */
  showInteractive?: boolean;
  /** Whether to show zoom controls */
  showZoom?: boolean;
  /** Whether to show fit view button */
  showFitView?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Position of controls */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Configuration options for the MiniMap component
 */
export interface MiniMapConfig {
  /** Whether to show the minimap */
  enabled?: boolean;
  /** Function to determine node color in minimap */
  nodeColor?: (node: Node) => string;
  /** Color of the mask overlay */
  maskColor?: string;
  /** Additional CSS class names */
  className?: string;
  /** Whether the minimap is zoomable */
  zoomable?: boolean;
  /** Whether the minimap is pannable */
  pannable?: boolean;
}

/**
 * Props for the FlowCanvas component
 */
export interface FlowCanvasProps {
  /** Array of nodes to display */
  nodes: Node[];
  /** Array of edges connecting nodes */
  edges: Edge[];
  /** Handler for node changes (position, selection, etc.) */
  onNodesChange?: OnNodesChange;
  /** Handler for edge changes */
  onEdgesChange?: OnEdgesChange;
  /** Handler for new connections */
  onConnect?: OnConnect;
  /** Handler for node click events */
  onNodeClick?: NodeMouseHandler;
  /** Handler for pane (background) click events */
  onPaneClick?: OnPaneClick;
  /** Custom node type definitions */
  nodeTypes?: NodeTypes;
  /** Custom edge type definitions */
  edgeTypes?: EdgeTypes;
  /** Background configuration */
  background?: BackgroundConfig;
  /** Controls configuration */
  controls?: ControlsConfig;
  /** MiniMap configuration */
  miniMap?: MiniMapConfig;
  /** Whether to fit the view to nodes on mount */
  fitView?: boolean;
  /** Options for fit view behavior */
  fitViewOptions?: FitViewOptions;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Default edge options applied to all edges */
  defaultEdgeOptions?: DefaultEdgeOptions;
  /** Additional CSS class name for the canvas */
  className?: string;
  /** Child components to render inside ReactFlow (e.g., Panel) */
  children?: ReactNode;
  /** Pro options for ReactFlow */
  proOptions?: ProOptions;
  /** Whether panning is allowed on drag */
  panOnDrag?: boolean | number[];
  /** Whether selection is allowed on drag */
  selectionOnDrag?: boolean;
}

/**
 * Default background configuration
 */
const defaultBackgroundConfig: Required<BackgroundConfig> = {
  variant: BackgroundVariant.Dots,
  gap: 20,
  size: 1,
  color: '#d1d5db',
  enabled: true,
};

/**
 * Default controls configuration
 */
const defaultControlsConfig: Required<ControlsConfig> = {
  enabled: true,
  showInteractive: false,
  showZoom: true,
  showFitView: true,
  className: '!shadow-lg !rounded-lg !border !border-border',
  position: 'bottom-left',
};

/**
 * Default minimap configuration
 */
const defaultMiniMapConfig: Required<MiniMapConfig> = {
  enabled: true,
  nodeColor: () => '#9ca3af',
  maskColor: 'rgba(0,0,0,0.1)',
  className: '!shadow-lg !rounded-lg !border !border-border',
  zoomable: true,
  pannable: true,
};

/**
 * FlowCanvas - A reusable wrapper component for @xyflow/react
 *
 * Provides a pre-configured React Flow canvas with Background, Controls, and MiniMap.
 * All components can be customized or disabled through configuration props.
 *
 * @example
 * ```tsx
 * <ReactFlowProvider>
 *   <FlowCanvas
 *     nodes={nodes}
 *     edges={edges}
 *     onNodesChange={onNodesChange}
 *     onEdgesChange={onEdgesChange}
 *     onConnect={onConnect}
 *     background={{ variant: BackgroundVariant.Lines }}
 *     controls={{ position: 'top-right' }}
 *     miniMap={{ enabled: false }}
 *   />
 * </ReactFlowProvider>
 * ```
 */
export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  nodeTypes,
  edgeTypes,
  background,
  controls,
  miniMap,
  fitView = true,
  fitViewOptions = { padding: 0.2 },
  minZoom = 0.25,
  maxZoom = 4,
  defaultEdgeOptions = { type: 'smoothstep' },
  className,
  children,
  proOptions = { hideAttribution: true },
  panOnDrag = true,
  selectionOnDrag = false,
}: FlowCanvasProps) {
  // Merge configurations with defaults
  const backgroundConfig = useMemo(
    () => ({ ...defaultBackgroundConfig, ...background }),
    [background]
  );

  const controlsConfig = useMemo(
    () => ({ ...defaultControlsConfig, ...controls }),
    [controls]
  );

  const miniMapConfig = useMemo(
    () => ({ ...defaultMiniMapConfig, ...miniMap }),
    [miniMap]
  );

  // Memoize node color function for minimap
  const nodeColorFn = useCallback(
    (node: Node) => miniMapConfig.nodeColor(node),
    [miniMapConfig]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={fitView}
        fitViewOptions={fitViewOptions}
        minZoom={minZoom}
        maxZoom={maxZoom}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={proOptions}
        panOnDrag={panOnDrag}
        selectionOnDrag={selectionOnDrag}
        className={cn('bg-slate-50', className)}
      >
        {/* Background */}
        {backgroundConfig.enabled && (
          <Background
            variant={backgroundConfig.variant}
            gap={backgroundConfig.gap}
            size={backgroundConfig.size}
            color={backgroundConfig.color}
          />
        )}

        {/* Controls */}
        {controlsConfig.enabled && (
          <Controls
            showInteractive={controlsConfig.showInteractive}
            showZoom={controlsConfig.showZoom}
            showFitView={controlsConfig.showFitView}
            className={controlsConfig.className}
            position={controlsConfig.position}
          />
        )}

        {/* MiniMap */}
        {miniMapConfig.enabled && (
          <MiniMap
            nodeColor={nodeColorFn}
            maskColor={miniMapConfig.maskColor}
            className={miniMapConfig.className}
            zoomable={miniMapConfig.zoomable}
            pannable={miniMapConfig.pannable}
          />
        )}

        {/* Additional children (e.g., Panels, custom overlays) */}
        {children}
      </ReactFlow>
    </div>
  );
}

export default FlowCanvas;
