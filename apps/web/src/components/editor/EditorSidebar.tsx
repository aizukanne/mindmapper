import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderTree,
  Layers,
  Search,
  Plus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/stores/mapStore';
import { PresencePanel } from '@/components/collaboration/PresenceList';
import type { PresenceUser } from '@/hooks/usePresence';

interface EditorSidebarProps {
  mapId?: string;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  awarenessStates?: PresenceUser[];
  currentUserId?: string;
}

export function EditorSidebar({
  isCollapsed,
  onCollapsedChange,
  awarenessStates = [],
  currentUserId,
}: EditorSidebarProps) {
  const navigate = useNavigate();
  const { nodes, selectedNodeId, setSelectedNode } = useMapStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'outline' | 'structure' | 'collaborators'>('outline');

  // Count other collaborators for badge
  const collaboratorCount = awarenessStates.filter(
    (state) => state.id !== currentUserId
  ).length;

  // Filter nodes based on search query
  const filteredNodes = nodes.filter((node) =>
    node.data.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Build tree structure from flat nodes
  const buildTree = () => {
    const rootNodes = filteredNodes.filter((n) => n.data.type === 'ROOT');
    const childMap = new Map<string, typeof nodes>();

    filteredNodes.forEach((node) => {
      if (node.data.parentId) {
        const siblings = childMap.get(node.data.parentId) || [];
        siblings.push(node);
        childMap.set(node.data.parentId, siblings);
      }
    });

    return { rootNodes, childMap };
  };

  const { rootNodes, childMap } = buildTree();

  // Render node in outline view
  const renderOutlineNode = (node: typeof nodes[0], depth = 0) => {
    const children = childMap.get(node.id) || [];
    const isSelected = selectedNodeId === node.id;
    const isRoot = node.data.type === 'ROOT';

    return (
      <div key={node.id}>
        <button
          onClick={() => setSelectedNode(node.id)}
          className={cn(
            'w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2',
            isSelected
              ? 'bg-primary/10 text-primary font-medium'
              : 'hover:bg-muted text-foreground',
            isRoot && 'font-semibold'
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <span
            className={cn(
              'w-2 h-2 rounded-full shrink-0',
              isRoot ? 'bg-primary' : 'bg-muted-foreground/50'
            )}
          />
          <span className="truncate">{node.data.text || 'Untitled'}</span>
        </button>
        {children.length > 0 && (
          <div>
            {children.map((child) => renderOutlineNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className="w-12 h-full border-r border-border bg-background flex flex-col items-center py-2 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange(false)}
          className="h-8 w-8"
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="w-8 h-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Outline"
          onClick={() => {
            onCollapsedChange(false);
            setActiveTab('outline');
          }}
        >
          <FileText className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Structure"
          onClick={() => {
            onCollapsedChange(false);
            setActiveTab('structure');
          }}
        >
          <Layers className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
          title="Collaborators"
          onClick={() => {
            onCollapsedChange(false);
            setActiveTab('collaborators');
          }}
          data-testid="collaborators-tab-collapsed"
        >
          <Users className="h-4 w-4" />
          {collaboratorCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-medium rounded-full flex items-center justify-center">
              {collaboratorCount > 9 ? '9+' : collaboratorCount}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 h-full border-r border-border bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">Navigator</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange(true)}
          className="h-7 w-7"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('outline')}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'outline'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FileText className="h-4 w-4 inline-block mr-1.5" />
          Outline
        </button>
        <button
          onClick={() => setActiveTab('structure')}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'structure'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Layers className="h-4 w-4 inline-block mr-1.5" />
          Structure
        </button>
        <button
          onClick={() => setActiveTab('collaborators')}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium transition-colors relative',
            activeTab === 'collaborators'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
          data-testid="collaborators-tab"
        >
          <Users className="h-4 w-4 inline-block mr-1.5" />
          Users
          {collaboratorCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-medium rounded-full">
              {collaboratorCount}
            </span>
          )}
        </button>
      </div>

      {/* Search - only for outline/structure tabs */}
      {activeTab !== 'collaborators' && (
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {activeTab === 'outline' && (
          <div className="space-y-0.5">
            {rootNodes.map((node) => renderOutlineNode(node))}
            {filteredNodes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No nodes found
              </p>
            )}
          </div>
        )}
        {activeTab === 'structure' && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1">
              Map Structure
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/50">
                <span className="text-sm">Total Nodes</span>
                <span className="text-sm font-medium">{nodes.length}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/50">
                <span className="text-sm">Root Nodes</span>
                <span className="text-sm font-medium">
                  {nodes.filter((n) => n.data.type === 'ROOT').length}
                </span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/50">
                <span className="text-sm">Child Nodes</span>
                <span className="text-sm font-medium">
                  {nodes.filter((n) => n.data.type === 'CHILD').length}
                </span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/50">
                <span className="text-sm">Max Depth</span>
                <span className="text-sm font-medium">
                  {calculateMaxDepth(nodes)}
                </span>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'collaborators' && (
          <div className="space-y-2" data-testid="collaborators-content">
            <div className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1">
              Active Collaborators
            </div>
            <PresencePanel
              awarenessStates={awarenessStates}
              currentUserId={currentUserId}
            />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="border-t border-border px-3 py-2">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
          Quick Actions
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => navigate('/')}
          >
            <FolderTree className="h-4 w-4 mr-1.5" />
            Maps
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              const rootNode = nodes.find((n) => n.data.type === 'ROOT');
              if (rootNode) {
                useMapStore.getState().addNode(rootNode.id);
              }
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate max depth
function calculateMaxDepth(nodes: ReturnType<typeof useMapStore.getState>['nodes']): number {
  const depthMap = new Map<string, number>();

  // Initialize root nodes with depth 0
  nodes.forEach((node) => {
    if (node.data.type === 'ROOT') {
      depthMap.set(node.id, 0);
    }
  });

  // Calculate depth for each node
  let changed = true;
  while (changed) {
    changed = false;
    nodes.forEach((node) => {
      if (node.data.parentId && depthMap.has(node.data.parentId) && !depthMap.has(node.id)) {
        depthMap.set(node.id, depthMap.get(node.data.parentId)! + 1);
        changed = true;
      }
    });
  }

  return Math.max(...Array.from(depthMap.values()), 0);
}
