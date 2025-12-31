import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ArrowLeft, Share2, MoreHorizontal, Wifi, Cloud, CloudOff, MessageCircle, History, Download } from 'lucide-react';
import { Canvas } from '@/components/canvas/Canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMapStore } from '@/stores/mapStore';
import { usePresence } from '@/hooks/usePresence';
import { PresenceList } from '@/components/collaboration/PresenceList';
import { ShareModal } from '@/components/sharing/ShareModal';
import { CommentPanel } from '@/components/comments/CommentPanel';
import { HistoryPanel } from '@/components/history/HistoryPanel';
import { ExportModal } from '@/components/export/ExportModal';
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

  const {
    awarenessStates,
    currentUser,
    updateCursor,
    updateSelectedNode,
    isConnected,
    isSynced,
    undo,
    redo,
    canUndo,
    canRedo,
  } = usePresence({ mapId: mapId || '', enabled: !!mapId });

  // Track mouse movement for cursor sharing
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    updateCursor(event.clientX, event.clientY);
  }, [updateCursor]);

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

  // Connection status indicator
  const ConnectionStatus = () => {
    if (!mapId) return null;

    if (isConnected && isSynced) {
      return (
        <div className="flex items-center gap-1.5 text-green-600" title="Connected and synced">
          <Cloud className="h-4 w-4" />
          <span className="text-xs">Synced</span>
        </div>
      );
    }

    if (isConnected) {
      return (
        <div className="flex items-center gap-1.5 text-yellow-600" title="Connected, syncing...">
          <Wifi className="h-4 w-4" />
          <span className="text-xs">Syncing...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-red-600" title="Offline - changes saved locally">
        <CloudOff className="h-4 w-4" />
        <span className="text-xs">Offline</span>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col" onMouseMove={handleMouseMove}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-64 border-none bg-transparent font-medium focus-visible:ring-1"
            placeholder="Untitled Mind Map"
          />
          <ConnectionStatus />
        </div>

        <div className="flex items-center gap-3">
          {/* Presence list */}
          <PresenceList
            awarenessStates={awarenessStates}
            currentUserId={currentUser?.id}
          />

          <div className="h-6 w-px bg-border" />

          <Button
            variant={isHistoryPanelOpen ? 'secondary' : 'outline'}
            size="sm"
            onClick={openHistoryPanel}
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
          <Button
            variant={isCommentPanelOpen ? 'secondary' : 'outline'}
            size="sm"
            onClick={openCommentPanel}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Comments
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsShareModalOpen(true)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsExportModalOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1 relative">
        <Canvas
          awarenessStates={awarenessStates}
          currentUserId={currentUser?.id}
          mapId={mapId}
          onCommentClick={(nodeId) => {
            // Select the node and open comment panel
            useMapStore.getState().setSelectedNode(nodeId);
            openCommentPanel();
          }}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 backdrop-blur px-3 py-2 rounded-lg border border-border">
        <span className="font-medium">Shortcuts:</span>{' '}
        <kbd className="px-1 py-0.5 bg-muted rounded">Tab</kbd> Add child •{' '}
        <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> Add sibling •{' '}
        <kbd className="px-1 py-0.5 bg-muted rounded">Del</kbd> Delete •{' '}
        <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Z</kbd> Undo •{' '}
        <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Y</kbd> Redo
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
        />
      )}

      {/* History Panel */}
      {mapId && isHistoryPanelOpen && (
        <HistoryPanel
          mapId={mapId}
          isMapOwner={true} // TODO: Check actual ownership
          onClose={() => setIsHistoryPanelOpen(false)}
        />
      )}

      {/* Export Modal */}
      {mapId && (
        <ExportModal
          mapId={mapId}
          mapTitle={title || 'Untitled Mind Map'}
          open={isExportModalOpen}
          onOpenChange={setIsExportModalOpen}
        />
      )}
    </div>
  );
}
