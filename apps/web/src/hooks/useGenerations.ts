import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface GenerationInfo {
  generation: number;
  count: number;
}

interface UseGenerationsResult {
  generations: GenerationInfo[];
  minGeneration: number;
  maxGeneration: number;
  totalGenerations: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useGenerations(treeId: string): UseGenerationsResult {
  const [generations, setGenerations] = useState<GenerationInfo[]>([]);
  const [minGeneration, setMinGeneration] = useState(0);
  const [maxGeneration, setMaxGeneration] = useState(0);
  const [totalGenerations, setTotalGenerations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenerations = useCallback(async () => {
    if (!treeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/generations`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch generations');
      }

      const data = await response.json();
      setGenerations(data.data.generations || []);
      setMinGeneration(data.data.minGeneration);
      setMaxGeneration(data.data.maxGeneration);
      setTotalGenerations(data.data.totalGenerations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setGenerations([]);
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  return {
    generations,
    minGeneration,
    maxGeneration,
    totalGenerations,
    loading,
    error,
    refresh: fetchGenerations,
  };
}
