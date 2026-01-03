import { memo } from 'react';
import { User, Heart, Users } from 'lucide-react';

export interface MobilePersonData {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  maidenName?: string | null;
  nickname?: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
  isLiving: boolean;
  profilePhoto?: string | null;
  generation: number;
}

interface MobilePersonCardProps {
  person: MobilePersonData;
  isSelected?: boolean;
  isHighlighted?: boolean;
  size?: 'compact' | 'normal' | 'expanded';
  onClick?: () => void;
  onLongPress?: () => void;
  showRelationshipIndicators?: boolean;
  parentCount?: number;
  childCount?: number;
  spouseCount?: number;
}

// Format date for display
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.getFullYear().toString();
  } catch {
    return '';
  }
}

// Calculate age
function calculateAge(birthDate?: string | null, deathDate?: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const end = deathDate ? new Date(deathDate) : new Date();
  const age = Math.floor((end.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return age >= 0 ? age : null;
}

// Get initials from name
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Get border color based on gender
function getGenderColor(gender: MobilePersonData['gender']): string {
  switch (gender) {
    case 'MALE': return 'border-blue-400';
    case 'FEMALE': return 'border-pink-400';
    default: return 'border-gray-300';
  }
}

// Get background color based on gender
function getGenderBgColor(gender: MobilePersonData['gender']): string {
  switch (gender) {
    case 'MALE': return 'bg-blue-50';
    case 'FEMALE': return 'bg-pink-50';
    default: return 'bg-gray-50';
  }
}

export const MobilePersonCard = memo(function MobilePersonCard({
  person,
  isSelected = false,
  isHighlighted = false,
  size = 'normal',
  onClick,
  onLongPress,
  showRelationshipIndicators = false,
  parentCount = 0,
  childCount = 0,
  spouseCount = 0,
}: MobilePersonCardProps) {
  const age = calculateAge(person.birthDate, person.deathDate);
  const birthYear = formatDate(person.birthDate);
  const deathYear = formatDate(person.deathDate);

  const sizeClasses = {
    compact: 'w-20 p-2',
    normal: 'w-32 p-3',
    expanded: 'w-44 p-4',
  };

  const photoSizes = {
    compact: 'w-10 h-10',
    normal: 'w-14 h-14',
    expanded: 'w-20 h-20',
  };

  const textSizes = {
    compact: 'text-xs',
    normal: 'text-sm',
    expanded: 'text-base',
  };

  return (
    <div
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.();
      }}
      className={`
        ${sizeClasses[size]}
        rounded-xl border-2 shadow-sm
        ${getGenderColor(person.gender)}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${isHighlighted ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}
        ${person.isLiving ? 'bg-white' : getGenderBgColor(person.gender)}
        ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}
        touch-manipulation select-none
      `}
    >
      {/* Photo or Initials */}
      <div className="flex justify-center mb-2">
        {person.profilePhoto ? (
          <img
            src={person.profilePhoto}
            alt={`${person.firstName} ${person.lastName}`}
            className={`${photoSizes[size]} rounded-full object-cover border-2 border-white shadow`}
            loading="lazy"
          />
        ) : (
          <div
            className={`${photoSizes[size]} rounded-full flex items-center justify-center ${getGenderBgColor(person.gender)} border-2 border-white shadow`}
          >
            <span className={`${textSizes[size]} font-bold text-gray-600`}>
              {getInitials(person.firstName, person.lastName)}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <div className="text-center">
        <p className={`${textSizes[size]} font-semibold text-gray-900 truncate`}>
          {person.firstName}
          {person.nickname && size !== 'compact' && (
            <span className="text-gray-500"> "{person.nickname}"</span>
          )}
        </p>
        <p className={`${textSizes[size]} text-gray-600 truncate`}>
          {person.maidenName && size !== 'compact' ? (
            <>
              {person.lastName} <span className="text-gray-400">(née {person.maidenName})</span>
            </>
          ) : (
            person.lastName
          )}
        </p>
      </div>

      {/* Dates */}
      {size !== 'compact' && (birthYear || deathYear) && (
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500">
            {birthYear && deathYear ? (
              `${birthYear} – ${deathYear}`
            ) : birthYear ? (
              person.isLiving ? `b. ${birthYear}` : `${birthYear} –`
            ) : null}
            {age !== null && size === 'expanded' && (
              <span className="ml-1">({age})</span>
            )}
          </p>
        </div>
      )}

      {/* Living indicator */}
      {!person.isLiving && size !== 'compact' && (
        <div className="mt-1 text-center">
          <span className="inline-block px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
            Deceased
          </span>
        </div>
      )}

      {/* Relationship indicators */}
      {showRelationshipIndicators && size !== 'compact' && (
        <div className="mt-2 flex justify-center gap-2">
          {parentCount > 0 && (
            <div className="flex items-center gap-0.5 text-xs text-gray-400">
              <Users className="w-3 h-3" />
              <span>{parentCount}</span>
            </div>
          )}
          {spouseCount > 0 && (
            <div className="flex items-center gap-0.5 text-xs text-pink-400">
              <Heart className="w-3 h-3" />
              <span>{spouseCount}</span>
            </div>
          )}
          {childCount > 0 && (
            <div className="flex items-center gap-0.5 text-xs text-blue-400">
              <User className="w-3 h-3" />
              <span>{childCount}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Connection line component for tree visualization
interface ConnectionLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  type: 'parent' | 'spouse' | 'sibling';
  isHighlighted?: boolean;
}

export function ConnectionLine({ from, to, type, isHighlighted = false }: ConnectionLineProps) {
  const typeColors = {
    parent: isHighlighted ? 'stroke-blue-500' : 'stroke-gray-300',
    spouse: isHighlighted ? 'stroke-pink-500' : 'stroke-pink-300',
    sibling: isHighlighted ? 'stroke-green-500' : 'stroke-gray-300',
  };

  const strokeWidth = isHighlighted ? 3 : 2;

  // Calculate control points for curved line
  const midY = (from.y + to.y) / 2;

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: Math.min(from.x, to.x),
        top: Math.min(from.y, to.y),
        width: Math.abs(to.x - from.x) + 10,
        height: Math.abs(to.y - from.y) + 10,
      }}
    >
      <path
        d={`M ${from.x - Math.min(from.x, to.x) + 5} ${from.y - Math.min(from.y, to.y) + 5}
            Q ${from.x - Math.min(from.x, to.x) + 5} ${midY - Math.min(from.y, to.y) + 5},
              ${(from.x + to.x) / 2 - Math.min(from.x, to.x) + 5} ${midY - Math.min(from.y, to.y) + 5}
            Q ${to.x - Math.min(from.x, to.x) + 5} ${midY - Math.min(from.y, to.y) + 5},
              ${to.x - Math.min(from.x, to.x) + 5} ${to.y - Math.min(from.y, to.y) + 5}`}
        fill="none"
        className={typeColors[type]}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default MobilePersonCard;
