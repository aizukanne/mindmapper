import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import {
  ArrowLeft,
  Share2,
  MoreHorizontal,
  Wifi,
  Cloud,
  CloudOff,
  MessageCircle,
  History,
  Download,
  PanelLeft,
  PanelRight,
  Loader2,
} from 'lucide-react';
import { Canvas, type CanvasExportFunctions } from '@/components/canvas/Canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMapStore } from '@/stores/mapStore';
import { usePresence } from '@/hooks/usePresence';
import { useMapData } from '@/hooks/useMapData';
import { PresenceList } from '@/components/collaboration/PresenceList';
import { ShareModal } from '@/components/sharing/ShareModal';
import { CommentPanel } from '@/components/comments/CommentPanel';
import { HistoryPanel } from '@/components/history/HistoryPanel';
import { ExportModal } from '@/components/export/ExportModal';
import { EditorSidebar } from '@/components/editor/EditorSidebar';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function MapEditor() {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { title, setTitle } = useMapStore();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  // Sidebar and properties panel state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPropertiesPanelCollapsed, setIsPropertiesPanelCollapsed] = useState(false);

  // Function to refresh comment counts on nodes (provided by Canvas)
  const [refreshCommentCounts, setRefreshCommentCounts] = useState<(() => Promise<void>) | null>(null);

  // SVG/PNG export functions (provided by Canvas)
  const [exportFunctions, setExportFunctions] = useState<CanvasExportFunctions | null>(null);

  // Load map data
  const { isLoading, error, refetch: refetchMapData } = useMapData({
    mapId,
    enabled: !!mapId,
  });

  const {
    awarenessStates,
    enhancedStates,
    currentUser,
    updateCursor,
    updateSelectedNode,
    setEditingNode,
    isConnected,
    isSynced,
    undo,
    redo,
    canUndo,
    canRedo,
  } = usePresence({ mapId: mapId || '', enabled: !!mapId });

  // Convert enhanced states to the format expected by Canvas
  // This includes isEditingNodeId for showing who is editing which node
  const awarenessStatesWithEditing = useMemo(() => {
    // If we have enhanced states, use them (they include isEditingNodeId)
    if (enhancedStates.length > 0) {
      return enhancedStates.map((state) => ({
        id: state.userId,
        name: state.userName,
        color: state.userColor,
        cursor: state.cursor ? { x: state.cursor.x, y: state.cursor.y } : null,
        selectedNodeId: state.selectedNodeIds[0] || null,
        isEditingNodeId: state.isEditingNodeId,
      }));
    }
    // Fall back to legacy awareness states
    return awarenessStates.map((state) => ({
      ...state,
      isEditingNodeId: null,
    }));
  }, [enhancedStates, awarenessStates]);

  // Callbacks for when user starts/stops editing a node
  const handleEditingStart = useCallback((nodeId: string) => {
    setEditingNode(nodeId);
  }, [setEditingNode]);

  const handleEditingStop = useCallback(() => {
    setEditingNode(null);
  }, [setEditingNode]);

  // Track mouse movement for cursor sharing
  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      updateCursor(event.clientX, event.clientY);
    },
    [updateCursor]
  );

  // Track selection changes
  const selectedNodeId = useMapStore((state) => state.selectedNodeId);
  useEffect(() => {
    updateSelectedNode(selectedNodeId);
  }, [selectedNodeId, updateSelectedNode]);

  // Close other panels when opening one
  const openCommentPanel = () => {
    setIsHistoryPanelOpen(false);
    setIsCommentPanelOpen(true);
  };

  const openHistoryPanel = () => {
    setIsCommentPanelOpen(false);
    setIsHistoryPanelOpen(true);
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  // Toggle properties panel visibility
  const togglePropertiesPanel = () => {
    setIsPropertiesPanelCollapsed((prev) => !prev);
  };

  // Connection status indicator
  const ConnectionStatus = () => {
    if (!mapId) return null;

    if (isConnected && isSynced) {
      return (
        <div
          className="flex items-center gap-1.5 text-green-600"
          title="Connected and synced"
        >
          <Cloud className="h-4 w-4" />
          <span className="text-xs">Synced</span>
        </div>
      );
    }

    if (isConnected) {
      return (
        <div
          className="flex items-center gap-1.5 text-yellow-600"
          title="Connected, syncing..."
        >
          <Wifi className="h-4 w-4" />
          <span className="text-xs">Syncing...</span>
        </div>
      );
    }

    return (
      <div
        className="flex items-center gap-1.5 text-red-600"
        title="Offline - changes saved locally"
      >
        <CloudOff className="h-4 w-4" />
        <span className="text-xs">Offline</span>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <CloudOff className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Failed to load map</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" onMouseMove={handleMouseMove}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background z-10">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            className="hidden md:flex"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-border hidden md:block" />

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-48 md:w-64 border-none bg-transparent font-medium focus-visible:ring-1"
            placeholder="Untitled Mind Map"
            data-testid="map-title-input"
          />
          <ConnectionStatus />
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Presence list */}
          <PresenceList
            awarenessStates={awarenessStates}
            currentUserId={currentUser?.id}
          />

          <div className="h-6 w-px bg-border hidden md:block" />

          <Button
            variant={isHistoryPanelOpen ? 'secondary' : 'outline'}
            size="sm"
            onClick={openHistoryPanel}
            className="hidden md:flex"
            data-testid="history-panel-button"
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
          <Button
            variant={isCommentPanelOpen ? 'secondary' : 'outline'}
            size="sm"
            onClick={openCommentPanel}
            className="hidden md:flex"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Comments
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsShareModalOpen(true)}
            data-testid="share-button"
          >
            <Share2 className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Share</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={togglePropertiesPanel}
            title={isPropertiesPanelCollapsed ? 'Show properties' : 'Hide properties'}
            className="hidden md:flex"
          >
            <PanelRight className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsExportModalOpen(true)} data-testid="export-menu-item">
                <Download className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={openHistoryPanel}
                className="md:hidden"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={openCommentPanel}
                className="md:hidden"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Comments
              </DropdownMenuItem>
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="hidden md:block" data-testid="editor-sidebar">
          <EditorSidebar
            mapId={mapId}
            isCollapsed={isSidebarCollapsed}
            onCollapsedChange={setIsSidebarCollapsed}
            awarenessStates={awarenessStates}
            currentUserId={currentUser?.id}
          />
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative">
          <Canvas
            awarenessStates={awarenessStatesWithEditing}
            currentUserId={currentUser?.id}
            mapId={mapId}
            onCommentClick={(nodeId) => {
              // Select the node and open comment panel
              useMapStore.getState().setSelectedNode(nodeId);
              openCommentPanel();
            }}
            onExport={() => setIsExportModalOpen(true)}
            undo={undo}
            redo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onCommentCountsRefresh={(refresh) => setRefreshCommentCounts(() => refresh)}
            onExportFunctionsReady={setExportFunctions}
            onEditingStart={handleEditingStart}
            onEditingStop={handleEditingStop}
          />

          {/* Keyboard shortcuts hint */}
          <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 backdrop-blur px-3 py-2 rounded-lg border border-border hidden md:block">
            <span className="font-medium">Shortcuts:</span>{' '}
            <kbd className="px-1 py-0.5 bg-muted rounded">Tab</kbd> Add child •{' '}
            <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> Add sibling •{' '}
            <kbd className="px-1 py-0.5 bg-muted rounded">Del</kbd> Delete •{' '}
            <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Z</kbd> Undo •{' '}
            <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Y</kbd> Redo
          </div>
        </div>

        {/* Right Properties Panel */}
        <div className="hidden md:block" data-testid="properties-panel">
          <PropertiesPanel
            isCollapsed={isPropertiesPanelCollapsed}
            onCollapsedChange={setIsPropertiesPanelCollapsed}
          />
        </div>
      </div>

      {/* Share Modal */}
      {mapId && (
        <ShareModal
          mapId={mapId}
          mapTitle={title || 'Untitled Mind Map'}
          isPublic={isPublic}
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
          onPublicChange={setIsPublic}
        />
      )}

      {/* Comment Panel */}
      {mapId && isCommentPanelOpen && (
        <CommentPanel
          mapId={mapId}
          currentUserId={user?.id}
          isMapOwner={true} // TODO: Check actual ownership
          selectedNodeId={selectedNodeId}
          onClose={() => setIsCommentPanelOpen(false)}
          onCommentChange={() => {
            // Refresh comment badges on nodes when comments change
            refreshCommentCounts?.();
          }}
        />
      )}

      {/* History Panel */}
      {mapId && isHistoryPanelOpen && (
        <HistoryPanel
          mapId={mapId}
          isMapOwner={true} // TODO: Check actual ownership
          onClose={() => setIsHistoryPanelOpen(false)}
          onRestore={() => {
            // Refetch map data after a successful restore to update the canvas
            refetchMapData();
          }}
        />
      )}

      {/* Export Modal */}
      {mapId && (
        <ExportModal
          mapId={mapId}
          mapTitle={title || 'Untitled Mind Map'}
          open={isExportModalOpen}
          onOpenChange={setIsExportModalOpen}
          onExportSvg={exportFunctions?.exportToSvg}
          onExportPng={exportFunctions?.exportToPng}
        />
      )}
    </div>
  );
}
