import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Star, Clock, Search, FileText, Loader2, FolderPlus, Upload, Menu, X, Users, SortAsc, SortDesc, Filter, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateGallery } from '@/components/templates/TemplateGallery';
import { CreateMapDialog } from '@/components/maps/CreateMapDialog';
import { MapCard, MindMap } from '@/components/maps/MapCard';
import { UserMenu } from '@/components/auth/UserMenu';
import { FolderTree } from '@/components/sidebar/FolderTree';
import { GlobalSearch, useGlobalSearchShortcut } from '@/components/search/GlobalSearch';
import { ImportModal } from '@/components/import/ImportModal';
import { MobileSidebarDrawer } from '@/components/mobile/MobileSidebarDrawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SortOption = 'updated' | 'created' | 'title';
type SortDirection = 'asc' | 'desc';
type FilterOption = 'all' | 'favorites' | 'recent';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Dashboard() {
  const navigate = useNavigate();
  const [maps, setMaps] = useState<MindMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);
  const [isCreateMapDialogOpen, setIsCreateMapDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [movingMapId, setMovingMapId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Filter and sort state
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Global search keyboard shortcut (Ctrl/Cmd + K)
  useGlobalSearchShortcut(() => setIsSearchOpen(true));

  // Fetch maps
  const fetchMaps = useCallback(async () => {
    try {
      const url = selectedFolderId
        ? `${API_URL}/api/maps?folderId=${selectedFolderId}`
        : `${API_URL}/api/maps`;
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMaps(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch maps:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId]);

  useEffect(() => {
    setLoading(true);
    fetchMaps();
  }, [fetchMaps]);


  // Delete a map
  const handleDelete = async (mapId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this mind map?')) return;

    setDeletingId(mapId);
    try {
      const response = await fetch(`${API_URL}/api/maps/${mapId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setMaps((prev) => prev.filter((m) => m.id !== mapId));
      }
    } catch (error) {
      console.error('Failed to delete map:', error);
    } finally {
      setDeletingId(null);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (mapId: string, _currentFavorite: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`${API_URL}/api/maps/${mapId}/favorite`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMaps((prev) =>
          prev.map((m) => (m.id === mapId ? { ...m, isFavorite: data.data.isFavorite } : m))
        );
      }
    } catch (error) {
      console.error('Failed to update favorite:', error);
    }
  };

  // Move map to folder (used by both menu action and drag-drop)
  const handleMoveToFolder = useCallback(async (mapId: string, folderId: string | null) => {
    setMovingMapId(mapId);
    try {
      const targetFolder = folderId || 'root';
      const response = await fetch(`${API_URL}/api/folders/${targetFolder}/maps/${mapId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        // Refresh maps to reflect new folder assignment
        await fetchMaps();
      }
    } catch (error) {
      console.error('Failed to move map:', error);
    } finally {
      setMovingMapId(null);
    }
  }, [fetchMaps]);

  // Handle map dropped onto folder (from FolderTree component)
  const handleMapDroppedOnFolder = useCallback((mapId: string, targetFolderId: string | null) => {
    handleMoveToFolder(mapId, targetFolderId);
  }, [handleMoveToFolder]);

  // Filtered and sorted maps
  const filteredAndSortedMaps = useMemo(() => {
    let result = [...maps];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (map) =>
          map.title.toLowerCase().includes(query) ||
          (map.description && map.description.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    switch (filterBy) {
      case 'favorites':
        result = result.filter((m) => m.isFavorite);
        break;
      case 'recent':
        // Show maps updated within the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        result = result.filter((m) => new Date(m.updatedAt) >= sevenDaysAgo);
        break;
      case 'all':
      default:
        break;
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updated':
        default:
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [maps, searchQuery, filterBy, sortBy, sortDirection]);

  const favoriteMaps = filteredAndSortedMaps.filter((m) => m.isFavorite);
  const recentMaps = filteredAndSortedMaps.filter((m) => !m.isFavorite);

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterBy('all');
    setSortBy('updated');
    setSortDirection('desc');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || filterBy !== 'all';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border shrink-0">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-primary">MindMapper</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {/* Search - icon only on mobile, full on desktop */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex relative items-center gap-2 px-3 py-2 border border-border rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm text-muted-foreground w-64 text-left"
            >
              <Search className="h-4 w-4" />
              <span>Search maps & nodes...</span>
              <kbd className="ml-auto px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">
                ⌘K
              </kbd>
            </button>
            <Button onClick={() => setIsCreateMapDialogOpen(true)} className="hidden md:flex" data-testid="new-map-button">
              <Plus className="h-4 w-4 mr-2" />
              New Mind Map
            </Button>
            <Button onClick={() => setIsCreateMapDialogOpen(true)} size="icon" className="md:hidden" data-testid="new-map-button-mobile">
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => navigate('/family-trees')}
              variant="outline"
              className="hidden md:flex"
            >
              <Users className="h-4 w-4 mr-2" />
              Family Trees
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main layout with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Drawer - Only visible on mobile */}
        <MobileSidebarDrawer
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpen={() => setIsSidebarOpen(true)}
          title="Folders"
          enableEdgeSwipe={true}
          enableSwipeToClose={true}
        >
          <FolderTree
            selectedFolderId={selectedFolderId}
            onSelectFolder={(id) => {
              setSelectedFolderId(id);
              setIsSidebarOpen(false); // Close on mobile after selection
            }}
            onFolderChange={fetchMaps}
            onMapDropped={handleMapDroppedOnFolder}
          />
        </MobileSidebarDrawer>

        {/* Desktop Sidebar - Hidden on mobile */}
        <aside
          className="hidden md:block w-64 border-r border-border bg-muted/30 p-4 overflow-y-auto shrink-0"
          data-testid="desktop-sidebar"
        >
          <FolderTree
            selectedFolderId={selectedFolderId}
            onSelectFolder={(id) => {
              setSelectedFolderId(id);
            }}
            onFolderChange={fetchMaps}
            onMapDropped={handleMapDroppedOnFolder}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* Quick actions - only show when viewing all maps */}
          {selectedFolderId === null && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => setIsCreateMapDialogOpen(true)}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left"
                data-testid="quick-create-button"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Create New</h3>
                  <p className="text-sm text-muted-foreground">
                    Start with a blank canvas
                  </p>
                </div>
              </button>

              <button
                onClick={() => setIsTemplateGalleryOpen(true)}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left"
                data-testid="template-gallery-button"
              >
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <FolderOpen className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-medium">From Template</h3>
                  <p className="text-sm text-muted-foreground">
                    Use a pre-built template
                  </p>
                </div>
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left"
              >
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-medium">Import</h3>
                  <p className="text-sm text-muted-foreground">
                    Import from JSON or FreeMind
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Folder header when viewing a specific folder */}
          {selectedFolderId !== null && (
            <div className="flex items-center gap-2 mb-6">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Folder Contents</h2>
            </div>
          )}

          {/* Filter and Sort Toolbar */}
          <div className="mb-6 space-y-4" data-testid="filter-sort-toolbar">
            {/* Search and main controls row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Inline search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search mind maps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  data-testid="search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter and Sort controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter dropdown */}
                <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
                  <SelectTrigger className="w-[140px]" data-testid="filter-select">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Maps</SelectItem>
                    <SelectItem value="favorites">Favorites</SelectItem>
                    <SelectItem value="recent">Recent (7 days)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort dropdown */}
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="w-[150px]" data-testid="sort-select">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">Last Updated</SelectItem>
                    <SelectItem value="created">Date Created</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort direction toggle */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSortDirection}
                  title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                  data-testid="sort-direction-toggle"
                >
                  {sortDirection === 'asc' ? (
                    <SortAsc className="h-4 w-4" />
                  ) : (
                    <SortDesc className="h-4 w-4" />
                  )}
                </Button>

                {/* View mode toggle */}
                <div className="flex border border-border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="icon"
                    className="rounded-none"
                    onClick={() => setViewMode('grid')}
                    title="Grid view"
                    data-testid="view-grid"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="icon"
                    className="rounded-none"
                    onClick={() => setViewMode('list')}
                    title="List view"
                    data-testid="view-list"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* Clear filters button */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="clear-filters"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Results count */}
            {!loading && (
              <div className="text-sm text-muted-foreground">
                {filteredAndSortedMaps.length === 0 ? (
                  hasActiveFilters ? (
                    <span>No maps match your filters</span>
                  ) : (
                    <span>No mind maps yet</span>
                  )
                ) : (
                  <span>
                    Showing {filteredAndSortedMaps.length} {filteredAndSortedMaps.length === 1 ? 'map' : 'maps'}
                    {hasActiveFilters && ' (filtered)'}
                  </span>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : maps.length === 0 ? (
            <section>
              <div className="border border-dashed border-border rounded-lg p-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  {selectedFolderId ? (
                    <FolderPlus className="h-6 w-6 text-muted-foreground" />
                  ) : (
                    <FolderOpen className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-medium mb-2">
                  {selectedFolderId ? 'This folder is empty' : 'No mind maps yet'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedFolderId
                    ? 'Move maps here or create a new one'
                    : 'Create your first mind map to get started'}
                </p>
                <Button onClick={() => setIsCreateMapDialogOpen(true)} data-testid="empty-state-create-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Mind Map
                </Button>
              </div>
            </section>
          ) : (
            <>
              {/* Favorites - only show when viewing all maps and filter is "all" */}
              {selectedFolderId === null && filterBy === 'all' && favoriteMaps.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <h2 className="text-lg font-semibold">Favorites</h2>
                  </div>
                  <div
                    className={viewMode === 'grid'
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                      : "flex flex-col gap-2"
                    }
                    data-testid="favorites-grid"
                  >
                    {favoriteMaps.map((map) => (
                      <MapCard
                        key={map.id}
                        map={map}
                        viewMode={viewMode}
                        onClick={() => navigate(`/map/${map.id}`)}
                        onDelete={(e) => handleDelete(map.id, e)}
                        onToggleFavorite={(e) => handleToggleFavorite(map.id, map.isFavorite, e)}
                        onMoveToFolder={(folderId) => handleMoveToFolder(map.id, folderId)}
                        isDeleting={deletingId === map.id}
                        isMoving={movingMapId === map.id}
                        draggable={true}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Maps list */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  {selectedFolderId === null ? (
                    <>
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-lg font-semibold">
                        {filterBy === 'favorites' ? 'Favorite Mind Maps' :
                         filterBy === 'recent' ? 'Recently Updated' :
                         'Recent Mind Maps'}
                      </h2>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-lg font-semibold">Mind Maps</h2>
                    </>
                  )}
                </div>
                {(selectedFolderId === null ? (filterBy === 'all' ? recentMaps : filteredAndSortedMaps) : filteredAndSortedMaps).length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {hasActiveFilters ? 'No maps match your filters' : 'No maps in this location'}
                  </p>
                ) : (
                  <div
                    className={viewMode === 'grid'
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                      : "flex flex-col gap-2"
                    }
                    data-testid="maps-grid"
                  >
                    {(selectedFolderId === null ? (filterBy === 'all' ? recentMaps : filteredAndSortedMaps) : filteredAndSortedMaps).map((map) => (
                      <MapCard
                        key={map.id}
                        map={map}
                        viewMode={viewMode}
                        onClick={() => navigate(`/map/${map.id}`)}
                        onDelete={(e) => handleDelete(map.id, e)}
                        onToggleFavorite={(e) => handleToggleFavorite(map.id, map.isFavorite, e)}
                        onMoveToFolder={(folderId) => handleMoveToFolder(map.id, folderId)}
                        isDeleting={deletingId === map.id}
                        isMoving={movingMapId === map.id}
                        draggable={true}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {/* Create Map Dialog */}
      <CreateMapDialog
        open={isCreateMapDialogOpen}
        onOpenChange={setIsCreateMapDialogOpen}
        folderId={selectedFolderId}
      />

      {/* Template Gallery */}
      <TemplateGallery
        open={isTemplateGalleryOpen}
        onOpenChange={setIsTemplateGalleryOpen}
      />

      {/* Global Search Modal */}
      <GlobalSearch
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />

      {/* Import Modal */}
      <ImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        folderId={selectedFolderId}
        onImportSuccess={(mapId) => {
          fetchMaps();
          navigate(`/map/${mapId}`);
        }}
      />
    </div>
  );
}
