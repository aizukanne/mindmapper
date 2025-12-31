import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { X, History, RotateCcw, ChevronDown, ChevronRight, Loader2, User, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiffViewer } from './DiffViewer';

interface HistoryUser {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

interface HistoryEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  previousState: unknown;
  newState: unknown;
  createdAt: string;
  user: HistoryUser;
}

interface HistoryPanelProps {
  mapId: string;
  isMapOwner?: boolean;
  onClose: () => void;
  onRestore?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const EVENT_TYPE_LABELS: Record<string, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  RESTORE: 'Restored',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  NODE: 'node',
  CONNECTION: 'connection',
  MAP: 'map',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  CREATE: 'text-green-600 bg-green-50',
  UPDATE: 'text-blue-600 bg-blue-50',
  DELETE: 'text-red-600 bg-red-50',
  RESTORE: 'text-purple-600 bg-purple-50',
};

type EventTypeFilter = 'ALL' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
type EntityTypeFilter = 'ALL' | 'NODE' | 'CONNECTION' | 'MAP';

export function HistoryPanel({ mapId, isMapOwner, onClose, onRestore }: HistoryPanelProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('ALL');
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityTypeFilter>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Filter events based on selected filters
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (eventTypeFilter !== 'ALL' && event.eventType !== eventTypeFilter) {
        return false;
      }
      if (entityTypeFilter !== 'ALL' && event.entityType !== entityTypeFilter) {
        return false;
      }
      return true;
    });
  }, [events, eventTypeFilter, entityTypeFilter]);

  // Fetch history events
  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/maps/${mapId}/history?limit=${pagination.limit}&offset=${pagination.offset}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setEvents(data.data || []);
        setPagination((prev) => ({ ...prev, total: data.pagination?.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }, [mapId, pagination.limit, pagination.offset]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Restore to a specific event
  const handleRestore = async (eventId: string) => {
    if (!isMapOwner) return;
    if (!confirm('Are you sure you want to restore to this point? This will undo changes made after this event.')) {
      return;
    }

    setRestoring(eventId);
    try {
      const response = await fetch(`${API_URL}/api/maps/${mapId}/restore/${eventId}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        await fetchHistory();
        onRestore?.();
      }
    } catch (error) {
      console.error('Failed to restore:', error);
    } finally {
      setRestoring(null);
    }
  };

  // Toggle event details expansion
  const toggleExpanded = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  // Get display name for entity
  const getEntityName = (event: HistoryEvent): string => {
    if (event.entityType === 'NODE') {
      const state = (event.newState ?? event.previousState) as { text?: string } | null;
      return state?.text ? `"${state.text.substring(0, 30)}${state.text.length > 30 ? '...' : ''}"` : 'Node';
    }
    return ENTITY_TYPE_LABELS[event.entityType] || event.entityType;
  };

  const getDisplayName = (user: HistoryUser) => {
    return user.name || user.email?.split('@')[0] || 'Unknown';
  };

  const loadMore = () => {
    setPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }));
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h2 className="font-semibold">Version History</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Info bar with filters */}
      <div className="px-4 py-2 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filteredEvents.length} of {pagination.total} events
            {isMapOwner && ' • Click restore to revert changes'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3 w-3 mr-1" />
            <span className="text-xs">Filter</span>
          </Button>
        </div>

        {/* Filter controls */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Event Type
              </label>
              <div className="flex flex-wrap gap-1 mt-1">
                {(['ALL', 'CREATE', 'UPDATE', 'DELETE', 'RESTORE'] as EventTypeFilter[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setEventTypeFilter(type)}
                    className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
                      eventTypeFilter === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {type === 'ALL' ? 'All' : EVENT_TYPE_LABELS[type] || type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Entity Type
              </label>
              <div className="flex flex-wrap gap-1 mt-1">
                {(['ALL', 'NODE', 'CONNECTION', 'MAP'] as EntityTypeFilter[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setEntityTypeFilter(type)}
                    className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
                      entityTypeFilter === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {type === 'ALL' ? 'All' : ENTITY_TYPE_LABELS[type] || type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No history yet</p>
            <p className="text-xs mt-1">Changes will appear here as they happen</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No matching events</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredEvents.map((event) => {
              const isExpanded = expandedEvents.has(event.id);
              const hasDetails = event.previousState !== null || event.newState !== null;

              return (
                <div key={event.id} className="p-3 hover:bg-muted/30">
                  <div className="flex items-start gap-3">
                    {/* User avatar */}
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {event.user.avatarUrl ? (
                        <img
                          src={event.user.avatarUrl}
                          alt={getDisplayName(event.user)}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-primary" />
                      )}
                    </div>

                    {/* Event content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{getDisplayName(event.user)}</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${EVENT_TYPE_COLORS[event.eventType] || 'text-gray-600 bg-gray-50'}`}
                        >
                          {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {getEntityName(event)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                        </span>

                        {hasDetails && (
                          <button
                            className="text-xs text-primary hover:underline flex items-center gap-0.5"
                            onClick={() => toggleExpanded(event.id)}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                Hide details
                              </>
                            ) : (
                              <>
                                <ChevronRight className="h-3 w-3" />
                                Show details
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Expanded details with diff visualization */}
                      {isExpanded && hasDetails && (
                        <div className="mt-2">
                          <DiffViewer
                            previousState={event.previousState}
                            newState={event.newState}
                            entityType={event.entityType}
                          />
                        </div>
                      )}
                    </div>

                    {/* Restore button */}
                    {isMapOwner && event.previousState !== null && event.eventType !== 'CREATE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleRestore(event.id)}
                        disabled={restoring !== null}
                      >
                        {restoring === event.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Load more button */}
            {events.length < pagination.total && (
              <div className="p-4 text-center">
                <Button variant="outline" size="sm" onClick={loadMore}>
                  Load more ({pagination.total - events.length} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
