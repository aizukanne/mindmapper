import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Search, Loader2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonCard } from './PersonCard';
import { TreeControls } from './TreeControls';
import { useFamilyTreeLayout } from '@/hooks/useFamilyTreeLayout';
import { useLinkedPerson } from '@/hooks/useLinkedPerson';
import { useGenerations } from '@/hooks/useGenerations';
import { useBranchIsolation } from '@/hooks/useBranchIsolation';
import { usePersonCardDrag } from '@/hooks/usePersonCardDrag';
import { useFamilyTreeStore, type ConnectionLineStyle } from '@/stores/familyTreeStore';
import { generateConnectionPath, calculateEdgeEndpoints } from '@/lib/connection-paths';
import type { Person, Relationship } from '@mindmapper/types';
import type { LayoutEdge, LayoutNode } from '@/lib/family-tree-layout';

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
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [generationFilter, setGenerationFilter] = useState<[number, number] | null>(null);

  // Family tree store for drag-and-drop and connection line styles
  const {
    connectionLineStyle,
    setConnectionLineStyle,
    customPositions,
    isDragging: isCardDragging,
    dragState,
  } = useFamilyTreeStore();

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

  // Drag-and-drop hook for person cards
  const handlePositionChange = useCallback(async (personId: string, position: { x: number; y: number }) => {
    // Position is already saved in store by the hook
    // Optionally sync to API here
  }, []);

  const { onMouseDown: dragMouseDown, onTouchStart: dragTouchStart, shouldSuppressClick } = usePersonCardDrag({
    treeId,
    onPositionChange: handlePositionChange,
    viewState,
    // Allow cards to be dragged freely - no restrictive bounds
    bounds: undefined,
  });

  // Wrap click handlers to suppress clicks after dragging
  const handlePersonClick = useCallback((person: Person) => {
    if (shouldSuppressClick()) return;
    onPersonClick?.(person);
  }, [onPersonClick, shouldSuppressClick]);

  const handlePersonDoubleClick = useCallback((person: Person) => {
    if (shouldSuppressClick()) return;
    onPersonDoubleClick?.(person);
  }, [onPersonDoubleClick, shouldSuppressClick]);

  // Get custom positions for this tree
  const treeCustomPositions = customPositions[treeId] || {};

  // Compute effective node positions (custom positions override layout positions)
  const effectiveNodes = useMemo(() => {
    if (!layout) return new Map<string, LayoutNode>();

    const nodes = new Map<string, LayoutNode>();
    for (const [id, node] of layout.nodes) {
      const customPos = treeCustomPositions[id];

      // Check if this node is being dragged
      const isBeingDragged = isCardDragging && dragState?.personId === id;
      const dragPosition = isBeingDragged ? dragState.currentPosition : null;

      nodes.set(id, {
        ...node,
        x: dragPosition?.x ?? customPos?.x ?? node.x,
        y: dragPosition?.y ?? customPos?.y ?? node.y,
      });
    }
    return nodes;
  }, [layout, treeCustomPositions, isCardDragging, dragState]);

  // Get selected person object
  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return people.find(p => p.id === selectedPersonId) || null;
  }, [people, selectedPersonId]);

  // Handle Find Me button click
  const handleFindMe = useCallback(() => {
    if (linkedPerson && containerSize.width > 0 && containerSize.height > 0) {
      centerOnPerson(linkedPerson.id, containerSize.width, containerSize.height);
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
    if (isCardDragging) return; // Don't pan while dragging a card

    setIsPanning(true);
    setPanStart({ x: e.clientX - viewState.offsetX, y: e.clientY - viewState.offsetY });
  }, [viewState.offsetX, viewState.offsetY, isCardDragging]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || isCardDragging) return;

    const newOffsetX = e.clientX - panStart.x;
    const newOffsetY = e.clientY - panStart.y;
    setOffset(newOffsetX, newOffsetY);
  }, [isPanning, panStart, setOffset, isCardDragging]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
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
      childrenMap.set(rel.personFromId, true);
    }
  }

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
    <div className={`relative overflow-hidden bg-gray-100 ${className}`} ref={containerRef}>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          title="Settings"
        >
          <Settings2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 left-4 z-20 bg-white rounded-lg shadow-md p-3">
          <h3 className="text-sm font-medium mb-2 text-gray-700">Line Style</h3>
          <div className="flex gap-2">
            {/* Straight line icon */}
            <button
              onClick={() => setConnectionLineStyle('straight')}
              className={`p-2 rounded-lg border-2 transition-colors ${
                connectionLineStyle === 'straight'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              title="Straight"
            >
              <svg width="32" height="32" viewBox="0 0 32 32" className="text-gray-600">
                <circle cx="6" cy="8" r="3" fill="currentColor" opacity="0.3" />
                <circle cx="26" cy="24" r="3" fill="currentColor" opacity="0.3" />
                <line x1="6" y1="11" x2="26" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {/* Orthogonal line icon */}
            <button
              onClick={() => setConnectionLineStyle('orthogonal')}
              className={`p-2 rounded-lg border-2 transition-colors ${
                connectionLineStyle === 'orthogonal'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              title="Orthogonal"
            >
              <svg width="32" height="32" viewBox="0 0 32 32" className="text-gray-600">
                <circle cx="6" cy="8" r="3" fill="currentColor" opacity="0.3" />
                <circle cx="26" cy="24" r="3" fill="currentColor" opacity="0.3" />
                <path d="M 6 11 L 6 16 Q 6 18 8 18 L 24 18 Q 26 18 26 20 L 26 21"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {/* Curved line icon */}
            <button
              onClick={() => setConnectionLineStyle('curved')}
              className={`p-2 rounded-lg border-2 transition-colors ${
                connectionLineStyle === 'curved'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              title="Curved"
            >
              <svg width="32" height="32" viewBox="0 0 32 32" className="text-gray-600">
                <circle cx="6" cy="8" r="3" fill="currentColor" opacity="0.3" />
                <circle cx="26" cy="24" r="3" fill="currentColor" opacity="0.3" />
                <path d="M 6 11 C 6 18, 26 14, 26 21"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
              <EdgePath
                key={edge.id}
                edge={edge}
                boundsMinX={layout.bounds.minX}
                boundsMinY={layout.bounds.minY}
                lineStyle={connectionLineStyle}
                effectiveNodes={effectiveNodes}
                nodeWidth={NODE_WIDTH}
                nodeHeight={NODE_HEIGHT}
              />
            ))}
          </svg>

          {/* Person Cards */}
          {Array.from(effectiveNodes.values())
            .filter(node => Number.isFinite(node.x) && Number.isFinite(node.y))
            .map(node => {
              const isDraggedCard = isCardDragging && dragState?.personId === node.id;
              return (
                <div
                  key={node.id}
                  className={`person-card ${isDraggedCard ? 'z-50' : ''}`}
                  style={{
                    position: 'absolute',
                    left: node.x,
                    top: node.y,
                    cursor: isDraggedCard ? 'grabbing' : 'grab',
                    transition: isDraggedCard ? 'none' : 'box-shadow 0.2s ease',
                    boxShadow: isDraggedCard ? '0 8px 25px rgba(0,0,0,0.25)' : undefined,
                    transform: isDraggedCard ? 'scale(1.02)' : undefined,
                  }}
                  onMouseDown={(e) => dragMouseDown(e, node.id, { x: node.x, y: node.y })}
                  onTouchStart={(e) => dragTouchStart(e, node.id, { x: node.x, y: node.y })}
                >
                  <PersonCard
                    person={node.person}
                    width={node.width}
                    height={node.height}
                    isSelected={selectedPersonId === node.id}
                    isHighlighted={highlightedPersonIds.includes(node.id)}
                    hasSpouse={spouseMap.has(node.id)}
                    hasChildren={childrenMap.has(node.id)}
                    onClick={handlePersonClick}
                    onDoubleClick={handlePersonDoubleClick}
                  />
                </div>
              );
            })}
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
  lineStyle: ConnectionLineStyle;
  effectiveNodes: Map<string, LayoutNode>;
  nodeWidth: number;
  nodeHeight: number;
}

function EdgePath({ edge, boundsMinX, boundsMinY, lineStyle, effectiveNodes, nodeWidth, nodeHeight }: EdgePathProps) {
  const { fromId, toId, type } = edge;

  // Skip if bounds are invalid
  if (!Number.isFinite(boundsMinX) || !Number.isFinite(boundsMinY)) return null;

  // Get current node positions (may be custom/dragged positions)
  const fromNode = effectiveNodes.get(fromId);
  const toNode = effectiveNodes.get(toId);

  if (!fromNode || !toNode) return null;
  if (!Number.isFinite(fromNode.x) || !Number.isFinite(fromNode.y)) return null;
  if (!Number.isFinite(toNode.x) || !Number.isFinite(toNode.y)) return null;

  // Calculate edge endpoints based on relationship type and node positions
  const endpoints = calculateEdgeEndpoints(
    { x: fromNode.x, y: fromNode.y, width: nodeWidth, height: nodeHeight },
    { x: toNode.x, y: toNode.y, width: nodeWidth, height: nodeHeight },
    type
  );

  // Adjust points relative to SVG origin
  const from = {
    x: endpoints.from.x - boundsMinX + 50,
    y: endpoints.from.y - boundsMinY + 50,
  };
  const to = {
    x: endpoints.to.x - boundsMinX + 50,
    y: endpoints.to.y - boundsMinY + 50,
  };

  // Generate path based on line style
  const pathD = generateConnectionPath(from, to, {
    style: lineStyle,
    type,
    curveTension: 0.5,
    cornerRadius: 10,
  });

  const strokeColor = type === 'spouse' ? '#EC4899' : type === 'sibling' ? '#8B5CF6' : '#9CA3AF';
  const strokeWidth = type === 'spouse' ? 2 : 1.5;
  const strokeDasharray = type === 'sibling' ? '4,4' : 'none';

  return (
    <path
      data-testid={`relationship-line-${edge.type}`}
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
