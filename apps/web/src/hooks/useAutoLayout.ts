import { useCallback, useState, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import { useMapStore, type MindMapNode } from '@/stores/mapStore';

const NODE_WIDTH = 150;
const NODE_HEIGHT = 50;

// Layout direction types
export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL';

// Layout options for customization
export interface LayoutOptions {
  direction?: LayoutDirection;
  nodeSeparation?: number;
  rankSeparation?: number;
  marginX?: number;
  marginY?: number;
  animate?: boolean;
  animationDuration?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: 'LR',
  nodeSeparation: 50,
  rankSeparation: 100,
  marginX: 50,
  marginY: 50,
  animate: true,
  animationDuration: 300,
};

// Easing function for smooth animation
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Interpolate between two positions
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

export function useAutoLayout() {
  const [isLayouting, setIsLayouting] = useState(false);
  const { nodes, edges, setNodes } = useMapStore();
  const { fitView } = useReactFlow();
  const animationFrameRef = useRef<number | null>(null);

  // Cancel any ongoing animation
  const cancelAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Calculate layout positions using Dagre
  const calculateLayout = useCallback(
    (options: LayoutOptions = {}): Map<string, { x: number; y: number }> | null => {
      const opts = { ...DEFAULT_OPTIONS, ...options };

      if (nodes.length === 0) return null;

      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));

      dagreGraph.setGraph({
        rankdir: opts.direction,
        nodesep: opts.nodeSeparation,
        ranksep: opts.rankSeparation,
        marginx: opts.marginX,
        marginy: opts.marginY,
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

      // Extract positions
      const positions = new Map<string, { x: number; y: number }>();
      nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        positions.set(node.id, {
          x: nodeWithPosition.x - (node.width || NODE_WIDTH) / 2,
          y: nodeWithPosition.y - (node.height || NODE_HEIGHT) / 2,
        });
      });

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

            if (!startPos || !targetPos) {
              return node;
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

  // Main layout function with smooth animation
  const layoutNodes = useCallback(
    async (optionsOrDirection?: LayoutOptions | LayoutDirection) => {
      // Handle both old API (direction string) and new API (options object)
      const options: LayoutOptions =
        typeof optionsOrDirection === 'string'
          ? { direction: optionsOrDirection }
          : optionsOrDirection || {};

      const opts = { ...DEFAULT_OPTIONS, ...options };

      if (nodes.length === 0) return;

      // Cancel any ongoing animation
      cancelAnimation();

      setIsLayouting(true);

      try {
        // Calculate new positions
        const targetPositions = calculateLayout(opts);

        if (!targetPositions) {
          setIsLayouting(false);
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
        }, opts.animate ? 50 : 0);
      } catch (error) {
        console.error('Layout error:', error);
        setIsLayouting(false);
      }
    },
    [nodes, calculateLayout, animateToPositions, cancelAnimation, setNodes, fitView]
  );

  // Get layout preview without applying (useful for UI preview)
  const getLayoutPreview = useCallback(
    (options?: LayoutOptions): MindMapNode[] | null => {
      const positions = calculateLayout(options);
      if (!positions) return null;

      return nodes.map((node) => ({
        ...node,
        position: positions.get(node.id) || node.position,
      }));
    },
    [nodes, calculateLayout]
  );

  return {
    layoutNodes,
    isLayouting,
    calculateLayout,
    getLayoutPreview,
    cancelAnimation,
  };
}
