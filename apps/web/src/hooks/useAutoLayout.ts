import { useCallback, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import { useMapStore, type MindMapNode } from '@/stores/mapStore';

const NODE_WIDTH = 150;
const NODE_HEIGHT = 50;

export function useAutoLayout() {
  const [isLayouting, setIsLayouting] = useState(false);
  const { nodes, edges, setNodes } = useMapStore();
  const { fitView } = useReactFlow();

  const layoutNodes = useCallback(
    (direction: 'TB' | 'LR' | 'BT' | 'RL' = 'LR') => {
      if (nodes.length === 0) return;

      setIsLayouting(true);

      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));

      dagreGraph.setGraph({
        rankdir: direction,
        nodesep: 50,
        ranksep: 100,
        marginx: 50,
        marginy: 50,
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

      // Apply positions back to nodes
      const layoutedNodes: MindMapNode[] = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        return {
          ...node,
          position: {
            x: nodeWithPosition.x - (node.width || NODE_WIDTH) / 2,
            y: nodeWithPosition.y - (node.height || NODE_HEIGHT) / 2,
          },
        };
      });

      setNodes(layoutedNodes);

      // Fit view after layout
      setTimeout(() => {
        fitView({ padding: 0.2 });
        setIsLayouting(false);
      }, 50);
    },
    [nodes, edges, setNodes, fitView]
  );

  return { layoutNodes, isLayouting };
}
