import { memo, useState } from 'react';
import { User, Heart, Shield, Lock, Eye, Baby } from 'lucide-react';
import type { Person } from '@mindmapper/types';
import { calculateAge } from '@/lib/dateUtils';

interface LinkedPersonData {
  id: string;
  firstName: string;
  lastName: string;
  generation: number;
}

export interface PersonCardProps {
  person: Person;
  width: number;
  height: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  hasSpouse?: boolean;
  hasChildren?: boolean;
  linkedPerson?: LinkedPersonData | null;
  onClick?: (person: Person) => void;
  onDoubleClick?: (person: Person) => void;
}

const GENERATION_COLORS = [
  'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300',
  'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300',
  'bg-gradient-to-br from-green-50 to-green-100 border-green-300',
  'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300',
  'bg-gradient-to-br from-rose-50 to-rose-100 border-rose-300',
  'bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-300',
  'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300',
];

function getPrivacyIcon(privacy: string | undefined) {
  switch (privacy) {
    case 'PUBLIC':
      return <Eye className="w-3 h-3 text-emerald-600" />;
    case 'FAMILY_ONLY':
      return <Shield className="w-3 h-3 text-amber-600" />;
    case 'PRIVATE':
      return <Lock className="w-3 h-3 text-red-600" />;
    default:
      return null;
  }
}

function getGenerationColor(generation: number): string {
  const index = Math.abs(generation) % GENERATION_COLORS.length;
  return GENERATION_COLORS[index];
}

function formatLifespan(person: Person): string {
  const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : null;
  const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : null;

  if (birthYear && deathYear) {
    return `${birthYear} - ${deathYear}`;
  }
  if (birthYear && person.isLiving) {
    const age = calculateAge(person.birthDate!, null);
    return age ? `b. ${birthYear} (${age})` : `b. ${birthYear}`;
  }
  if (birthYear) {
    return `b. ${birthYear}`;
  }
  return '';
}

function PersonCardComponent({
  person,
  width,
  height,
  isSelected = false,
  isHighlighted = false,
  hasSpouse = false,
  hasChildren = false,
  linkedPerson,
  onClick,
  onDoubleClick,
}: PersonCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    onClick?.(person);
  };

  const handleDoubleClick = () => {
    onDoubleClick?.(person);
  };

  const fullName = [
    person.firstName,
    person.middleName,
    person.lastName,
  ].filter(Boolean).join(' ');

  const displayName = person.maidenName
    ? `${fullName} (née ${person.maidenName})`
    : fullName;

  const lifespan = formatLifespan(person);
  const generationColor = getGenerationColor(person.generation ?? 0);

  return (
    <div
      data-testid={`person-card-${person.id}`}
      className={`
        rounded-lg border-2 shadow-sm cursor-pointer transition-all duration-200
        ${generationColor}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 border-blue-500' : ''}
        ${isHighlighted ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}
        ${isHovered ? 'shadow-lg scale-105 z-10' : ''}
      `}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${displayName}${lifespan ? `, ${lifespan}` : ''}${!person.isLiving ? ', deceased' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex h-full p-2 gap-2">
        {/* Photo */}
        <div className="flex-shrink-0">
          {person.profilePhoto ? (
            <img
              src={person.profilePhoto}
              alt={fullName}
              className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center border-2 border-white shadow-sm">
              <User className="w-7 h-7 text-gray-500" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1">
            <h3
              data-testid="person-card-name"
              className="text-sm font-semibold text-gray-900 truncate"
              title={displayName}
            >
              {person.firstName} {person.lastName}
            </h3>
            {getPrivacyIcon(person.privacy)}
          </div>

          {person.maidenName && (
            <p data-testid="person-card-maiden-name" className="text-xs text-gray-500 truncate">née {person.maidenName}</p>
          )}

          {lifespan && (
            <p data-testid="person-card-lifespan" className="text-xs text-gray-600 mt-0.5">{lifespan}</p>
          )}

          {/* Relationship indicators */}
          <div data-testid="person-card-indicators" className="flex items-center gap-1 mt-1">
            {linkedPerson && linkedPerson.id === person.id && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                You
              </span>
            )}
            {linkedPerson && linkedPerson.id !== person.id && person.generation !== linkedPerson.generation && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  person.generation < linkedPerson.generation
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
                title={`${Math.abs(linkedPerson.generation - person.generation)} generation${Math.abs(linkedPerson.generation - person.generation) > 1 ? 's' : ''} ${person.generation < linkedPerson.generation ? 'older' : 'younger'} than you`}
              >
                {person.generation < linkedPerson.generation
                  ? `+${linkedPerson.generation - person.generation}`
                  : `${linkedPerson.generation - person.generation}`}
              </span>
            )}
            {hasSpouse && (
              <span data-testid="person-card-spouse-indicator" title="Has spouse">
                <Heart className="w-3 h-3 text-rose-500" />
              </span>
            )}
            {hasChildren && (
              <span data-testid="person-card-children-indicator" title="Has children">
                <Baby className="w-3 h-3 text-blue-500" />
              </span>
            )}
            {!person.isLiving && (
              <span data-testid="person-card-deceased-indicator" className="text-xs text-gray-400">†</span>
            )}
          </div>
        </div>
      </div>

      {/* Hover preview */}
      {isHovered && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 bg-white rounded-lg shadow-xl border p-3 w-64 pointer-events-none">
          <div className="space-y-1">
            <p className="font-medium text-gray-900">{displayName}</p>
            {lifespan && <p className="text-sm text-gray-600">{lifespan}</p>}
            {person.birthPlace && (
              <p className="text-xs text-gray-500">Born: {person.birthPlace}</p>
            )}
            {person.occupation && (
              <p className="text-xs text-gray-500">Occupation: {person.occupation}</p>
            )}
            {person.biography && (
              <p className="text-xs text-gray-500 line-clamp-2">{person.biography}</p>
            )}
            <p className="text-xs text-blue-600 mt-2">Click to view details</p>
          </div>
        </div>
      )}
    </div>
  );
}

export const PersonCard = memo(PersonCardComponent);
