import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface LinkedPersonData {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  profilePhoto?: string | null;
  generation: number;
}

interface UseLinkedPersonResult {
  linkedPerson: LinkedPersonData | null;
  loading: boolean;
  error: string | null;
  linkToPerson: (personId: string) => Promise<boolean>;
  unlinkFromPerson: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useLinkedPerson(treeId: string): UseLinkedPersonResult {
  const [linkedPerson, setLinkedPerson] = useState<LinkedPersonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkedPerson = useCallback(async () => {
    if (!treeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/me`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('Not a member of this tree');
        } else {
          throw new Error('Failed to fetch linked person');
        }
        setLinkedPerson(null);
        return;
      }

      const data = await response.json();
      setLinkedPerson(data.data.linkedPerson || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLinkedPerson(null);
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    fetchLinkedPerson();
  }, [fetchLinkedPerson]);

  const linkToPerson = useCallback(async (personId: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/me/link`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to link to person');
      }

      const data = await response.json();
      setLinkedPerson(data.data.linkedPerson || null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [treeId]);

  const unlinkFromPerson = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/me/link`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unlink from person');
      }

      setLinkedPerson(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [treeId]);

  return {
    linkedPerson,
    loading,
    error,
    linkToPerson,
    unlinkFromPerson,
    refresh: fetchLinkedPerson,
  };
}
