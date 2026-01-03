import { useState, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Menu,
  User,
  Users,
  Edit,
  Trash2,
  Link,
  ChevronRight,
  X,
  Home,
  BarChart3,
  Upload,
  Settings,
  History,
} from 'lucide-react';
import { useMobileTreeGestures } from '@/hooks/useMobileTreeGestures';
import { MobilePersonCard, type MobilePersonData } from './MobilePersonCard';
import { MobileBottomSheet, QuickAction, MenuItem } from './MobileBottomSheet';

interface Relationship {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  type: string;
}

interface Marriage {
  id: string;
  person1Id: string;
  person2Id: string;
}

interface MobileFamilyTreeProps {
  treeId: string;
  treeName: string;
  people: MobilePersonData[];
  relationships: Relationship[];
  marriages: Marriage[];
  onPersonSelect?: (person: MobilePersonData) => void;
  onAddPerson?: () => void;
  onEditPerson?: (person: MobilePersonData) => void;
  onDeletePerson?: (person: MobilePersonData) => void;
  onAddRelationship?: (person: MobilePersonData) => void;
  onViewStatistics?: () => void;
  onImportGedcom?: () => void;
  onViewActivity?: () => void;
  onSettings?: () => void;
  className?: string;
}

// Layout constants
const CARD_WIDTH = 140;
const CARD_HEIGHT = 180;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 80;
const SPOUSE_GAP = 20;

// Calculate tree layout positions
function calculateLayout(
  people: MobilePersonData[],
  _relationships: Relationship[],
  marriages: Marriage[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Group by generation
  const generations = new Map<number, MobilePersonData[]>();
  people.forEach(p => {
    const gen = p.generation;
    if (!generations.has(gen)) {
      generations.set(gen, []);
    }
    generations.get(gen)!.push(p);
  });

  // Sort generations
  const sortedGens = Array.from(generations.keys()).sort((a, b) => a - b);

  // Calculate positions for each generation
  sortedGens.forEach((gen, genIndex) => {
    const genPeople = generations.get(gen)!;
    const y = genIndex * (CARD_HEIGHT + VERTICAL_GAP) + 50;

    // Group spouses together
    const positioned = new Set<string>();
    let x = 50;

    genPeople.forEach(person => {
      if (positioned.has(person.id)) return;

      // Find spouse
      const marriage = marriages.find(
        m => m.person1Id === person.id || m.person2Id === person.id
      );
      const spouseId = marriage
        ? marriage.person1Id === person.id
          ? marriage.person2Id
          : marriage.person1Id
        : null;
      const spouse = spouseId ? genPeople.find(p => p.id === spouseId) : null;

      if (spouse && !positioned.has(spouseId!)) {
        // Position as couple
        positions.set(person.id, { x, y });
        positions.set(spouse.id, { x: x + CARD_WIDTH + SPOUSE_GAP, y });
        positioned.add(person.id);
        positioned.add(spouse.id);
        x += (CARD_WIDTH + SPOUSE_GAP) * 2 + HORIZONTAL_GAP;
      } else if (!spouse) {
        // Position single
        positions.set(person.id, { x, y });
        positioned.add(person.id);
        x += CARD_WIDTH + HORIZONTAL_GAP;
      }
    });
  });

  return positions;
}

export function MobileFamilyTree({
  treeName,
  people,
  relationships,
  marriages,
  onPersonSelect,
  onAddPerson,
  onEditPerson,
  onDeletePerson,
  onAddRelationship,
  onViewStatistics,
  onImportGedcom,
  onViewActivity,
  onSettings,
  className = '',
}: MobileFamilyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPerson, setSelectedPerson] = useState<MobilePersonData | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showPersonSheet, setShowPersonSheet] = useState(false);

  const {
    transform,
    handlers,
    zoomIn,
    zoomOut,
    resetView,
    centerOnPoint,
  } = useMobileTreeGestures(containerRef, {
    minScale: 0.25,
    maxScale: 3,
    initialScale: 0.8,
    onDoubleTap: (point) => {
      // Find person at tap location
      const positions = calculateLayout(people, relationships, marriages);
      for (const [id, pos] of positions.entries()) {
        const screenX = pos.x * transform.scale + transform.x;
        const screenY = pos.y * transform.scale + transform.y;
        if (
          point.x >= screenX &&
          point.x <= screenX + CARD_WIDTH * transform.scale &&
          point.y >= screenY &&
          point.y <= screenY + CARD_HEIGHT * transform.scale
        ) {
          const person = people.find(p => p.id === id);
          if (person) {
            handlePersonTap(person);
          }
          break;
        }
      }
    },
  });

  // Calculate positions
  const positions = useMemo(
    () => calculateLayout(people, relationships, marriages),
    [people, relationships, marriages]
  );

  // Calculate canvas size
  const canvasSize = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    positions.forEach(pos => {
      maxX = Math.max(maxX, pos.x + CARD_WIDTH);
      maxY = Math.max(maxY, pos.y + CARD_HEIGHT);
    });
    return { width: maxX + 100, height: maxY + 100 };
  }, [positions]);

  // Filter people by search
  const filteredPeople = useMemo(() => {
    if (!searchQuery) return people;
    const query = searchQuery.toLowerCase();
    return people.filter(
      p =>
        p.firstName.toLowerCase().includes(query) ||
        p.lastName.toLowerCase().includes(query) ||
        p.nickname?.toLowerCase().includes(query)
    );
  }, [people, searchQuery]);

  // Get relationship counts for a person
  const getRelationshipCounts = useCallback(
    (personId: string) => {
      const parentCount = relationships.filter(
        r => r.toPersonId === personId
      ).length;
      const childCount = relationships.filter(
        r => r.fromPersonId === personId
      ).length;
      const spouseCount = marriages.filter(
        m => m.person1Id === personId || m.person2Id === personId
      ).length;
      return { parentCount, childCount, spouseCount };
    },
    [relationships, marriages]
  );

  // Handle person tap
  const handlePersonTap = useCallback(
    (person: MobilePersonData) => {
      setSelectedPerson(person);
      setShowPersonSheet(true);
      onPersonSelect?.(person);
    },
    [onPersonSelect]
  );

  // Handle search result tap
  const handleSearchResultTap = useCallback(
    (person: MobilePersonData) => {
      setShowSearch(false);
      setSearchQuery('');
      const pos = positions.get(person.id);
      if (pos) {
        centerOnPoint({ x: pos.x + CARD_WIDTH / 2, y: pos.y + CARD_HEIGHT / 2 });
      }
      handlePersonTap(person);
    },
    [positions, centerOnPoint, handlePersonTap]
  );

  // Close person sheet
  const closePersonSheet = useCallback(() => {
    setShowPersonSheet(false);
    setSelectedPerson(null);
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gray-100 ${className}`}>
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between safe-area-top">
        <button
          onClick={() => setShowMenu(true)}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>

        <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[50%]">
          {treeName}
        </h1>

        <button
          onClick={() => setShowSearch(true)}
          className="p-2 -mr-2 rounded-full hover:bg-gray-100"
        >
          <Search className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Tree Canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0 pt-16 pb-24"
        style={{ touchAction: 'none' }}
        {...handlers}
      >
        <div
          className="relative"
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Connection lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasSize.width}
            height={canvasSize.height}
          >
            {/* Parent-child relationships */}
            {relationships.map(rel => {
              const fromPos = positions.get(rel.fromPersonId);
              const toPos = positions.get(rel.toPersonId);
              if (!fromPos || !toPos) return null;

              const fromX = fromPos.x + CARD_WIDTH / 2;
              const fromY = fromPos.y + CARD_HEIGHT;
              const toX = toPos.x + CARD_WIDTH / 2;
              const toY = toPos.y;

              return (
                <path
                  key={rel.id}
                  d={`M ${fromX} ${fromY}
                      C ${fromX} ${fromY + VERTICAL_GAP / 2},
                        ${toX} ${toY - VERTICAL_GAP / 2},
                        ${toX} ${toY}`}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Marriage connections */}
            {marriages.map(marriage => {
              const pos1 = positions.get(marriage.person1Id);
              const pos2 = positions.get(marriage.person2Id);
              if (!pos1 || !pos2) return null;

              const y = pos1.y + CARD_HEIGHT / 2;

              return (
                <line
                  key={marriage.id}
                  x1={pos1.x + CARD_WIDTH}
                  y1={y}
                  x2={pos2.x}
                  y2={y}
                  stroke="#f472b6"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Person cards */}
          {people.map(person => {
            const pos = positions.get(person.id);
            if (!pos) return null;

            const counts = getRelationshipCounts(person.id);

            return (
              <div
                key={person.id}
                className="absolute"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: CARD_WIDTH,
                }}
              >
                <MobilePersonCard
                  person={person}
                  isSelected={selectedPerson?.id === person.id}
                  size="normal"
                  onClick={() => handlePersonTap(person)}
                  showRelationshipIndicators
                  {...counts}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-24 right-4 z-20 flex flex-col gap-2 safe-area-right">
        <button
          onClick={zoomIn}
          className="p-3 bg-white rounded-full shadow-lg border border-gray-200 active:bg-gray-100"
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={zoomOut}
          className="p-3 bg-white rounded-full shadow-lg border border-gray-200 active:bg-gray-100"
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={resetView}
          className="p-3 bg-white rounded-full shadow-lg border border-gray-200 active:bg-gray-100"
        >
          <Maximize2 className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Add Person FAB */}
      {onAddPerson && (
        <button
          onClick={onAddPerson}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg flex items-center gap-2 active:bg-blue-700 safe-area-bottom"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add Person</span>
        </button>
      )}

      {/* Search Overlay */}
      {showSearch && (
        <div className="absolute inset-0 z-40 bg-white safe-area-top">
          <div className="flex items-center gap-3 p-4 border-b border-gray-200">
            <button onClick={() => setShowSearch(false)} className="p-1">
              <X className="w-6 h-6 text-gray-500" />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="flex-1 text-lg outline-none"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
            {filteredPeople.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No people found</p>
              </div>
            ) : (
              filteredPeople.map(person => (
                <button
                  key={person.id}
                  onClick={() => handleSearchResultTap(person)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100"
                >
                  {person.profilePhoto ? (
                    <img
                      src={person.profilePhoto}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 font-medium">
                        {person.firstName.charAt(0)}
                        {person.lastName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">
                      {person.firstName} {person.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {person.birthDate
                        ? `Born ${new Date(person.birthDate).getFullYear()}`
                        : 'Birth date unknown'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Menu Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        title="Menu"
        initialHeight="half"
      >
        <div className="p-4 grid grid-cols-4 gap-3">
          <QuickAction
            icon={<Home className="w-6 h-6" />}
            label="Home"
            onClick={() => {
              resetView();
              setShowMenu(false);
            }}
          />
          <QuickAction
            icon={<BarChart3 className="w-6 h-6" />}
            label="Stats"
            onClick={() => {
              onViewStatistics?.();
              setShowMenu(false);
            }}
          />
          <QuickAction
            icon={<Upload className="w-6 h-6" />}
            label="Import"
            onClick={() => {
              onImportGedcom?.();
              setShowMenu(false);
            }}
          />
          <QuickAction
            icon={<History className="w-6 h-6" />}
            label="Activity"
            onClick={() => {
              onViewActivity?.();
              setShowMenu(false);
            }}
          />
        </div>
        <div className="border-t border-gray-100">
          <MenuItem
            icon={<Settings className="w-5 h-5" />}
            label="Tree Settings"
            description="Privacy, members, and more"
            onClick={() => {
              onSettings?.();
              setShowMenu(false);
            }}
            trailing={<ChevronRight className="w-5 h-5 text-gray-400" />}
          />
        </div>
      </MobileBottomSheet>

      {/* Person Detail Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showPersonSheet}
        onClose={closePersonSheet}
        initialHeight="half"
      >
        {selectedPerson && (
          <div>
            {/* Person Header */}
            <div className="flex items-center gap-4 p-4 border-b border-gray-100">
              {selectedPerson.profilePhoto ? (
                <img
                  src={selectedPerson.profilePhoto}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xl text-gray-500 font-medium">
                    {selectedPerson.firstName.charAt(0)}
                    {selectedPerson.lastName.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedPerson.firstName} {selectedPerson.lastName}
                </h3>
                <p className="text-gray-500">
                  {selectedPerson.birthDate
                    ? new Date(selectedPerson.birthDate).getFullYear()
                    : 'Unknown'}
                  {selectedPerson.deathDate
                    ? ` – ${new Date(selectedPerson.deathDate).getFullYear()}`
                    : selectedPerson.isLiving
                    ? ' – Present'
                    : ''}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 grid grid-cols-4 gap-3">
              <QuickAction
                icon={<Edit className="w-5 h-5" />}
                label="Edit"
                onClick={() => {
                  onEditPerson?.(selectedPerson);
                  closePersonSheet();
                }}
                variant="primary"
              />
              <QuickAction
                icon={<Link className="w-5 h-5" />}
                label="Relate"
                onClick={() => {
                  onAddRelationship?.(selectedPerson);
                  closePersonSheet();
                }}
              />
              <QuickAction
                icon={<Users className="w-5 h-5" />}
                label="Family"
                onClick={() => {
                  // Show family members
                }}
              />
              <QuickAction
                icon={<Trash2 className="w-5 h-5" />}
                label="Delete"
                onClick={() => {
                  onDeletePerson?.(selectedPerson);
                  closePersonSheet();
                }}
                variant="danger"
              />
            </div>

            {/* Person Details */}
            <div className="px-4 pb-4 space-y-3">
              {selectedPerson.birthPlace && (
                <div className="flex items-center gap-3 text-gray-600">
                  <span className="text-sm font-medium w-20">Birth Place</span>
                  <span className="text-sm">{selectedPerson.birthPlace}</span>
                </div>
              )}
              {selectedPerson.deathPlace && (
                <div className="flex items-center gap-3 text-gray-600">
                  <span className="text-sm font-medium w-20">Death Place</span>
                  <span className="text-sm">{selectedPerson.deathPlace}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </MobileBottomSheet>
    </div>
  );
}

export default MobileFamilyTree;
