import { useState, useCallback } from 'react';
import type { Person, Relationship } from '@mindmapper/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type BranchDirection = 'ancestors' | 'descendants' | 'both';

interface RootPerson {
  id: string;
  firstName: string;
  lastName: string;
}

interface BranchData {
  rootPerson: RootPerson;
  direction: BranchDirection;
  people: Person[];
  relationships: Relationship[];
  personCount: number;
}

interface UseBranchIsolationResult {
  branchData: BranchData | null;
  isIsolated: boolean;
  loading: boolean;
  error: string | null;
  isolateBranch: (personId: string, direction?: BranchDirection) => Promise<boolean>;
  clearIsolation: () => void;
}

export function useBranchIsolation(treeId: string): UseBranchIsolationResult {
  const [branchData, setBranchData] = useState<BranchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isolateBranch = useCallback(async (
    personId: string,
    direction: BranchDirection = 'both'
  ): Promise<boolean> => {
    if (!treeId || !personId) {
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/family-trees/${treeId}/people/${personId}/branch?direction=${direction}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch branch data');
      }

      const data = await response.json();
      setBranchData(data.data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setBranchData(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  const clearIsolation = useCallback(() => {
    setBranchData(null);
    setError(null);
  }, []);

  return {
    branchData,
    isIsolated: branchData !== null,
    loading,
    error,
    isolateBranch,
    clearIsolation,
  };
}
