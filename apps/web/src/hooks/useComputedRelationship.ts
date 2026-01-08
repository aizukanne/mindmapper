/**
 * Hook for computing relationships between people in a family tree.
 *
 * Uses the @mindmapper/family-graph computation engine via API.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getComputedRelationship,
  getImmediateFamily,
  getRelationshipStats,
  getHowRelated,
  searchRelatives,
  type RelationshipResult,
  type ImmediateFamily,
  type RelationshipStats,
  type HowRelatedResult,
  type ComputedRelationship,
  type PersonSummary,
} from '../lib/relationship-api';

interface UseComputedRelationshipOptions {
  treeId: string;
  personAId?: string;
  personBId?: string;
  enabled?: boolean;
}

interface UseComputedRelationshipResult {
  relationship: RelationshipResult | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get the computed relationship between two people
 */
export function useComputedRelationship({
  treeId,
  personAId,
  personBId,
  enabled = true,
}: UseComputedRelationshipOptions): UseComputedRelationshipResult {
  const [relationship, setRelationship] = useState<RelationshipResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!treeId || !personAId || !personBId || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getComputedRelationship(treeId, personAId, personBId);
      setRelationship(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to compute relationship'));
    } finally {
      setIsLoading(false);
    }
  }, [treeId, personAId, personBId, enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { relationship, isLoading, error, refetch: fetch };
}

interface UseImmediateFamilyOptions {
  treeId: string;
  personId?: string;
  enabled?: boolean;
}

interface UseImmediateFamilyResult {
  family: ImmediateFamily | null;
  counts: { parents: number; children: number; spouses: number; siblings: number } | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get immediate family members
 */
export function useImmediateFamily({
  treeId,
  personId,
  enabled = true,
}: UseImmediateFamilyOptions): UseImmediateFamilyResult {
  const [family, setFamily] = useState<ImmediateFamily | null>(null);
  const [counts, setCounts] = useState<{ parents: number; children: number; spouses: number; siblings: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!treeId || !personId || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getImmediateFamily(treeId, personId);
      setFamily(result.data);
      setCounts(result.meta.counts);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch immediate family'));
    } finally {
      setIsLoading(false);
    }
  }, [treeId, personId, enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { family, counts, isLoading, error, refetch: fetch };
}

interface UseRelationshipStatsOptions {
  treeId: string;
  personId?: string;
  enabled?: boolean;
}

interface UseRelationshipStatsResult {
  stats: RelationshipStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get relationship statistics for a person
 */
export function useRelationshipStats({
  treeId,
  personId,
  enabled = true,
}: UseRelationshipStatsOptions): UseRelationshipStatsResult {
  const [stats, setStats] = useState<RelationshipStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!treeId || !personId || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getRelationshipStats(treeId, personId);
      setStats(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch relationship stats'));
    } finally {
      setIsLoading(false);
    }
  }, [treeId, personId, enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { stats, isLoading, error, refetch: fetch };
}

interface UseHowRelatedOptions {
  treeId: string;
  personIds: string[];
  enabled?: boolean;
}

interface UseHowRelatedResult {
  result: HowRelatedResult | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get relationships between multiple people
 */
export function useHowRelated({
  treeId,
  personIds,
  enabled = true,
}: UseHowRelatedOptions): UseHowRelatedResult {
  const [result, setResult] = useState<HowRelatedResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!treeId || personIds.length < 2 || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getHowRelated(treeId, personIds);
      setResult(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to compute relationships'));
    } finally {
      setIsLoading(false);
    }
  }, [treeId, personIds, enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { result, isLoading, error, refetch: fetch };
}

interface UseRelationshipSearchOptions {
  treeId: string;
  fromPersonId?: string;
  query?: string;
  enabled?: boolean;
}

interface UseRelationshipSearchResult {
  results: Array<{ person: PersonSummary; relationship: ComputedRelationship }>;
  isLoading: boolean;
  error: Error | null;
  search: (query: string) => Promise<void>;
}

/**
 * Hook to search for relatives by relationship type
 */
export function useRelationshipSearch({
  treeId,
  fromPersonId,
  query: initialQuery,
  enabled = true,
}: UseRelationshipSearchOptions): UseRelationshipSearchResult {
  const [results, setResults] = useState<Array<{ person: PersonSummary; relationship: ComputedRelationship }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!treeId || !fromPersonId || !searchQuery || !enabled) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await searchRelatives(treeId, fromPersonId, searchQuery);
      setResults(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Search failed'));
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [treeId, fromPersonId, enabled]);

  useEffect(() => {
    if (initialQuery) {
      search(initialQuery);
    }
  }, [initialQuery, search]);

  return { results, isLoading, error, search };
}
