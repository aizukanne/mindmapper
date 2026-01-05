import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonCard } from './PersonCard';
import { TreeControls } from './TreeControls';
import { useFamilyTreeLayout } from '@/hooks/useFamilyTreeLayout';
import { useLinkedPerson } from '@/hooks/useLinkedPerson';
import { useGenerations } from '@/hooks/useGenerations';
import { useBranchIsolation } from '@/hooks/useBranchIsolation';
import type { Person, Relationship } from '@mindmapper/types';
import type { LayoutEdge } from '@/lib/family-tree-layout';

export interface FamilyTreeCanvasProps {
  treeId: string;
  people: Person[];
  relationships: Relationship[];
  selectedPersonId?: string | null;
  highlightedPersonIds?: string[];
  onPersonClick?: (person: Person) => void;
  onPersonDoubleClick?: (person: Person) => void;
  onBackgroundClick?: () => void;
  compact?: boolean;
  className?: string;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 100;

export function FamilyTreeCanvas({
  treeId,
  people,
  relationships,
  selectedPersonId,
  highlightedPersonIds = [],
  onPersonClick,
  onPersonDoubleClick,
  onBackgroundClick,
  compact = false,
  className = '',
}: FamilyTreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [generationFilter, setGenerationFilter] = useState<[number, number] | null>(null);

  // Hooks for new features
  const {
    linkedPerson,
    loading: linkedPersonLoading,
    linkToPerson,
    unlinkFromPerson,
  } = useLinkedPerson(treeId);

  const {
    generations,
    minGeneration,
    maxGeneration,
    loading: generationsLoading,
  } = useGenerations(treeId);

  const {
    branchData,
    isIsolated,
    loading: branchLoading,
    isolateBranch,
    clearIsolation,
  } = useBranchIsolation(treeId);

  // Apply filters to people and relationships
  const { filteredPeople, filteredRelationships } = useMemo(() => {
    let filtered = people;
    let filteredRels = relationships;

    // Apply branch isolation first (most restrictive)
    if (isIsolated && branchData) {
      const branchPersonIds = new Set(branchData.people.map(p => p.id));
      filtered = people.filter(p => branchPersonIds.has(p.id));
      filteredRels = relationships.filter(
        r => branchPersonIds.has(r.personFromId) && branchPersonIds.has(r.personToId)
      );
    }

    // Apply generation filter
    if (generationFilter) {
      const [minGen, maxGen] = generationFilter;
      const filteredPersonIds = new Set(
        filtered.filter(p => p.generation >= minGen && p.generation <= maxGen).map(p => p.id)
      );
      filtered = filtered.filter(p => filteredPersonIds.has(p.id));
      filteredRels = filteredRels.filter(
        r => filteredPersonIds.has(r.personFromId) && filteredPersonIds.has(r.personToId)
      );
    }

    return { filteredPeople: filtered, filteredRelationships: filteredRels };
  }, [people, relationships, isIsolated, branchData, generationFilter]);

  const {
    layout,
    viewState,
    setOffset,
    zoomIn,
    zoomOut,
    resetView,
    fitToView,
    centerOnPerson,
  } = useFamilyTreeLayout(filteredPeople, filteredRelationships, {
    nodeWidth: NODE_WIDTH,
    nodeHeight: NODE_HEIGHT,
    compact,
  });

  // Debug logging
  console.log('[FamilyTreeCanvas] Debug:', {
    peopleCount: people.length,
    filteredPeopleCount: filteredPeople.length,
    relationshipsCount: relationships.length,
    filteredRelationshipsCount: filteredRelationships.length,
    hasLayout: !!layout,
    nodesCount: layout?.nodes.size ?? 0,
    bounds: layout?.bounds,
    generationFilter,
    isIsolated,
  });

  // Get selected person object
  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return people.find(p => p.id === selectedPersonId) || null;
  }, [people, selectedPersonId]);

  // Handle Find Me button click
  const handleFindMe = useCallback(() => {
    if (linkedPerson && containerSize.width > 0 && containerSize.height > 0) {
      centerOnPerson(linkedPerson.id, containerSize.width, containerSize.height);
      // Also trigger person selection
      const person = people.find(p => p.id === linkedPerson.id);
      if (person) {
        onPersonClick?.(person);
      }
    }
  }, [linkedPerson, containerSize, centerOnPerson, people, onPersonClick]);

  // Handle link to person
  const handleLinkToPerson = useCallback(async (personId: string) => {
    await linkToPerson(personId);
  }, [linkToPerson]);

  // Handle unlink from person
  const handleUnlinkPerson = useCallback(async () => {
    await unlinkFromPerson();
  }, [unlinkFromPerson]);

  // Handle branch isolation
  const handleIsolateBranch = useCallback(async (
    personId: string,
    direction: 'ancestors' | 'descendants' | 'both'
  ) => {
    await isolateBranch(personId, direction);
  }, [isolateBranch]);

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Fit to view when layout changes or container resizes
  useEffect(() => {
    if (layout && containerSize.width > 0 && containerSize.height > 0) {
      fitToView(containerSize.width, containerSize.height);
    }
  }, [layout, containerSize.width, containerSize.height, fitToView]);

  // Center on selected person
  useEffect(() => {
    if (selectedPersonId && containerSize.width > 0 && containerSize.height > 0) {
      centerOnPerson(selectedPersonId, containerSize.width, containerSize.height);
    }
  }, [selectedPersonId, centerOnPerson, containerSize]);

  // Mouse event handlers for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if ((e.target as HTMLElement).closest('.person-card')) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX - viewState.offsetX, y: e.clientY - viewState.offsetY });
  }, [viewState.offsetX, viewState.offsetY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const newOffsetX = e.clientX - dragStart.x;
    const newOffsetY = e.clientY - dragStart.y;
    setOffset(newOffsetX, newOffsetY);
  }, [isDragging, dragStart, setOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Wheel event for zooming
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }, [zoomIn, zoomOut]);

  // Background click
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.person-card')) return;
    onBackgroundClick?.();
  }, [onBackgroundClick]);

  // Search functionality
  const searchResults = searchQuery.trim()
    ? people.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSearchSelect = (person: Person) => {
    setSearchQuery('');
    setShowSearch(false);
    onPersonClick?.(person);
    if (containerSize.width > 0 && containerSize.height > 0) {
      centerOnPerson(person.id, containerSize.width, containerSize.height);
    }
  };

  // Build spouse and children maps for card indicators
  const spouseMap = new Map<string, boolean>();
  const childrenMap = new Map<string, boolean>();

  for (const rel of relationships) {
    if (rel.relationshipType === 'SPOUSE') {
      spouseMap.set(rel.personFromId, true);
      spouseMap.set(rel.personToId, true);
    }
    if (rel.relationshipType === 'CHILD' || rel.relationshipType === 'PARENT') {
      // personFromId is the parent
      childrenMap.set(rel.personFromId, true);
    }
  }

  // Check if layout is valid and has nodes
  const hasValidNodes = layout && layout.nodes.size > 0 &&
    Array.from(layout.nodes.values()).some(n => Number.isFinite(n.x) && Number.isFinite(n.y));

  if (!layout || people.length === 0 || !hasValidNodes) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        {people.length === 0 ? (
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">No family members yet</p>
            <p className="text-sm">Add people to start building your family tree</p>
          </div>
        ) : layout && layout.nodes.size === 0 ? (
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">Unable to layout tree</p>
            <p className="text-sm">Try switching to Grid view</p>
          </div>
        ) : (
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-gray-50 ${className}`} ref={containerRef}>
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white rounded-lg shadow-md p-1">
        <Button variant="ghost" size="sm" onClick={zoomIn} title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={zoomOut} title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-gray-200" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fitToView(containerSize.width, containerSize.height)}
          title="Fit to View"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={resetView} title="Reset View">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-gray-200" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSearch(!showSearch)}
          title="Search"
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Tree Controls (Find Me, Generation Filter, Branch Isolation) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white rounded-lg shadow-md p-1">
        <TreeControls
          linkedPerson={linkedPerson}
          linkedPersonLoading={linkedPersonLoading}
          onFindMe={handleFindMe}
          onLinkToPerson={handleLinkToPerson}
          onUnlinkPerson={handleUnlinkPerson}
          selectedPerson={selectedPerson}
          generations={generations}
          minGeneration={minGeneration}
          maxGeneration={maxGeneration}
          generationFilter={generationFilter}
          onGenerationFilterChange={setGenerationFilter}
          generationsLoading={generationsLoading}
          isolatedBranchRoot={branchData?.rootPerson || null}
          branchDirection={branchData?.direction || 'both'}
          onIsolateBranch={handleIsolateBranch}
          onClearIsolation={clearIsolation}
          branchLoading={branchLoading}
        />
      </div>

      {/* Search Panel */}
      {showSearch && (
        <div className="absolute top-4 right-4 z-20 bg-white rounded-lg shadow-md p-3 w-64">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {searchResults.length > 0 && (
            <ul className="mt-2 max-h-48 overflow-y-auto">
              {searchResults.map(person => (
                <li
                  key={person.id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                  onClick={() => handleSearchSelect(person)}
                >
                  {person.firstName} {person.lastName}
                </li>
              ))}
            </ul>
          )}
          {searchQuery && searchResults.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">No results found</p>
          )}
        </div>
      )}

      {/* Status Bar */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
        <div className="bg-white/80 rounded px-2 py-1 text-xs text-gray-600">
          {Math.round(viewState.scale * 100)}%
        </div>
        {(isIsolated || generationFilter) && (
          <div className="bg-amber-100/90 rounded px-2 py-1 text-xs text-amber-800 flex items-center gap-2">
            <span>
              Showing {filteredPeople.length} of {people.length} people
            </span>
            {isIsolated && (
              <span className="bg-purple-200 px-1.5 py-0.5 rounded text-purple-800">
                {branchData?.rootPerson.firstName}'s {branchData?.direction === 'both' ? 'branch' : branchData?.direction}
              </span>
            )}
            {generationFilter && (
              <span className="bg-blue-200 px-1.5 py-0.5 rounded text-blue-800">
                Gen {generationFilter[0]} - {generationFilter[1]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onClick={handleBackgroundClick}
      >
        <div
          className="relative"
          style={{
            transform: `translate(${viewState.offsetX}px, ${viewState.offsetY}px) scale(${viewState.scale})`,
            transformOrigin: '0 0',
            width: layout.bounds.width + 200,
            height: layout.bounds.height + 200,
            minWidth: '100%',
            minHeight: '100%',
          }}
        >
          {/* Edges (SVG) */}
          <svg
            className="absolute pointer-events-none"
            style={{
              left: layout.bounds.minX - 50,
              top: layout.bounds.minY - 50,
              width: layout.bounds.width + 100,
              height: layout.bounds.height + 100,
              overflow: 'visible',
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
              </marker>
            </defs>
            {layout.edges.map(edge => (
              <EdgePath key={edge.id} edge={edge} boundsMinX={layout.bounds.minX} boundsMinY={layout.bounds.minY} />
            ))}
          </svg>

          {/* Person Cards */}
          {Array.from(layout.nodes.values())
            .filter(node => Number.isFinite(node.x) && Number.isFinite(node.y))
            .map(node => (
            <div
              key={node.id}
              className="person-card"
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
              }}
            >
              <PersonCard
                person={node.person}
                width={node.width}
                height={node.height}
                isSelected={selectedPersonId === node.id}
                isHighlighted={highlightedPersonIds.includes(node.id)}
                hasSpouse={spouseMap.has(node.id)}
                hasChildren={childrenMap.has(node.id)}
                onClick={onPersonClick}
                onDoubleClick={onPersonDoubleClick}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Edge path component
interface EdgePathProps {
  edge: LayoutEdge;
  boundsMinX: number;
  boundsMinY: number;
}

function EdgePath({ edge, boundsMinX, boundsMinY }: EdgePathProps) {
  const { points, type } = edge;
  if (points.length < 2) return null;

  // Skip if bounds are invalid
  if (!Number.isFinite(boundsMinX) || !Number.isFinite(boundsMinY)) return null;

  // Adjust points relative to SVG origin
  const adjustedPoints = points.map(p => ({
    x: p.x - boundsMinX + 50,
    y: p.y - boundsMinY + 50,
  }));

  // Skip if any point has invalid coordinates
  if (adjustedPoints.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    return null;
  }

  // Build path
  let pathD = `M ${adjustedPoints[0].x} ${adjustedPoints[0].y}`;
  for (let i = 1; i < adjustedPoints.length; i++) {
    pathD += ` L ${adjustedPoints[i].x} ${adjustedPoints[i].y}`;
  }

  const strokeColor = type === 'spouse' ? '#EC4899' : type === 'sibling' ? '#8B5CF6' : '#9CA3AF';
  const strokeWidth = type === 'spouse' ? 2 : 1.5;
  const strokeDasharray = type === 'sibling' ? '4,4' : 'none';

  return (
    <path
      d={pathD}
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
