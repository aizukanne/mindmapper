import { useState, useEffect } from 'react';
import {
  Trophy,
  Star,
  Medal,
  Crown,
  Heart,
  Camera,
  BookOpen,
  Users,
  Clock,
  Award,
  CheckCircle2,
  Lock,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';

// Badge definitions
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: 'trophy' | 'star' | 'medal' | 'crown' | 'heart' | 'camera' | 'book' | 'users' | 'clock';
  category: 'data' | 'engagement' | 'milestone';
  requirement: number;
  requirementType: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface EarnedBadge extends BadgeDefinition {
  earnedAt: string;
  progress: number;
}

export interface BadgeProgress extends BadgeDefinition {
  progress: number;
  earned: boolean;
  earnedAt?: string;
}

interface BadgesProps {
  treeId: string;
  compact?: boolean;
  onBadgeClick?: (badge: BadgeProgress) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Badge icon mapping
function getBadgeIcon(icon: BadgeDefinition['icon']) {
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

// Tier colors
function getTierColors(tier: BadgeDefinition['tier'], earned: boolean) {
  if (!earned) {
    return {
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      icon: 'text-gray-400',
      text: 'text-gray-500',
    };
  }

  switch (tier) {
    case 'bronze':
      return {
        bg: 'bg-gradient-to-br from-orange-100 to-amber-100',
        border: 'border-orange-300',
        icon: 'text-orange-600',
        text: 'text-orange-800',
      };
    case 'silver':
      return {
        bg: 'bg-gradient-to-br from-gray-100 to-slate-200',
        border: 'border-gray-400',
        icon: 'text-gray-600',
        text: 'text-gray-800',
      };
    case 'gold':
      return {
        bg: 'bg-gradient-to-br from-yellow-100 to-amber-200',
        border: 'border-yellow-400',
        icon: 'text-yellow-600',
        text: 'text-yellow-800',
      };
    case 'platinum':
      return {
        bg: 'bg-gradient-to-br from-blue-100 to-indigo-200',
        border: 'border-blue-400',
        icon: 'text-blue-600',
        text: 'text-blue-800',
      };
  }
}

// Default badge definitions
const DEFAULT_BADGES: BadgeDefinition[] = [
  // Data completeness badges
  {
    id: 'first_photo',
    name: 'Shutterbug',
    description: 'Add your first photo',
    longDescription: 'Upload the first photo to your family tree. Photos bring your ancestors to life!',
    icon: 'camera',
    category: 'data',
    requirement: 1,
    requirementType: 'photos',
    tier: 'bronze',
  },
  {
    id: 'photographer',
    name: 'Family Photographer',
    description: 'Add 10 photos',
    longDescription: 'Build a visual history by adding 10 photos to your family tree.',
    icon: 'camera',
    category: 'data',
    requirement: 10,
    requirementType: 'photos',
    tier: 'silver',
  },
  {
    id: 'archivist',
    name: 'Family Archivist',
    description: 'Add 50 photos',
    longDescription: 'Create a comprehensive photo archive with 50 photos.',
    icon: 'camera',
    category: 'data',
    requirement: 50,
    requirementType: 'photos',
    tier: 'gold',
  },
  {
    id: 'first_story',
    name: 'Storyteller',
    description: 'Write your first family story',
    longDescription: 'Preserve family memories by writing your first story.',
    icon: 'book',
    category: 'data',
    requirement: 1,
    requirementType: 'stories',
    tier: 'bronze',
  },
  {
    id: 'historian',
    name: 'Family Historian',
    description: 'Write 5 family stories',
    longDescription: 'Become the family historian by recording 5 stories.',
    icon: 'book',
    category: 'data',
    requirement: 5,
    requirementType: 'stories',
    tier: 'silver',
  },
  // Milestone badges
  {
    id: 'starter',
    name: 'Tree Starter',
    description: 'Add 5 family members',
    longDescription: 'Begin your journey by adding 5 family members to your tree.',
    icon: 'users',
    category: 'milestone',
    requirement: 5,
    requirementType: 'members',
    tier: 'bronze',
  },
  {
    id: 'growing_tree',
    name: 'Growing Tree',
    description: 'Add 25 family members',
    longDescription: 'Your tree is growing! Add 25 family members.',
    icon: 'users',
    category: 'milestone',
    requirement: 25,
    requirementType: 'members',
    tier: 'silver',
  },
  {
    id: 'family_forest',
    name: 'Family Forest',
    description: 'Add 100 family members',
    longDescription: 'Create a forest of family connections with 100 members.',
    icon: 'users',
    category: 'milestone',
    requirement: 100,
    requirementType: 'members',
    tier: 'gold',
  },
  {
    id: 'dynasty',
    name: 'Dynasty Builder',
    description: 'Add 500 family members',
    longDescription: 'Build a dynasty spanning generations with 500 members.',
    icon: 'crown',
    category: 'milestone',
    requirement: 500,
    requirementType: 'members',
    tier: 'platinum',
  },
  {
    id: 'three_generations',
    name: 'Three Generations',
    description: 'Record 3 generations',
    longDescription: 'Connect three generations of your family.',
    icon: 'users',
    category: 'milestone',
    requirement: 3,
    requirementType: 'generations',
    tier: 'bronze',
  },
  {
    id: 'five_generations',
    name: 'Five Generations',
    description: 'Record 5 generations',
    longDescription: 'Trace your family through five generations.',
    icon: 'users',
    category: 'milestone',
    requirement: 5,
    requirementType: 'generations',
    tier: 'silver',
  },
  {
    id: 'deep_roots',
    name: 'Deep Roots',
    description: 'Record 8+ generations',
    longDescription: 'Uncover your deep roots with 8 or more generations.',
    icon: 'trophy',
    category: 'milestone',
    requirement: 8,
    requirementType: 'generations',
    tier: 'gold',
  },
  // Engagement badges
  {
    id: 'connector',
    name: 'Connector',
    description: 'Add 10 relationships',
    longDescription: 'Build family connections by adding 10 relationships.',
    icon: 'heart',
    category: 'engagement',
    requirement: 10,
    requirementType: 'relationships',
    tier: 'bronze',
  },
  {
    id: 'web_weaver',
    name: 'Web Weaver',
    description: 'Add 50 relationships',
    longDescription: 'Weave a complex web of family connections with 50 relationships.',
    icon: 'heart',
    category: 'engagement',
    requirement: 50,
    requirementType: 'relationships',
    tier: 'silver',
  },
  {
    id: 'time_traveler',
    name: 'Time Traveler',
    description: 'Add dates spanning 100+ years',
    longDescription: 'Travel through time with dates spanning over a century.',
    icon: 'clock',
    category: 'engagement',
    requirement: 100,
    requirementType: 'yearSpan',
    tier: 'gold',
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Achieve 100% tree completeness',
    longDescription: 'Complete every profile in your tree to perfection.',
    icon: 'star',
    category: 'engagement',
    requirement: 100,
    requirementType: 'completeness',
    tier: 'platinum',
  },
];

export function Badges({ treeId, compact = false, onBadgeClick }: BadgesProps) {
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgress | null>(null);
  const [filter, setFilter] = useState<'all' | 'earned' | 'in_progress'>('all');

  useEffect(() => {
    async function fetchBadges() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/badges`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          // If endpoint doesn't exist yet, use default badges with 0 progress
          if (response.status === 404) {
            setBadges(DEFAULT_BADGES.map(b => ({ ...b, progress: 0, earned: false })));
            return;
          }
          throw new Error('Failed to fetch badges');
        }

        const data = await response.json();
        setBadges(data.data);
      } catch (err) {
        // Fallback to default badges
        setBadges(DEFAULT_BADGES.map(b => ({ ...b, progress: 0, earned: false })));
      } finally {
        setLoading(false);
      }
    }

    fetchBadges();
  }, [treeId]);

  const earnedCount = badges.filter(b => b.earned).length;
  const totalCount = badges.length;

  const filteredBadges = badges.filter(b => {
    if (filter === 'earned') return b.earned;
    if (filter === 'in_progress') return !b.earned && b.progress > 0;
    return true;
  });

  const groupedBadges = {
    milestone: filteredBadges.filter(b => b.category === 'milestone'),
    data: filteredBadges.filter(b => b.category === 'data'),
    engagement: filteredBadges.filter(b => b.category === 'engagement'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  // Compact view - just show earned badges count
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
        <Trophy className="w-5 h-5 text-amber-600" />
        <span className="text-sm font-medium text-amber-800">
          {earnedCount} / {totalCount} Badges
        </span>
        <ChevronRight className="w-4 h-4 text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Badges & Achievements
          </h2>
          <p className="text-gray-500 mt-1">
            {earnedCount} of {totalCount} badges earned
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'earned', 'in_progress'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {f === 'all' ? 'All' : f === 'earned' ? 'Earned' : 'In Progress'}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-amber-800">Overall Progress</span>
          <span className="text-sm font-bold text-amber-900">
            {Math.round((earnedCount / totalCount) * 100)}%
          </span>
        </div>
        <div className="h-3 bg-amber-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full transition-all"
            style={{ width: `${(earnedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Badge categories */}
      {Object.entries(groupedBadges).map(([category, categoryBadges]) => {
        if (categoryBadges.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {category === 'milestone' ? 'Milestones' : category === 'data' ? 'Data Collection' : 'Engagement'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categoryBadges.map(badge => {
                const Icon = getBadgeIcon(badge.icon);
                const colors = getTierColors(badge.tier, badge.earned);
                const progressPercent = Math.min(100, (badge.progress / badge.requirement) * 100);

                return (
                  <button
                    key={badge.id}
                    onClick={() => {
                      setSelectedBadge(badge);
                      onBadgeClick?.(badge);
                    }}
                    className={`relative rounded-xl border-2 p-4 text-center transition-all hover:scale-105 ${colors.bg} ${colors.border}`}
                  >
                    {/* Lock overlay for unearned */}
                    {!badge.earned && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-4 h-4 text-gray-400" />
                      </div>
                    )}

                    {/* Earned sparkle */}
                    {badge.earned && (
                      <div className="absolute top-2 right-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                      </div>
                    )}

                    <div
                      className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center ${
                        badge.earned ? 'bg-white/50' : 'bg-gray-200'
                      }`}
                    >
                      <Icon className={`w-7 h-7 ${colors.icon}`} />
                    </div>

                    <h4 className={`font-semibold text-sm mb-1 ${colors.text}`}>
                      {badge.name}
                    </h4>
                    <p className="text-xs text-gray-500 mb-2">{badge.description}</p>

                    {badge.earned ? (
                      <div className="flex items-center justify-center gap-1 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Earned!</span>
                      </div>
                    ) : (
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

                    {/* Tier indicator */}
                    <div className={`absolute -top-1 -left-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      badge.tier === 'bronze' ? 'bg-orange-200 text-orange-800' :
                      badge.tier === 'silver' ? 'bg-gray-300 text-gray-800' :
                      badge.tier === 'gold' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-blue-200 text-blue-800'
                    }`}>
                      {badge.tier}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Badge detail modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className={`p-6 text-center ${getTierColors(selectedBadge.tier, selectedBadge.earned).bg}`}>
              <button
                onClick={() => setSelectedBadge(null)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              <div
                className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  selectedBadge.earned ? 'bg-white/50' : 'bg-gray-200'
                }`}
              >
                {(() => {
                  const Icon = getBadgeIcon(selectedBadge.icon);
                  return <Icon className={`w-10 h-10 ${getTierColors(selectedBadge.tier, selectedBadge.earned).icon}`} />;
                })()}
              </div>

              <h3 className={`text-xl font-bold ${getTierColors(selectedBadge.tier, selectedBadge.earned).text}`}>
                {selectedBadge.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{selectedBadge.description}</p>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">{selectedBadge.longDescription}</p>

              {selectedBadge.earned ? (
                <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-lg text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Badge Earned!</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedBadge.progress} / {selectedBadge.requirement}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (selectedBadge.progress / selectedBadge.requirement) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Badges;
