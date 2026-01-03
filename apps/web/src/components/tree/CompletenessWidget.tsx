import { useState, useEffect, useMemo } from 'react';
import {
  Target,
  CheckCircle2,
  Circle,
  ChevronRight,
  Trophy,
  Star,
  Camera,
  FileText,
  Users,
  Calendar,
  MapPin,
  BookOpen,
  Link,
  TrendingUp,
  Sparkles,
  Award,
  Medal,
  Crown,
  Heart,
  User,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Types
export interface PersonCompleteness {
  id: string;
  name: string;
  photoUrl?: string | null;
  completeness: number;
  missingFields: string[];
}

export interface TreeCompleteness {
  overallScore: number;
  totalMembers: number;
  completeProfiles: number;
  partialProfiles: number;
  incompleteProfiles: number;
  fieldCoverage: {
    birthDates: number;
    deathDates: number;
    birthPlaces: number;
    photos: number;
    biographies: number;
    occupations: number;
    relationships: number;
  };
  suggestions: Suggestion[];
  badges: Badge[];
  incompleteMembers: PersonCompleteness[];
}

export interface Suggestion {
  id: string;
  type: 'add_date' | 'add_photo' | 'add_bio' | 'add_place' | 'add_relationship' | 'add_story' | 'verify_data';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  personId?: string;
  personName?: string;
  action: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: 'trophy' | 'star' | 'medal' | 'crown' | 'heart' | 'camera' | 'book' | 'users' | 'clock';
  earned: boolean;
  progress: number;
  requirement: number;
  category: 'data' | 'engagement' | 'milestone';
}

interface CompletenessWidgetProps {
  treeId: string;
  onNavigateToPerson?: (personId: string) => void;
  onAddPhoto?: (personId: string) => void;
  onEditPerson?: (personId: string) => void;
  compact?: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Badge icon mapping
function getBadgeIcon(icon: Badge['icon']) {
  switch (icon) {
    case 'trophy': return Trophy;
    case 'star': return Star;
    case 'medal': return Medal;
    case 'crown': return Crown;
    case 'heart': return Heart;
    case 'camera': return Camera;
    case 'book': return BookOpen;
    case 'users': return Users;
    case 'clock': return Clock;
    default: return Award;
  }
}

// Color helpers
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function getPriorityColor(priority: Suggestion['priority']): string {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
  }
}

function getSuggestionIcon(type: Suggestion['type']) {
  switch (type) {
    case 'add_date': return Calendar;
    case 'add_photo': return Camera;
    case 'add_bio': return FileText;
    case 'add_place': return MapPin;
    case 'add_relationship': return Link;
    case 'add_story': return BookOpen;
    case 'verify_data': return AlertCircle;
    default: return Target;
  }
}

export function CompletenessWidget({
  treeId,
  onNavigateToPerson,
  onAddPhoto,
  onEditPerson,
  compact = false,
}: CompletenessWidgetProps) {
  const [completeness, setCompleteness] = useState<TreeCompleteness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'suggestions' | 'badges' | 'incomplete'>('overview');
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  // Fetch completeness data
  useEffect(() => {
    async function fetchCompleteness() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/completeness`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch completeness data');
        }

        const data = await response.json();
        setCompleteness(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchCompleteness();
  }, [treeId]);

  // Calculate earned badges count
  const earnedBadges = useMemo(() => {
    if (!completeness) return 0;
    return completeness.badges.filter(b => b.earned).length;
  }, [completeness]);

  // Handle suggestion action
  const handleSuggestionAction = (suggestion: Suggestion) => {
    if (suggestion.personId) {
      switch (suggestion.type) {
        case 'add_photo':
          onAddPhoto?.(suggestion.personId);
          break;
        default:
          onEditPerson?.(suggestion.personId);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }

  if (!completeness) return null;

  // Compact view
  if (compact) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="w-12 h-12 -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-gray-200"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={`${(completeness.overallScore / 100) * 125.6} 125.6`}
                  className={getScoreColor(completeness.overallScore)}
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${getScoreColor(completeness.overallScore)}`}>
                {completeness.overallScore}%
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Tree Completeness</p>
              <p className="text-sm text-gray-600">
                {completeness.suggestions.filter(s => s.priority === 'high').length} high priority actions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-full">
              <Trophy className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">{earnedBadges}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-6">
      {/* Header with overall score */}
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">Tree Completeness</h2>
            <p className="text-blue-100">
              {completeness.completeProfiles} of {completeness.totalMembers} profiles complete
            </p>
          </div>
          <div className="relative">
            <svg className="w-24 h-24 -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-white/20"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${(completeness.overallScore / 100) * 251.2} 251.2`}
                className="text-white"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
              {completeness.overallScore}%
            </span>
          </div>
        </div>

        {/* Field coverage quick stats */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/20">
          <div className="text-center">
            <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-200" />
            <p className="text-lg font-bold">{completeness.fieldCoverage.birthDates}%</p>
            <p className="text-xs text-blue-200">Birth Dates</p>
          </div>
          <div className="text-center">
            <Camera className="w-5 h-5 mx-auto mb-1 text-blue-200" />
            <p className="text-lg font-bold">{completeness.fieldCoverage.photos}%</p>
            <p className="text-xs text-blue-200">Photos</p>
          </div>
          <div className="text-center">
            <MapPin className="w-5 h-5 mx-auto mb-1 text-blue-200" />
            <p className="text-lg font-bold">{completeness.fieldCoverage.birthPlaces}%</p>
            <p className="text-xs text-blue-200">Places</p>
          </div>
          <div className="text-center">
            <Link className="w-5 h-5 mx-auto mb-1 text-blue-200" />
            <p className="text-lg font-bold">{completeness.fieldCoverage.relationships}%</p>
            <p className="text-xs text-blue-200">Relations</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'suggestions', label: `Actions (${completeness.suggestions.length})`, icon: Target },
          { id: 'badges', label: `Badges (${earnedBadges}/${completeness.badges.length})`, icon: Trophy },
          { id: 'incomplete', label: 'Incomplete', icon: AlertCircle },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Profile breakdown */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Profile Breakdown</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Complete profiles</span>
                </div>
                <span className="font-semibold text-gray-900">{completeness.completeProfiles}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Circle className="w-5 h-5 text-amber-500" />
                  <span className="text-gray-700">Partial profiles</span>
                </div>
                <span className="font-semibold text-gray-900">{completeness.partialProfiles}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-gray-700">Incomplete profiles</span>
                </div>
                <span className="font-semibold text-gray-900">{completeness.incompleteProfiles}</span>
              </div>
            </div>
          </div>

          {/* Field coverage bars */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Field Coverage</h3>
            <div className="space-y-4">
              {[
                { label: 'Birth Dates', value: completeness.fieldCoverage.birthDates, icon: Calendar },
                { label: 'Death Dates', value: completeness.fieldCoverage.deathDates, icon: Calendar },
                { label: 'Birth Places', value: completeness.fieldCoverage.birthPlaces, icon: MapPin },
                { label: 'Photos', value: completeness.fieldCoverage.photos, icon: Camera },
                { label: 'Biographies', value: completeness.fieldCoverage.biographies, icon: FileText },
                { label: 'Occupations', value: completeness.fieldCoverage.occupations, icon: User },
                { label: 'Relationships', value: completeness.fieldCoverage.relationships, icon: Link },
              ].map(field => {
                const Icon = field.icon;
                return (
                  <div key={field.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{field.label}</span>
                      </div>
                      <span className={`text-sm font-medium ${getScoreColor(field.value)}`}>
                        {field.value}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreBgColor(field.value)}`}
                        style={{ width: `${field.value}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="space-y-3">
          {completeness.suggestions.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-600">Great job! No suggestions at this time.</p>
            </div>
          ) : (
            completeness.suggestions.map(suggestion => {
              const Icon = getSuggestionIcon(suggestion.type);
              const isExpanded = expandedSuggestion === suggestion.id;

              return (
                <div
                  key={suggestion.id}
                  className="bg-white rounded-xl border overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedSuggestion(isExpanded ? null : suggestion.id)}
                    className="w-full p-4 flex items-start gap-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${getPriorityColor(suggestion.priority)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{suggestion.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(suggestion.priority)}`}>
                          {suggestion.priority}
                        </span>
                      </div>
                      {suggestion.personName && (
                        <p className="text-sm text-gray-500">{suggestion.personName}</p>
                      )}
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t bg-gray-50">
                      <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                      <Button
                        size="sm"
                        onClick={() => handleSuggestionAction(suggestion)}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        {suggestion.action}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {completeness.badges.map(badge => {
            const Icon = getBadgeIcon(badge.icon);
            const progressPercent = Math.min(100, (badge.progress / badge.requirement) * 100);

            return (
              <div
                key={badge.id}
                className={`rounded-xl border p-4 text-center transition-all ${
                  badge.earned
                    ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'
                    : 'bg-gray-50 border-gray-200 opacity-75'
                }`}
              >
                <div
                  className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                    badge.earned
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className={`font-semibold mb-1 ${badge.earned ? 'text-amber-900' : 'text-gray-600'}`}>
                  {badge.name}
                </h4>
                <p className="text-xs text-gray-500 mb-2">{badge.description}</p>

                {!badge.earned && (
                  <>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {badge.progress} / {badge.requirement}
                    </p>
                  </>
                )}

                {badge.earned && (
                  <div className="flex items-center justify-center gap-1 text-amber-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-medium">Earned!</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'incomplete' && (
        <div className="space-y-3">
          {completeness.incompleteMembers.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-600">All profiles are complete!</p>
            </div>
          ) : (
            completeness.incompleteMembers.map(person => (
              <div
                key={person.id}
                className="bg-white rounded-xl border p-4 flex items-center gap-4"
              >
                {person.photoUrl ? (
                  <img
                    src={person.photoUrl}
                    alt={person.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{person.name}</span>
                    <span className={`text-xs font-medium ${getScoreColor(person.completeness)}`}>
                      {person.completeness}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    Missing: {person.missingFields.slice(0, 3).join(', ')}
                    {person.missingFields.length > 3 && ` +${person.missingFields.length - 3} more`}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateToPerson?.(person.id)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onEditPerson?.(person.id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Complete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default CompletenessWidget;
