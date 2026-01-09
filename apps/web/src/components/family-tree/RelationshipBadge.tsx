/**
 * RelationshipBadge - Displays a computed relationship with appropriate styling
 *
 * Shows the relationship type with color coding:
 * - Blood relatives: Blue/Green shades
 * - In-laws: Purple shades
 * - Step relations: Yellow/Orange shades
 * - Spouses: Red/Pink shades
 */

import React from 'react';
import {
  Heart,
  Users,
  User,
  Baby,
  UserPlus,
  Home,
  GitBranch,
} from 'lucide-react';
import type { ComputedRelationship, RelationshipResult } from '../../lib/relationship-api';

interface RelationshipBadgeProps {
  /** The computed relationship to display */
  relationship: ComputedRelationship | RelationshipResult;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the icon */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Get the appropriate icon for a relationship type
 */
function getRelationshipIcon(type: string, displayName: string): React.ReactNode {
  const lowerType = type?.toLowerCase() || '';
  const lowerName = displayName?.toLowerCase() || '';

  // Check display name first for more specific matches
  if (lowerName.includes('spouse') || lowerName.includes('husband') || lowerName.includes('wife')) {
    return <Heart className="w-3.5 h-3.5" />;
  }
  if (lowerName.includes('cousin')) {
    return <GitBranch className="w-3.5 h-3.5" />;
  }
  if (lowerName.includes('sibling') || lowerName.includes('brother') || lowerName.includes('sister')) {
    return <Users className="w-3.5 h-3.5" />;
  }
  if (lowerName.includes('child') || lowerName.includes('son') || lowerName.includes('daughter')) {
    return <Baby className="w-3.5 h-3.5" />;
  }
  if (
    lowerName.includes('parent') ||
    lowerName.includes('father') ||
    lowerName.includes('mother') ||
    lowerName.includes('grandfather') ||
    lowerName.includes('grandmother')
  ) {
    return <User className="w-3.5 h-3.5" />;
  }
  if (lowerName.includes('uncle') || lowerName.includes('aunt')) {
    return <UserPlus className="w-3.5 h-3.5" />;
  }
  if (lowerName.includes('nephew') || lowerName.includes('niece')) {
    return <UserPlus className="w-3.5 h-3.5" />;
  }

  // Fallback to type-based matching
  if (lowerType === 'spouse') return <Heart className="w-3.5 h-3.5" />;
  if (lowerType === 'sibling') return <Users className="w-3.5 h-3.5" />;
  if (lowerType === 'parent' || lowerType === 'ancestor') return <User className="w-3.5 h-3.5" />;
  if (lowerType === 'child' || lowerType === 'descendant') return <Baby className="w-3.5 h-3.5" />;
  if (lowerType === 'cousin') return <GitBranch className="w-3.5 h-3.5" />;

  return <Home className="w-3.5 h-3.5" />;
}

/**
 * Get badge colors based on relationship characteristics
 */
function getBadgeColors(
  relationship: ComputedRelationship | RelationshipResult
): { bg: string; text: string; border: string } {
  const displayName = relationship.displayName?.toLowerCase() || '';
  const type = relationship.type?.toLowerCase() || '';

  // Spouse relationships - Red/Pink
  if (type === 'spouse' || displayName.includes('spouse') || displayName.includes('husband') || displayName.includes('wife')) {
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  }

  // In-law relationships - Purple
  if (relationship.isInLaw) {
    return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
  }

  // Step relationships - Yellow/Orange
  if (relationship.isStep) {
    return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
  }

  // Half relationships - Teal
  if (relationship.isHalf) {
    return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' };
  }

  // Blood relatives by generation
  if (relationship.isBloodRelation) {
    const genDiff = relationship.generationDifference || 0;

    // Direct ancestors/descendants (parents, grandparents, children, grandchildren)
    if (genDiff !== 0 && !displayName.includes('cousin')) {
      if (genDiff > 0) {
        // Ancestors - Green shades
        return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
      } else {
        // Descendants - Blue shades
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
      }
    }

    // Siblings - Indigo
    if (type === 'sibling' || displayName.includes('sibling') || displayName.includes('brother') || displayName.includes('sister')) {
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
    }

    // Cousins - Cyan
    if (type === 'cousin' || displayName.includes('cousin')) {
      return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' };
    }

    // Aunt/Uncle/Niece/Nephew - Emerald
    if (
      displayName.includes('aunt') ||
      displayName.includes('uncle') ||
      displayName.includes('niece') ||
      displayName.includes('nephew')
    ) {
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    }

    // Default blood relative - Blue
    return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
  }

  // Default - Gray
  return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
}

/**
 * Get size classes for the badge
 */
function getSizeClasses(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'px-1.5 py-0.5 text-xs';
    case 'lg':
      return 'px-3 py-1.5 text-sm';
    case 'md':
    default:
      return 'px-2 py-1 text-xs';
  }
}

export function RelationshipBadge({
  relationship,
  size = 'md',
  showIcon = true,
  className = '',
  onClick,
}: RelationshipBadgeProps) {
  // Handle the case where there's no relationship
  if ('isRelated' in relationship && !relationship.isRelated) {
    return (
      <span
        className={`
          inline-flex items-center gap-1 rounded-full border font-medium
          bg-gray-50 text-gray-500 border-gray-200
          ${getSizeClasses(size)}
          ${className}
        `}
      >
        Not related
      </span>
    );
  }

  const displayName = relationship.displayName || relationship.type || 'Related';
  const colors = getBadgeColors(relationship);
  const icon = showIcon ? getRelationshipIcon(relationship.type || '', displayName) : null;

  const badge = (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${colors.bg} ${colors.text} ${colors.border}
        ${getSizeClasses(size)}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {icon}
      <span>{displayName}</span>
    </span>
  );

  return badge;
}

/**
 * Compact version for lists
 */
export function RelationshipBadgeCompact({
  relationship,
  className = '',
}: {
  relationship: ComputedRelationship | RelationshipResult;
  className?: string;
}) {
  return (
    <RelationshipBadge
      relationship={relationship}
      size="sm"
      showIcon={false}
      className={className}
    />
  );
}

/**
 * Detailed badge with extra info (generation difference, cousin details)
 */
export function RelationshipBadgeDetailed({
  relationship,
  className = '',
}: {
  relationship: ComputedRelationship | RelationshipResult;
  className?: string;
}) {
  const colors = getBadgeColors(relationship);

  // Build detail string
  const details: string[] = [];
  if (relationship.generationDifference !== undefined && relationship.generationDifference !== 0) {
    const genDiff = Math.abs(relationship.generationDifference);
    details.push(`${genDiff} gen${genDiff > 1 ? 's' : ''} ${relationship.generationDifference > 0 ? 'up' : 'down'}`);
  }
  if (relationship.isHalf) details.push('half');
  if (relationship.isStep) details.push('step');
  if (relationship.isInLaw) details.push('in-law');

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <RelationshipBadge relationship={relationship} size="md" />
      {details.length > 0 && (
        <span className={`text-xs mt-0.5 ${colors.text} opacity-75`}>
          {details.join(' • ')}
        </span>
      )}
    </div>
  );
}

export default RelationshipBadge;
