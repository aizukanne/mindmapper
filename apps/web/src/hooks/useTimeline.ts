import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type EventType = 'birth' | 'death' | 'marriage' | 'divorce';

export interface TimelineEvent {
  id: string;
  type: EventType;
  date: string;
  year: number;
  personId: string;
  personName: string;
  personPhoto?: string | null;
  details?: string;
  relatedPersonId?: string;
  relatedPersonName?: string;
}

export interface YearGroup {
  year: number;
  events: TimelineEvent[];
}

export interface TimelineStats {
  totalEvents: number;
  displayedEvents: number;
  birthCount: number;
  deathCount: number;
  marriageCount: number;
  divorceCount: number;
  earliestYear: number | null;
  latestYear: number | null;
}

export interface TimelineFilters {
  eventTypes: EventType[];
  startYear: number | null;
  endYear: number | null;
  personId: string | null;
}

interface UseTimelineResult {
  events: TimelineEvent[];
  groupedByYear: YearGroup[];
  stats: TimelineStats | null;
  filters: TimelineFilters;
  loading: boolean;
  error: string | null;
  setEventTypes: (types: EventType[]) => void;
  setYearRange: (startYear: number | null, endYear: number | null) => void;
  setPersonFilter: (personId: string | null) => void;
  refresh: () => Promise<void>;
}

const defaultFilters: TimelineFilters = {
  eventTypes: ['birth', 'death', 'marriage', 'divorce'],
  startYear: null,
  endYear: null,
  personId: null,
};

export function useTimeline(treeId: string): UseTimelineResult {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [groupedByYear, setGroupedByYear] = useState<YearGroup[]>([]);
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [filters, setFilters] = useState<TimelineFilters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!treeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (filters.eventTypes.length > 0 && filters.eventTypes.length < 4) {
        params.append('eventTypes', filters.eventTypes.join(','));
      }
      if (filters.startYear !== null) {
        params.append('startYear', filters.startYear.toString());
      }
      if (filters.endYear !== null) {
        params.append('endYear', filters.endYear.toString());
      }
      if (filters.personId) {
        params.append('personId', filters.personId);
      }

      const queryString = params.toString();
      const url = `${API_URL}/api/family-trees/${treeId}/timeline${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch timeline');
      }

      const data = await response.json();
      setEvents(data.data.events || []);
      setGroupedByYear(data.data.groupedByYear || []);
      setStats(data.data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setEvents([]);
      setGroupedByYear([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [treeId, filters]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const setEventTypes = useCallback((types: EventType[]) => {
    setFilters(prev => ({ ...prev, eventTypes: types }));
  }, []);

  const setYearRange = useCallback((startYear: number | null, endYear: number | null) => {
    setFilters(prev => ({ ...prev, startYear, endYear }));
  }, []);

  const setPersonFilter = useCallback((personId: string | null) => {
    setFilters(prev => ({ ...prev, personId }));
  }, []);

  return {
    events,
    groupedByYear,
    stats,
    filters,
    loading,
    error,
    setEventTypes,
    setYearRange,
    setPersonFilter,
    refresh: fetchTimeline,
  };
}
