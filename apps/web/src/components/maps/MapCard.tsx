import * as React from 'react';
import { useState, DragEvent } from 'react';
import { FileText, Star, MoreHorizontal, Trash2, FolderOpen, Loader2, GripVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DragItem } from '@/hooks/useDragAndDrop';

/**
 * MindMap data structure for displaying in the card
 */
export interface MindMap {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  isFavorite: boolean;
  folderId: string | null;
  updatedAt: string;
  createdAt: string;
}

/**
 * Props for the MapCard component
 */
export interface MapCardProps {
  /** The mind map data to display */
  map: MindMap;
  /** View mode - grid shows larger card, list shows compact row */
  viewMode?: 'grid' | 'list';
  /** Handler called when the card is clicked */
  onClick?: () => void;
  /** Handler called when delete action is triggered */
  onDelete?: (e: React.MouseEvent) => void;
  /** Handler called when favorite toggle is triggered */
  onToggleFavorite?: (e: React.MouseEvent) => void;
  /** Handler called when move to folder action is triggered */
  onMoveToFolder?: (folderId: string | null) => void;
  /** Whether a delete operation is in progress */
  isDeleting?: boolean;
  /** Whether a move operation is in progress */
  isMoving?: boolean;
  /** Whether dragging is enabled */
  draggable?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * MapCard component displays an individual mind map in either grid or list view.
 *
 * Features:
 * - Thumbnail display (with placeholder if no thumbnail)
 * - Title and metadata (last updated time)
 * - Quick actions menu (favorite toggle, move, delete)
 * - Loading states for async operations
 * - Responsive grid and list view modes
 * - Drag and drop support for moving between folders
 *
 * @example
 * ```tsx
 * <MapCard
 *   map={mapData}
 *   viewMode="grid"
 *   onClick={() => navigate(`/map/${mapData.id}`)}
 *   onDelete={(e) => handleDelete(mapData.id, e)}
 *   onToggleFavorite={(e) => handleToggleFavorite(mapData.id, e)}
 *   draggable={true}
 * />
 * ```
 */
export function MapCard({
  map,
  viewMode = 'grid',
  onClick,
  onDelete,
  onToggleFavorite,
  onMoveToFolder,
  isDeleting = false,
  isMoving = false,
  draggable = true,
  className,
}: MapCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Format the updated time
  const formattedTime = formatDistanceToNow(new Date(map.updatedAt), { addSuffix: true });

  // Close menu when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
  };

  // Toggle menu visibility
  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  // Handle move to root folder
  const handleMoveToRoot = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onMoveToFolder?.(null);
  };

  // Handle delete action
  const handleDelete = (e: React.MouseEvent) => {
    setShowMenu(false);
    onDelete?.(e);
  };

  // Drag handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    const dragItem: DragItem = {
      type: 'map',
      id: map.id,
      sourceParentId: map.folderId,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragItem));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);

    // Add a small delay before setting opacity to make the drag image visible
    setTimeout(() => {
      e.currentTarget.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.style.opacity = '1';
  };

  // List view layout
  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        draggable={draggable && !isMoving}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          'group relative flex items-center gap-4 border border-border rounded-lg p-3',
          'hover:border-primary hover:shadow-md transition-all cursor-pointer',
          isDragging && 'opacity-50 ring-2 ring-primary',
          draggable && 'cursor-grab active:cursor-grabbing',
          className
        )}
        data-testid="map-card-list"
        data-map-id={map.id}
      >
        {/* Drag handle indicator */}
        {draggable && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Thumbnail */}
        <MapCardThumbnail
          thumbnail={map.thumbnail}
          title={map.title}
          variant="list"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate" data-testid="map-card-title">
            {map.title}
          </h3>
          <p className="text-xs text-muted-foreground" data-testid="map-card-metadata">
            Updated {formattedTime}
          </p>
        </div>

        {/* Loading overlay for moving */}
        {isMoving && <MapCardLoadingOverlay />}

        {/* Actions - always visible in list view */}
        <MapCardActions
          isFavorite={map.isFavorite}
          showMenu={showMenu}
          isDeleting={isDeleting}
          onToggleFavorite={onToggleFavorite}
          onMenuToggle={handleMenuToggle}
          onBackdropClick={handleBackdropClick}
          onMoveToRoot={handleMoveToRoot}
          onDelete={handleDelete}
          variant="list"
        />
      </div>
    );
  }

  // Grid view layout (default)
  return (
    <div
      onClick={onClick}
      draggable={draggable && !isMoving}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'group relative border border-border rounded-lg p-4',
        'hover:border-primary hover:shadow-md transition-all cursor-pointer',
        isDragging && 'opacity-50 ring-2 ring-primary',
        draggable && 'cursor-grab active:cursor-grabbing',
        className
      )}
      data-testid="map-card-grid"
      data-map-id={map.id}
    >
      {/* Drag handle indicator */}
      {draggable && (
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="p-1.5 rounded-md bg-background/80 hover:bg-background border border-border">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Thumbnail placeholder */}
      <MapCardThumbnail
        thumbnail={map.thumbnail}
        title={map.title}
        variant="grid"
      />

      {/* Title and meta */}
      <h3 className="font-medium truncate" data-testid="map-card-title">
        {map.title}
      </h3>
      <p className="text-xs text-muted-foreground mt-1" data-testid="map-card-metadata">
        Updated {formattedTime}
      </p>

      {/* Loading overlay for moving */}
      {isMoving && <MapCardLoadingOverlay />}

      {/* Actions - show on hover in grid view */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <MapCardActions
          isFavorite={map.isFavorite}
          showMenu={showMenu}
          isDeleting={isDeleting}
          onToggleFavorite={onToggleFavorite}
          onMenuToggle={handleMenuToggle}
          onBackdropClick={handleBackdropClick}
          onMoveToRoot={handleMoveToRoot}
          onDelete={handleDelete}
          variant="grid"
        />
      </div>
    </div>
  );
}

/**
 * Thumbnail sub-component for MapCard
 */
interface MapCardThumbnailProps {
  thumbnail: string | null;
  title: string;
  variant: 'grid' | 'list';
}

function MapCardThumbnail({ thumbnail, title, variant }: MapCardThumbnailProps) {
  const isGrid = variant === 'grid';

  return (
    <div
      className={cn(
        'rounded-md bg-muted flex items-center justify-center',
        isGrid ? 'h-32 mb-3' : 'h-12 w-16 shrink-0'
      )}
      data-testid="map-card-thumbnail"
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover rounded-md"
          draggable={false}
        />
      ) : (
        <FileText className={cn('text-muted-foreground', isGrid ? 'h-8 w-8' : 'h-5 w-5')} />
      )}
    </div>
  );
}

/**
 * Loading overlay sub-component for MapCard
 */
function MapCardLoadingOverlay() {
  return (
    <div
      className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg"
      data-testid="map-card-loading"
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

/**
 * Actions menu sub-component for MapCard
 */
interface MapCardActionsProps {
  isFavorite: boolean;
  showMenu: boolean;
  isDeleting: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  onMenuToggle: (e: React.MouseEvent) => void;
  onBackdropClick: (e: React.MouseEvent) => void;
  onMoveToRoot: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  variant: 'grid' | 'list';
}

function MapCardActions({
  isFavorite,
  showMenu,
  isDeleting,
  onToggleFavorite,
  onMenuToggle,
  onBackdropClick,
  onMoveToRoot,
  onDelete,
  variant,
}: MapCardActionsProps) {
  const isGrid = variant === 'grid';

  const buttonClass = isGrid
    ? 'p-1.5 rounded-md bg-background/80 hover:bg-background border border-border'
    : 'p-1.5 rounded-md hover:bg-muted border border-transparent hover:border-border';

  return (
    <div className="flex items-center gap-1" data-testid="map-card-actions">
      {/* Favorite button */}
      <button
        onClick={onToggleFavorite}
        className={buttonClass}
        data-testid="map-card-favorite-btn"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star
          className={cn(
            'h-4 w-4',
            isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
          )}
        />
      </button>

      {/* More actions dropdown */}
      <div className="relative">
        <button
          onClick={onMenuToggle}
          className={buttonClass}
          data-testid="map-card-menu-btn"
          aria-label="More actions"
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>

        {showMenu && (
          <>
            {/* Backdrop to close menu on outside click */}
            <div
              className="fixed inset-0 z-40"
              onClick={onBackdropClick}
            />

            {/* Dropdown menu */}
            <div
              className="absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 py-1 min-w-[140px]"
              data-testid="map-card-dropdown-menu"
            >
              <button
                onClick={onMoveToRoot}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                data-testid="map-card-move-btn"
              >
                <FolderOpen className="h-3 w-3" />
                Move to Root
              </button>
              <button
                onClick={onDelete}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2"
                data-testid="map-card-delete-btn"
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Export sub-components for composition pattern
MapCard.Thumbnail = MapCardThumbnail;
MapCard.LoadingOverlay = MapCardLoadingOverlay;
MapCard.Actions = MapCardActions;

export default MapCard;
