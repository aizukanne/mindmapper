import { useState, useEffect } from 'react';
import {
  Activity,
  Filter,
  RefreshCw,
  ChevronDown,
  Check,
  UserPlus,
  UserMinus,
  Shield,
  Edit,
  UserX,
  GitMerge,
  Link,
  Unlink,
  Heart,
  HeartOff,
  Image,
  ImageOff,
  FilePlus,
  FileCheck,
  FileX,
  BookOpen,
  Edit3,
  MessageSquare,
  CheckCircle,
  XCircle,
  Settings,
  Lock,
  Loader2,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useActivity,
  type Activity as ActivityItem,
  type ActivityType,
  type ActivitySummary,
  ACTIVITY_CATEGORIES,
  formatActivityType,
  getActivityColor,
  formatRelativeTime,
  getActivityMessage,
} from '@/hooks/useActivity';

interface ActivityFeedProps {
  treeId: string;
  className?: string;
}

// Icon component mapping
const activityIcons: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  MEMBER_JOINED: UserPlus,
  MEMBER_LEFT: UserMinus,
  MEMBER_ROLE_CHANGED: Shield,
  PERSON_ADDED: UserPlus,
  PERSON_UPDATED: Edit,
  PERSON_DELETED: UserX,
  PERSON_MERGED: GitMerge,
  RELATIONSHIP_ADDED: Link,
  RELATIONSHIP_REMOVED: Unlink,
  MARRIAGE_ADDED: Heart,
  MARRIAGE_REMOVED: HeartOff,
  PHOTO_UPLOADED: Image,
  PHOTO_DELETED: ImageOff,
  DOCUMENT_UPLOADED: FilePlus,
  DOCUMENT_APPROVED: FileCheck,
  DOCUMENT_REJECTED: FileX,
  STORY_PUBLISHED: BookOpen,
  STORY_UPDATED: Edit3,
  SUGGESTION_MADE: MessageSquare,
  SUGGESTION_APPROVED: CheckCircle,
  SUGGESTION_REJECTED: XCircle,
  TREE_UPDATED: Settings,
  TREE_PRIVACY_CHANGED: Lock,
};

export function ActivityFeed({ treeId, className = '' }: ActivityFeedProps) {
  const {
    activities,
    loading,
    error,
    hasMore,
    unreadCount,
    filters,
    setFilters,
    loadMore,
    markAsSeen,
    getSummary,
    refresh,
  } = useActivity(treeId);

  const [showFilters, setShowFilters] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Fetch summary when showing
  useEffect(() => {
    if (showSummary && !summary) {
      setLoadingSummary(true);
      getSummary(7).then(s => {
        setSummary(s);
        setLoadingSummary(false);
      });
    }
  }, [showSummary, summary, getSummary]);

  const handleCategoryToggle = (category: string) => {
    let newSelected: string[];

    if (selectedCategories.includes(category)) {
      newSelected = selectedCategories.filter(c => c !== category);
    } else {
      newSelected = [...selectedCategories, category];
    }

    setSelectedCategories(newSelected);

    // Update filters based on selected categories
    if (newSelected.length === 0) {
      setFilters({ ...filters, types: undefined });
    } else {
      const types = newSelected.flatMap(
        c => ACTIVITY_CATEGORIES[c as keyof typeof ACTIVITY_CATEGORIES] || []
      );
      setFilters({ ...filters, types });
    }
  };

  const handleMarkAsSeen = async () => {
    await markAsSeen();
  };

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-800">{error}</p>
        <button
          onClick={refresh}
          className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Activity Feed</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSummary(!showSummary)}
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Summary
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filter
            {selectedCategories.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                {selectedCategories.length}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAsSeen}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Mark as read
            </Button>
          )}
        </div>
      </div>

      {/* Summary Panel */}
      {showSummary && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          {loadingSummary ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Last 7 Days Summary</h3>
                <span className="text-sm text-gray-500">
                  {summary.totalActivities} total activities
                </span>
              </div>

              {/* Activity breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(summary.byType).slice(0, 8).map(([type, count]) => (
                  <div key={type} className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="text-lg font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500">{formatActivityType(type as ActivityType)}</div>
                  </div>
                ))}
              </div>

              {/* Top contributors */}
              {summary.topContributors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Top Contributors</h4>
                  <div className="flex flex-wrap gap-2">
                    {summary.topContributors.map(contrib => (
                      <div
                        key={contrib.user.id}
                        className="flex items-center gap-2 bg-white rounded-full px-3 py-1 border border-gray-100"
                      >
                        {contrib.user.avatarUrl ? (
                          <img
                            src={contrib.user.avatarUrl}
                            alt={contrib.user.name || ''}
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                            {(contrib.user.name || '?').charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-medium">{contrib.user.name || 'Unknown'}</span>
                        <span className="text-xs text-gray-500">{contrib.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No activity data available</p>
          )}
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Filter by Category</h3>
            {selectedCategories.length > 0 && (
              <button
                onClick={() => {
                  setSelectedCategories([]);
                  setFilters({ ...filters, types: undefined });
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(ACTIVITY_CATEGORIES).map(category => (
              <button
                key={category}
                onClick={() => handleCategoryToggle(category)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategories.includes(category)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
                {selectedCategories.includes(category) && (
                  <Check className="inline-block w-3 h-3 ml-1" />
                )}
              </button>
            ))}
          </div>

          {/* Time filter */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Time Period</h4>
            <div className="flex gap-2">
              {[
                { label: '7 days', value: 7 },
                { label: '30 days', value: 30 },
                { label: '90 days', value: 90 },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setFilters({ ...filters, daysAgo: option.value })}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    (filters.daysAgo || 90) === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activity List */}
      <div className="space-y-1">
        {loading && activities.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading activities...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No activities yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Activity will appear here as changes are made to the tree
            </p>
          </div>
        ) : (
          <>
            {/* Group by date */}
            {groupActivitiesByDate(activities).map(group => (
              <div key={group.date} className="mb-6">
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm py-2 mb-2">
                  <h3 className="text-sm font-medium text-gray-500">{group.label}</h3>
                </div>
                <div className="space-y-2">
                  {group.activities.map(activity => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full max-w-xs"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4 mr-2" />
                  )}
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Single activity item component
function ActivityItem({ activity }: { activity: ActivityItem }) {
  const IconComponent = activityIcons[activity.type] || Activity;
  const colorClass = getActivityColor(activity.type);
  const message = getActivityMessage(activity);

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
        activity.isNew ? 'bg-blue-50/50' : 'hover:bg-gray-50'
      }`}
    >
      {/* Icon */}
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <IconComponent className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{message}</p>
        <div className="flex items-center gap-2 mt-1">
          {/* Actor avatar */}
          {activity.actor.avatarUrl ? (
            <img
              src={activity.actor.avatarUrl}
              alt={activity.actor.name || ''}
              className="w-4 h-4 rounded-full"
            />
          ) : (
            <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-[8px] text-gray-500">
                {(activity.actor.name || '?').charAt(0)}
              </span>
            </div>
          )}
          <span className="text-xs text-gray-500">{activity.actor.name || 'Someone'}</span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-400">{formatRelativeTime(activity.createdAt)}</span>
          {activity.isNew && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs font-medium text-blue-600">New</span>
            </>
          )}
          {activity.isPrivate && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <Lock className="w-3 h-3 text-gray-400" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to group activities by date
interface ActivityGroup {
  date: string;
  label: string;
  activities: ActivityItem[];
}

function groupActivitiesByDate(activities: ActivityItem[]): ActivityGroup[] {
  const groups: Map<string, ActivityGroup> = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  activities.forEach(activity => {
    const date = new Date(activity.createdAt);
    date.setHours(0, 0, 0, 0);
    const dateKey = date.toISOString().split('T')[0];

    if (!groups.has(dateKey)) {
      let label: string;
      if (date.getTime() === today.getTime()) {
        label = 'Today';
      } else if (date.getTime() === yesterday.getTime()) {
        label = 'Yesterday';
      } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
        label = date.toLocaleDateString('en-US', { weekday: 'long' });
      } else {
        label = date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
        });
      }

      groups.set(dateKey, { date: dateKey, label, activities: [] });
    }

    groups.get(dateKey)!.activities.push(activity);
  });

  return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export default ActivityFeed;
