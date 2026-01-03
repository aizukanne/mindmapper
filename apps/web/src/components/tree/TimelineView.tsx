import { useState, useMemo } from 'react';
import {
  Calendar,
  Baby,
  Heart,
  HeartOff,
  User,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTimeline, type EventType, type TimelineEvent } from '@/hooks/useTimeline';

export interface TimelineViewProps {
  treeId: string;
  onPersonClick?: (personId: string) => void;
  className?: string;
}

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  birth: <Baby className="w-4 h-4" />,
  death: <Clock className="w-4 h-4" />,
  marriage: <Heart className="w-4 h-4" />,
  divorce: <HeartOff className="w-4 h-4" />,
};

const EVENT_COLORS: Record<EventType, string> = {
  birth: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  death: 'bg-gray-100 text-gray-700 border-gray-300',
  marriage: 'bg-rose-100 text-rose-700 border-rose-300',
  divorce: 'bg-amber-100 text-amber-700 border-amber-300',
};

const EVENT_DOT_COLORS: Record<EventType, string> = {
  birth: 'bg-emerald-500',
  death: 'bg-gray-500',
  marriage: 'bg-rose-500',
  divorce: 'bg-amber-500',
};

const EVENT_LABELS: Record<EventType, string> = {
  birth: 'Birth',
  death: 'Death',
  marriage: 'Marriage',
  divorce: 'Divorce',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getEventDescription(event: TimelineEvent): string {
  switch (event.type) {
    case 'birth':
      return `${event.personName} was born${event.details ? ` in ${event.details}` : ''}`;
    case 'death':
      return `${event.personName} passed away${event.details ? ` in ${event.details}` : ''}`;
    case 'marriage':
      return `${event.personName} married ${event.relatedPersonName || 'spouse'}${event.details ? ` in ${event.details}` : ''}`;
    case 'divorce':
      return `${event.personName} divorced ${event.relatedPersonName || 'spouse'}${event.details ? ` in ${event.details}` : ''}`;
    default:
      return '';
  }
}

export function TimelineView({
  treeId,
  onPersonClick,
  className = '',
}: TimelineViewProps) {
  const {
    groupedByYear,
    stats,
    filters,
    loading,
    error,
    setEventTypes,
    setYearRange,
  } = useTimeline(treeId);

  const [showFilters, setShowFilters] = useState(false);
  const [startYearInput, setStartYearInput] = useState('');
  const [endYearInput, setEndYearInput] = useState('');
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  // Toggle event type filter
  const toggleEventType = (type: EventType) => {
    const current = filters.eventTypes;
    if (current.includes(type)) {
      if (current.length > 1) {
        setEventTypes(current.filter(t => t !== type));
      }
    } else {
      setEventTypes([...current, type]);
    }
  };

  // Apply year range filter
  const applyYearRange = () => {
    const start = startYearInput ? parseInt(startYearInput) : null;
    const end = endYearInput ? parseInt(endYearInput) : null;
    setYearRange(start, end);
  };

  // Clear year range filter
  const clearYearRange = () => {
    setStartYearInput('');
    setEndYearInput('');
    setYearRange(null, null);
  };

  // Toggle year expansion
  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  // Expand/collapse all years
  const expandAll = () => {
    setExpandedYears(new Set(groupedByYear.map(g => g.year)));
  };

  const collapseAll = () => {
    setExpandedYears(new Set());
  };

  // Calculate decade markers (used in decade start detection in render)
  const _decadeMarkers = useMemo(() => {
    if (groupedByYear.length === 0) return [];
    const decades = new Set<number>();
    for (const group of groupedByYear) {
      decades.add(Math.floor(group.year / 10) * 10);
    }
    return Array.from(decades).sort((a, b) => a - b);
  }, [groupedByYear]);
  // Keep decade markers computed for potential future use
  void _decadeMarkers;

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 text-red-500 ${className}`}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Family Timeline</h2>
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            {(filters.eventTypes.length < 4 || filters.startYear || filters.endYear) && (
              <span className="ml-1 bg-blue-500 text-white text-xs px-1.5 rounded-full">
                {(filters.eventTypes.length < 4 ? 1 : 0) +
                  (filters.startYear ? 1 : 0) +
                  (filters.endYear ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span>{stats.totalEvents} events</span>
            {stats.earliestYear && stats.latestYear && (
              <span>
                {stats.earliestYear} - {stats.latestYear}
              </span>
            )}
            <div className="flex items-center gap-2">
              {stats.birthCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {stats.birthCount}
                </span>
              )}
              {stats.deathCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-500" />
                  {stats.deathCount}
                </span>
              )}
              {stats.marriageCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  {stats.marriageCount}
                </span>
              )}
              {stats.divorceCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {stats.divorceCount}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border-b p-4 bg-gray-50 space-y-4">
          {/* Event Type Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Types
            </label>
            <div className="flex flex-wrap gap-2">
              {(['birth', 'death', 'marriage', 'divorce'] as EventType[]).map(type => (
                <button
                  key={type}
                  onClick={() => toggleEventType(type)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    filters.eventTypes.includes(type)
                      ? EVENT_COLORS[type]
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {EVENT_ICONS[type]}
                  {EVENT_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Year Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year Range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="From"
                value={startYearInput}
                onChange={e => setStartYearInput(e.target.value)}
                className="w-24 px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                placeholder="To"
                value={endYearInput}
                onChange={e => setEndYearInput(e.target.value)}
                className="w-24 px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button size="sm" onClick={applyYearRange}>
                Apply
              </Button>
              {(filters.startYear || filters.endYear) && (
                <Button size="sm" variant="ghost" onClick={clearYearRange}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timeline Controls */}
      {groupedByYear.length > 0 && (
        <div className="border-b px-4 py-2 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              <ChevronDown className="w-4 h-4 mr-1" />
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              <ChevronUp className="w-4 h-4 mr-1" />
              Collapse All
            </Button>
          </div>
          <span className="text-sm text-gray-500">
            {groupedByYear.length} years with events
          </span>
        </div>
      )}

      {/* Timeline */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {groupedByYear.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No events found</p>
            <p className="text-sm mt-1">
              Add birth dates, death dates, or marriages to see the timeline
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            {groupedByYear.map((yearGroup, groupIndex) => {
              const isExpanded = expandedYears.has(yearGroup.year);
              const isDecadeStart = yearGroup.year % 10 === 0;

              return (
                <div key={yearGroup.year} className="relative mb-6">
                  {/* Decade marker */}
                  {isDecadeStart && groupIndex > 0 && (
                    <div className="absolute -left-2 -top-4 flex items-center gap-2 text-xs text-gray-400">
                      <div className="w-8 h-px bg-gray-300" />
                      <span>{yearGroup.year}s</span>
                    </div>
                  )}

                  {/* Year header */}
                  <button
                    onClick={() => toggleYear(yearGroup.year)}
                    className="relative flex items-center gap-3 w-full text-left hover:bg-gray-50 rounded py-1 -ml-1 pl-1"
                  >
                    {/* Year dot */}
                    <div className="relative z-10 w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-600">
                        {yearGroup.events.length}
                      </span>
                    </div>

                    {/* Year label */}
                    <span className="font-semibold text-gray-900">{yearGroup.year}</span>

                    {/* Event type indicators */}
                    <div className="flex items-center gap-1 ml-auto">
                      {Array.from(new Set(yearGroup.events.map(e => e.type))).map(type => (
                        <span
                          key={type}
                          className={`w-2 h-2 rounded-full ${EVENT_DOT_COLORS[type]}`}
                        />
                      ))}
                    </div>

                    {/* Expand/collapse icon */}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {/* Events */}
                  {isExpanded && (
                    <div className="ml-12 mt-2 space-y-2">
                      {yearGroup.events.map(event => (
                        <div
                          key={event.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${EVENT_COLORS[event.type]}`}
                        >
                          {/* Photo or icon */}
                          {event.personPhoto ? (
                            <img
                              src={event.personPhoto}
                              alt={event.personName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center">
                              <User className="w-5 h-5" />
                            </div>
                          )}

                          {/* Event details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {EVENT_ICONS[event.type]}
                              <span className="font-medium">{EVENT_LABELS[event.type]}</span>
                              <span className="text-sm opacity-75">{formatDate(event.date)}</span>
                            </div>
                            <p className="text-sm mt-1">{getEventDescription(event)}</p>

                            {/* Click to navigate */}
                            {onPersonClick && (
                              <button
                                onClick={() => onPersonClick(event.personId)}
                                className="text-xs mt-2 underline hover:no-underline"
                              >
                                View {event.personName}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
