import { useState, useEffect, useCallback } from 'react';
import { useMapStore, type MindMapNode, type MindMapEdge } from '@/stores/mapStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface UseMapDataOptions {
  mapId: string | undefined;
  enabled?: boolean;
}

interface MapData {
  id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  isFavorite: boolean;
  settings: Record<string, unknown>;
  nodes: Array<{
    id: string;
    text: string;
    type: 'ROOT' | 'CHILD' | 'FLOATING';
    parentId: string | null;
    position: { x: number; y: number };
    style: Record<string, unknown>;
    metadata: Record<string, unknown>;
    isCollapsed: boolean;
  }>;
  connections: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    style: Record<string, unknown>;
  }>;
}

export function useMapData({ mapId, enabled = true }: UseMapDataOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);

  const { loadMap, initializeNewMap, setMapId, setTitle } = useMapStore();

  const fetchMap = useCallback(async () => {
    if (!mapId || !enabled) return;

    // Handle 'new' mapId - initialize new map
    if (mapId === 'new') {
      initializeNewMap();
      setMapId(null);
      setTitle('Untitled Mind Map');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/maps/${mapId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Map not found');
        }
        throw new Error('Failed to load map');
      }

      const result = await response.json();
      const data = result.data as MapData;
      setMapData(data);

      // Transform API data to store format
      const nodes: MindMapNode[] = (data.nodes || []).map((node) => ({
        id: node.id,
        type: 'mindMapNode',
        position: node.position || { x: 0, y: 0 },
        data: {
          id: node.id,
          text: node.text || '',
          type: node.type || 'CHILD',
          parentId: node.parentId,
          style: {
            backgroundColor: '#ffffff',
            borderColor: '#d1d5db',
            borderWidth: 1,
            borderRadius: 8,
            borderStyle: 'solid' as const,
            textColor: '#1f2937',
            fontSize: 14,
            fontWeight: 'normal' as const,
            fontStyle: 'normal' as const,
            shape: 'rounded' as const,
            ...node.style,
          },
          isCollapsed: node.isCollapsed || false,
          metadata: node.metadata || {},
        },
      }));

      const edges: MindMapEdge[] = (data.connections || []).map((conn) => ({
        id: conn.id,
        source: conn.source,
        target: conn.target,
        type: 'smoothstep',
      }));

      loadMap(mapId, nodes, edges, data.title || 'Untitled Mind Map');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Failed to load map:', err);

      // Initialize empty map on error
      initializeNewMap();
    } finally {
      setIsLoading(false);
    }
  }, [mapId, enabled, loadMap, initializeNewMap, setMapId, setTitle]);

  useEffect(() => {
    fetchMap();
  }, [fetchMap]);

  const saveMap = useCallback(async () => {
    const state = useMapStore.getState();
    if (!state.mapId) return;

    try {
      const payload = {
        title: state.title,
        nodes: state.nodes.map((node) => ({
          id: node.id,
          text: node.data.text,
          type: node.data.type,
          parentId: node.data.parentId,
          position: node.position,
          style: node.data.style,
          metadata: node.data.metadata,
          isCollapsed: node.data.isCollapsed,
        })),
        connections: state.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'HIERARCHICAL',
          style: edge.data?.style || {},
        })),
      };

      await fetch(`${API_URL}/api/maps/${state.mapId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Failed to save map:', err);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchMap();
  }, [fetchMap]);

  return {
    isLoading,
    error,
    mapData,
    refetch,
    saveMap,
  };
}
