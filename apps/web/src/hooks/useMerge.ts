import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface PersonSummary {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  maidenName?: string | null;
  nickname?: string | null;
  gender: string;
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
  isLiving: boolean;
  profilePhoto?: string | null;
  generation: number;
}

export interface DuplicatePair {
  person1: PersonSummary;
  person2: PersonSummary;
  score: number;
  reasons: string[];
}

export interface DuplicatesResult {
  duplicates: DuplicatePair[];
  total: number;
  minScoreUsed: number;
}

export interface FieldComparison {
  person1: unknown;
  person2: unknown;
  recommended: unknown;
}

export interface RelationshipsSummary {
  parents: number;
  children: number;
  siblings: number;
  spouses: number;
}

export interface AssetsSummary {
  photos: number;
  documents: number;
  stories: number;
}

export interface LinkedMember {
  id: string;
  userId: string;
  user: {
    name?: string | null;
    email: string;
  };
}

export interface MergePreview {
  person1: PersonSummary & { [key: string]: unknown };
  person2: PersonSummary & { [key: string]: unknown };
  similarityScore: number;
  similarityReasons: string[];
  fieldComparison: Record<string, FieldComparison>;
  relationshipsSummary: {
    person1: RelationshipsSummary;
    person2: RelationshipsSummary;
  };
  assetsSummary: {
    person1: AssetsSummary;
    person2: AssetsSummary;
  };
  linkedMembers: {
    person1?: LinkedMember | null;
    person2?: LinkedMember | null;
  };
  warnings: string[];
}

export type FieldSelection = 'primary' | 'merged';

export interface MergeInput {
  primaryPersonId: string;
  mergedPersonId: string;
  fieldSelections?: Record<string, FieldSelection>;
}

export interface MergeResult {
  mergeId: string;
  primaryPerson: PersonSummary;
  mergedPersonName: string;
  canRevertUntil: string;
}

export type MergeStatus = 'COMPLETED' | 'REVERTED' | 'EXPIRED';

export interface MergeRecord {
  id: string;
  treeId: string;
  primaryPersonId: string;
  mergedPersonId: string;
  performedById: string;
  status: MergeStatus;
  mergedPersonData: Record<string, unknown>;
  fieldSelections: Record<string, string>;
  createdAt: string;
  expiresAt: string;
  revertedAt?: string | null;
  revertedById?: string | null;
  performedBy: {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  revertedBy?: {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
  } | null;
}

interface UseMergeResult {
  loading: boolean;
  error: string | null;
  getDuplicates: (minScore?: number) => Promise<DuplicatesResult | null>;
  getMergePreview: (personId: string, targetPersonId: string) => Promise<MergePreview | null>;
  mergePersons: (input: MergeInput) => Promise<MergeResult | null>;
  getMergeHistory: (status?: MergeStatus) => Promise<MergeRecord[]>;
  revertMerge: (mergeId: string) => Promise<boolean>;
}

export function useMerge(treeId: string): UseMergeResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDuplicates = useCallback(
    async (minScore = 60): Promise<DuplicatesResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/duplicates?minScore=${minScore}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to detect duplicates');
        }

        const data = await response.json();
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [treeId]
  );

  const getMergePreview = useCallback(
    async (personId: string, targetPersonId: string): Promise<MergePreview | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/people/${personId}/merge-preview/${targetPersonId}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to get merge preview');
        }

        const data = await response.json();
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [treeId]
  );

  const mergePersons = useCallback(
    async (input: MergeInput): Promise<MergeResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/people/merge`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to merge persons');
        }

        const data = await response.json();
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [treeId]
  );

  const getMergeHistory = useCallback(
    async (status?: MergeStatus): Promise<MergeRecord[]> => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (status) params.append('status', status);

        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/merges?${params}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to get merge history');
        }

        const data = await response.json();
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [treeId]
  );

  const revertMerge = useCallback(
    async (mergeId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/merges/${mergeId}/revert`,
          {
            method: 'POST',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to revert merge');
        }

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [treeId]
  );

  return {
    loading,
    error,
    getDuplicates,
    getMergePreview,
    mergePersons,
    getMergeHistory,
    revertMerge,
  };
}

// Helper functions
export function formatMergeStatus(status: MergeStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'Active';
    case 'REVERTED':
      return 'Reverted';
    case 'EXPIRED':
      return 'Expired';
    default:
      return status;
  }
}

export function getMergeStatusColor(status: MergeStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'REVERTED':
      return 'bg-yellow-100 text-yellow-800';
    case 'EXPIRED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days} day${days === 1 ? '' : 's'} remaining`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} remaining`;
  return 'Less than an hour remaining';
}
