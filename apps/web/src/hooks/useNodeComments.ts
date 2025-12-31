import { useState, useEffect, useCallback, useRef } from 'react';

export interface NodeCommentCount {
  nodeId: string;
  total: number;
  unresolved: number;
}

interface UseNodeCommentsOptions {
  mapId: string;
  enabled?: boolean;
  pollInterval?: number;
}

interface UseNodeCommentsReturn {
  commentCounts: Map<string, NodeCommentCount>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useNodeComments({
  mapId,
  enabled = true,
  pollInterval = 30000, // Poll every 30 seconds by default
}: UseNodeCommentsOptions): UseNodeCommentsReturn {
  const [commentCounts, setCommentCounts] = useState<Map<string, NodeCommentCount>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCommentCounts = useCallback(async () => {
    if (!mapId || !enabled) return;

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/maps/${mapId}/comments/nodes`, {
        credentials: 'include',
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch comment counts');
      }

      const data = await response.json();
      const counts = data.data as NodeCommentCount[];

      const countMap = new Map<string, NodeCommentCount>();
      counts.forEach((count) => {
        countMap.set(count.nodeId, count);
      });

      setCommentCounts(countMap);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore abort errors
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch comment counts');
    } finally {
      setLoading(false);
    }
  }, [mapId, enabled]);

  // Initial fetch and polling
  useEffect(() => {
    fetchCommentCounts();

    if (enabled && pollInterval > 0) {
      const interval = setInterval(fetchCommentCounts, pollInterval);
      return () => {
        clearInterval(interval);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchCommentCounts, enabled, pollInterval]);

  return {
    commentCounts,
    loading,
    error,
    refresh: fetchCommentCounts,
  };
}
