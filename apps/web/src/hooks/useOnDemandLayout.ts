import { useCallback, useState, useRef, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import { useMapStore, type MindMapNode } from '@/stores/mapStore';

// Default node dimensions for layout calculations
const NODE_WIDTH = 150;
const NODE_HEIGHT = 50;

/**
 * Layout mode types - determines the algorithm used for positioning nodes
 */
export type LayoutMode = 'tree' | 'radial';

/**
 * Direction for tree layout
 */
export type TreeDirection = 'TB' | 'LR' | 'BT' | 'RL';

/**
 * Options for configuring the layout behavior
 */
export interface OnDemandLayoutOptions {
  /** Layout mode - 'tree' uses dagre hierarchical layout, 'radial' arranges in concentric circles */
  mode?: LayoutMode;
  /** Direction for tree layout (top-bottom, left-right, etc.) */
  direction?: TreeDirection;
  /** Space between sibling nodes */
  nodeSeparation?: number;
  /** Space between levels/ranks in tree layout */
  rankSeparation?: number;
  /** Horizontal margin around the layout */
  marginX?: number;
  /** Vertical margin around the layout */
  marginY?: number;
  /** Whether to animate the transition to new positions */
  animate?: boolean;
  /** Duration of animation in milliseconds */
  animationDuration?: number;
  /** Whether to preserve positions of manually positioned nodes */
  preserveManualPositions?: boolean;
  /** Callback when layout starts */
  onLayoutStart?: () => void;
  /** Callback when layout completes */
  onLayoutComplete?: () => void;
  /** Radius increment for each level in radial layout */
  radialLevelRadius?: number;
  /** Starting angle in degrees for radial layout */
  radialStartAngle?: number;
  /** Angle spread in degrees for radial layout (default 360 for full circle) */
  radialAngleSpread?: number;
}

const DEFAULT_OPTIONS: Required<Omit<OnDemandLayoutOptions, 'onLayoutStart' | 'onLayoutComplete'>> = {
  mode: 'tree',
  direction: 'LR',
  nodeSeparation: 50,
  rankSeparation: 100,
  marginX: 50,
  marginY: 50,
  animate: true,
  animationDuration: 300,
  preserveManualPositions: true,
  radialLevelRadius: 150,
  radialStartAngle: -90,
  radialAngleSpread: 360,
};

/**
 * Return type for the useOnDemandLayout hook
 */
export interface UseOnDemandLayoutReturn {
  /** Trigger layout with specified mode and options */
  triggerLayout: (options?: OnDemandLayoutOptions) => Promise<void>;
  /** Whether a layout animation is currently in progress */
  isLayouting: boolean;
  /** The currently active layout mode, or null if no layout has been performed */
  currentMode: LayoutMode | null;
  /** Set of node IDs that will be affected by layout (respects preserveManualPositions) */
  getAffectedNodeIds: () => Set<string>;
  /** Mark a node as manually positioned (will be skipped during layout if preserveManualPositions is true) */
  markNodeAsManual: (nodeId: string) => void;
  /** Unmark a node as manually positioned (will be included in layout) */
  unmarkNodeAsManual: (nodeId: string) => void;
  /** Check if a node can be auto-laid out (not marked as manual) */
  canAutoLayout: (nodeId: string) => boolean;
  /** Cancel any ongoing animation */
  cancelAnimation: () => void;
  /** Get a preview of node positions after layout without applying changes */
  getLayoutPreview: (options?: OnDemandLayoutOptions) => MindMapNode[] | null;
  /** Calculate positions without applying them */
  calculateLayout: (options?: OnDemandLayoutOptions) => Map<string, { x: number; y: number }> | null;
  /** Reset manual position tracking for all nodes */
  resetManualPositions: () => void;
  /** Get the set of manually positioned node IDs */
  getManuallyPositionedNodes: () => Set<string>;
}

/**
 * Easing function for smooth animation (cubic ease-out)
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Interpolate between two positions with easing
 */
function interpolatePosition(
  start: { x: number; y: number },
  end: { x: number; y: number },
  progress: number
): { x: number; y: number } {
  const easedProgress = easeOutCubic(progress);
  return {
    x: start.x + (end.x - start.x) * easedProgress,
    y: start.y + (end.y - start.y) * easedProgress,
  };
}

/**
 * Calculate radial layout positions
 * Positions nodes in concentric circles based on their distance from the root
 */
function calculateRadialLayout(
  nodes: MindMapNode[],
  edges: { source: string; target: string }[],
  options: Required<Omit<OnDemandLayoutOptions, 'onLayoutStart' | 'onLayoutComplete'>>
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  if (nodes.length === 0) return positions;

  // Build adjacency map for efficient traversal
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  edges.forEach(edge => {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    childrenMap.get(edge.source)!.push(edge.target);
    parentMap.set(edge.target, edge.source);
  });

  // Find root node (node with no parent)
  const rootNode = nodes.find(node => !parentMap.has(node.id));
  if (!rootNode) {
    // Fallback: use first node as root
    const fallbackRoot = nodes[0];
    positions.set(fallbackRoot.id, { x: 0, y: 0 });
    return positions;
  }

  // Calculate levels using BFS
  const levels = new Map<string, number>();
  const levelNodes = new Map<number, string[]>();
  const queue: { id: string; level: number }[] = [{ id: rootNode.id, level: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    levels.set(id, level);
    if (!levelNodes.has(level)) {
      levelNodes.set(level, []);
    }
    levelNodes.get(level)!.push(id);

    const children = childrenMap.get(id) || [];
    children.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }

  // Position root at center
  positions.set(rootNode.id, { x: 0, y: 0 });

  // Convert angles to radians
  const startAngleRad = (options.radialStartAngle * Math.PI) / 180;
  const spreadRad = (options.radialAngleSpread * Math.PI) / 180;

  // Position nodes at each level
  const maxLevel = Math.max(...Array.from(levels.values()));

  for (let level = 1; level <= maxLevel; level++) {
    const nodesAtLevel = levelNodes.get(level) || [];
    if (nodesAtLevel.length === 0) continue;

    const radius = level * options.radialLevelRadius;

    // Group nodes by their parent to maintain subtree adjacency
    const nodesByParent = new Map<string, string[]>();
    nodesAtLevel.forEach(nodeId => {
      const parent = parentMap.get(nodeId) || '';
      if (!nodesByParent.has(parent)) {
        nodesByParent.set(parent, []);
      }
      nodesByParent.get(parent)!.push(nodeId);
    });

    // Calculate angle distribution
    // Each subtree gets a proportional slice of the angle based on its size
    const parents = Array.from(nodesByParent.keys());

    if (level === 1) {
      // First level: distribute evenly around the root
      const anglePerNode = spreadRad / nodesAtLevel.length;
      let currentAngle = startAngleRad;
      nodesAtLevel.forEach(nodeId => {
        const x = Math.cos(currentAngle) * radius;
        const y = Math.sin(currentAngle) * radius;
        positions.set(nodeId, { x, y });
        currentAngle += anglePerNode;
      });
    } else {
      // Subsequent levels: position relative to parent angle
      parents.forEach(parentId => {
        const parentPos = positions.get(parentId);
        if (!parentPos) return;

        const children = nodesByParent.get(parentId) || [];
        const parentAngle = Math.atan2(parentPos.y, parentPos.x);

        // Calculate spread based on parent's "angular territory"
        const parentLevel = levels.get(parentId) || 0;
        const siblingsAtParentLevel = (levelNodes.get(parentLevel) || []).length;
        const parentSpread = spreadRad / Math.max(siblingsAtParentLevel, 1);

        const childSpread = parentSpread / Math.max(children.length, 1);
        let childAngle = parentAngle - (parentSpread / 2) + (childSpread / 2);

        children.forEach(childId => {
          const x = Math.cos(childAngle) * radius;
          const y = Math.sin(childAngle) * radius;
          positions.set(childId, { x, y });
          childAngle += childSpread;
        });
      });
    }
  }

  // Apply margin offset
  const minX = Math.min(...Array.from(positions.values()).map(p => p.x));
  const minY = Math.min(...Array.from(positions.values()).map(p => p.y));

  positions.forEach((pos, id) => {
    positions.set(id, {
      x: pos.x - minX + options.marginX,
      y: pos.y - minY + options.marginY,
    });
  });

  return positions;
}

/**
 * Calculate tree layout positions using dagre
 */
function calculateTreeLayout(
  nodes: MindMapNode[],
  edges: { source: string; target: string }[],
  options: Required<Omit<OnDemandLayoutOptions, 'onLayoutStart' | 'onLayoutComplete'>>
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  if (nodes.length === 0) return positions;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: options.direction,
    nodesep: options.nodeSeparation,
    ranksep: options.rankSeparation,
    marginx: options.marginX,
    marginy: options.marginY,
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: node.width || NODE_WIDTH,
      height: node.height || NODE_HEIGHT,
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Extract positions (adjust for node center to top-left corner)
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (nodeWithPosition) {
      positions.set(node.id, {
        x: nodeWithPosition.x - (node.width || NODE_WIDTH) / 2,
        y: nodeWithPosition.y - (node.height || NODE_HEIGHT) / 2,
      });
    }
  });

  return positions;
}

/**
 * React hook for triggering auto-layout on demand with support for different layout modes
 * and preservation of manually positioned nodes.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     triggerLayout,
 *     isLayouting,
 *     markNodeAsManual,
 *   } = useOnDemandLayout();
 *
 *   // Trigger tree layout
 *   const handleTreeLayout = () => {
 *     triggerLayout({ mode: 'tree', direction: 'TB' });
 *   };
 *
 *   // Trigger radial layout
 *   const handleRadialLayout = () => {
 *     triggerLayout({ mode: 'radial', radialLevelRadius: 200 });
 *   };
 *
 *   // Mark a node as manually positioned (won't be moved by layout)
 *   const handleDragEnd = (nodeId: string) => {
 *     markNodeAsManual(nodeId);
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleTreeLayout} disabled={isLayouting}>
 *         Tree Layout
 *       </button>
 *       <button onClick={handleRadialLayout} disabled={isLayouting}>
 *         Radial Layout
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useOnDemandLayout(): UseOnDemandLayoutReturn {
  const [isLayouting, setIsLayouting] = useState(false);
  const [currentMode, setCurrentMode] = useState<LayoutMode | null>(null);
  const manuallyPositionedNodesRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number | null>(null);

  const { nodes, edges, setNodes } = useMapStore();
  const { fitView } = useReactFlow();

  // Cancel any ongoing animation
  const cancelAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Mark a node as manually positioned
  const markNodeAsManual = useCallback((nodeId: string) => {
    manuallyPositionedNodesRef.current.add(nodeId);
  }, []);

  // Unmark a node as manually positioned
  const unmarkNodeAsManual = useCallback((nodeId: string) => {
    manuallyPositionedNodesRef.current.delete(nodeId);
  }, []);

  // Check if a node can be auto-laid out
  const canAutoLayout = useCallback((nodeId: string) => {
    return !manuallyPositionedNodesRef.current.has(nodeId);
  }, []);

  // Reset all manual position tracking
  const resetManualPositions = useCallback(() => {
    manuallyPositionedNodesRef.current.clear();
  }, []);

  // Get the set of manually positioned nodes
  const getManuallyPositionedNodes = useCallback(() => {
    return new Set(manuallyPositionedNodesRef.current);
  }, []);

  // Get affected node IDs (nodes that will be moved by layout)
  const getAffectedNodeIds = useCallback(() => {
    const affected = new Set<string>();
    nodes.forEach(node => {
      if (!manuallyPositionedNodesRef.current.has(node.id)) {
        affected.add(node.id);
      }
    });
    return affected;
  }, [nodes]);

  // Calculate layout positions
  const calculateLayout = useCallback(
    (options: OnDemandLayoutOptions = {}): Map<string, { x: number; y: number }> | null => {
      const opts = { ...DEFAULT_OPTIONS, ...options };

      if (nodes.length === 0) return null;

      // Filter nodes and edges based on preserveManualPositions setting
      const nodesToLayout = opts.preserveManualPositions
        ? nodes.filter(node => !manuallyPositionedNodesRef.current.has(node.id))
        : nodes;

      // If all nodes are manually positioned, nothing to layout
      if (nodesToLayout.length === 0) return new Map();

      // Get edges only between nodes being laid out
      const nodeIdsToLayout = new Set(nodesToLayout.map(n => n.id));
      const edgesToUse = edges
        .filter(e => nodeIdsToLayout.has(e.source) && nodeIdsToLayout.has(e.target))
        .map(e => ({ source: e.source, target: e.target }));

      // Calculate positions based on layout mode
      let positions: Map<string, { x: number; y: number }>;

      if (opts.mode === 'radial') {
        positions = calculateRadialLayout(nodesToLayout, edgesToUse, opts);
      } else {
        positions = calculateTreeLayout(nodesToLayout, edgesToUse, opts);
      }

      return positions;
    },
    [nodes, edges]
  );

  // Animate nodes to their new positions
  const animateToPositions = useCallback(
    (
      targetPositions: Map<string, { x: number; y: number }>,
      duration: number
    ): Promise<void> => {
      return new Promise((resolve) => {
        const startTime = performance.now();
        const startPositions = new Map<string, { x: number; y: number }>();

        // Store starting positions
        nodes.forEach((node) => {
          startPositions.set(node.id, { ...node.position });
        });

        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Calculate interpolated positions
          const animatedNodes: MindMapNode[] = nodes.map((node) => {
            const startPos = startPositions.get(node.id);
            const targetPos = targetPositions.get(node.id);

            // If no target position (manually positioned node), keep current position
            if (!targetPos) {
              return node;
            }

            if (!startPos) {
              return {
                ...node,
                position: targetPos,
              };
            }

            return {
              ...node,
              position: interpolatePosition(startPos, targetPos, progress),
            };
          });

          setNodes(animatedNodes);

          if (progress < 1) {
            animationFrameRef.current = requestAnimationFrame(animate);
          } else {
            animationFrameRef.current = null;
            resolve();
          }
        };

        animationFrameRef.current = requestAnimationFrame(animate);
      });
    },
    [nodes, setNodes]
  );

  // Main layout trigger function
  const triggerLayout = useCallback(
    async (options: OnDemandLayoutOptions = {}) => {
      const opts = { ...DEFAULT_OPTIONS, ...options };

      if (nodes.length === 0) return;

      // Cancel any ongoing animation
      cancelAnimation();

      setIsLayouting(true);
      setCurrentMode(opts.mode);

      // Call onLayoutStart callback if provided
      options.onLayoutStart?.();

      try {
        // Calculate new positions
        const targetPositions = calculateLayout(opts);

        if (!targetPositions || targetPositions.size === 0) {
          setIsLayouting(false);
          options.onLayoutComplete?.();
          return;
        }

        if (opts.animate) {
          // Animate to new positions
          await animateToPositions(targetPositions, opts.animationDuration);
        } else {
          // Apply positions immediately
          const layoutedNodes: MindMapNode[] = nodes.map((node) => {
            const targetPos = targetPositions.get(node.id);
            return {
              ...node,
              position: targetPos || node.position,
            };
          });
          setNodes(layoutedNodes);
        }

        // Fit view after layout
        setTimeout(() => {
          fitView({ padding: 0.2, duration: opts.animate ? 200 : 0 });
          setIsLayouting(false);
          options.onLayoutComplete?.();
        }, opts.animate ? 50 : 0);
      } catch (error) {
        console.error('Layout error:', error);
        setIsLayouting(false);
        options.onLayoutComplete?.();
      }
    },
    [nodes, calculateLayout, animateToPositions, cancelAnimation, setNodes, fitView]
  );

  // Get layout preview without applying changes
  const getLayoutPreview = useCallback(
    (options?: OnDemandLayoutOptions): MindMapNode[] | null => {
      const positions = calculateLayout(options);
      if (!positions) return null;

      return nodes.map((node) => ({
        ...node,
        position: positions.get(node.id) || node.position,
      }));
    },
    [nodes, calculateLayout]
  );

  // Return memoized hook API
  return useMemo(
    () => ({
      triggerLayout,
      isLayouting,
      currentMode,
      getAffectedNodeIds,
      markNodeAsManual,
      unmarkNodeAsManual,
      canAutoLayout,
      cancelAnimation,
      getLayoutPreview,
      calculateLayout,
      resetManualPositions,
      getManuallyPositionedNodes,
    }),
    [
      triggerLayout,
      isLayouting,
      currentMode,
      getAffectedNodeIds,
      markNodeAsManual,
      unmarkNodeAsManual,
      canAutoLayout,
      cancelAnimation,
      getLayoutPreview,
      calculateLayout,
      resetManualPositions,
      getManuallyPositionedNodes,
    ]
  );
}
