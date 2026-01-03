import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type SuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type SuggestionType =
  | 'UPDATE_PERSON'
  | 'ADD_RELATIONSHIP'
  | 'ADD_PERSON'
  | 'CORRECT_DATE'
  | 'OTHER';

export interface Suggestion {
  id: string;
  treeId: string;
  personId: string;
  suggesterId: string;
  type: SuggestionType;
  status: SuggestionStatus;
  title: string;
  description?: string | null;
  currentData?: Record<string, unknown> | null;
  suggestedData: Record<string, unknown>;
  reviewerId?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string | null;
  };
  suggester: {
    id: string;
    name?: string | null;
    email: string;
    avatarUrl?: string | null;
  };
  reviewer?: {
    id: string;
    name?: string | null;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

export interface CreateSuggestionInput {
  personId: string;
  type: SuggestionType;
  title: string;
  description?: string;
  currentData?: Record<string, unknown>;
  suggestedData: Record<string, unknown>;
}

export interface ReviewSuggestionInput {
  status: 'APPROVED' | 'REJECTED';
  reviewNote?: string;
  applyChanges?: boolean;
}

interface UseSuggestionsResult {
  suggestions: Suggestion[];
  loading: boolean;
  error: string | null;
  createSuggestion: (input: CreateSuggestionInput) => Promise<Suggestion | null>;
  reviewSuggestion: (
    suggestionId: string,
    input: ReviewSuggestionInput
  ) => Promise<Suggestion | null>;
  deleteSuggestion: (suggestionId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

interface UseSuggestionsOptions {
  status?: SuggestionStatus;
  personId?: string;
}

export function useSuggestions(
  treeId: string,
  options: UseSuggestionsOptions = {}
): UseSuggestionsResult {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!treeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.status) {
        params.append('status', options.status);
      }
      if (options.personId) {
        params.append('personId', options.personId);
      }

      const queryString = params.toString();
      const url = `${API_URL}/api/family-trees/${treeId}/suggestions${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(data.data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [treeId, options.status, options.personId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const createSuggestion = useCallback(
    async (input: CreateSuggestionInput): Promise<Suggestion | null> => {
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/family-trees/${treeId}/suggestions`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create suggestion');
        }

        const data = await response.json();
        const newSuggestion = data.data.suggestion;

        // Add to local state if status matches filter (or no filter)
        if (!options.status || options.status === 'PENDING') {
          setSuggestions(prev => [newSuggestion, ...prev]);
        }

        return newSuggestion;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId, options.status]
  );

  const reviewSuggestion = useCallback(
    async (
      suggestionId: string,
      input: ReviewSuggestionInput
    ): Promise<Suggestion | null> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/suggestions/${suggestionId}/review`,
          {
            method: 'PUT',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to review suggestion');
        }

        const data = await response.json();
        const updatedSuggestion = data.data.suggestion;

        // Update in local state
        setSuggestions(prev =>
          prev.map(s => (s.id === suggestionId ? updatedSuggestion : s))
        );

        return updatedSuggestion;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const deleteSuggestion = useCallback(
    async (suggestionId: string): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/suggestions/${suggestionId}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete suggestion');
        }

        // Remove from local state
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return false;
      }
    },
    [treeId]
  );

  return {
    suggestions,
    loading,
    error,
    createSuggestion,
    reviewSuggestion,
    deleteSuggestion,
    refresh: fetchSuggestions,
  };
}

// Hook for getting suggestions for a specific person
export function usePersonSuggestions(
  treeId: string,
  personId: string
): UseSuggestionsResult {
  return useSuggestions(treeId, { personId });
}

// Hook for getting pending suggestions (admin view)
export function usePendingSuggestions(treeId: string): UseSuggestionsResult {
  return useSuggestions(treeId, { status: 'PENDING' });
}
