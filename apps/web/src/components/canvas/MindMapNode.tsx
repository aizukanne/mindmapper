import { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageCircle, ChevronRight, ChevronDown, GripVertical, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapStore, type NodeData } from '@/stores/mapStore';

// Flag to enable/disable API sync (can be controlled via props or context in future)
const ENABLE_API_SYNC = true;

interface CollaboratorSelection {
  id: string;
  name: string;
  color: string;
}

// Extended node data with collaboration features
export interface ExtendedNodeData extends NodeData {
  commentCount?: number;
  unresolvedComments?: number;
  selectedBy?: CollaboratorSelection[];
  editingBy?: CollaboratorSelection[];
  onCommentClick?: (nodeId: string) => void;
  onEditingStart?: (nodeId: string) => void;
  onEditingStop?: (nodeId: string) => void;
  childCount?: number;
}

interface MindMapNodeProps {
  id: string;
  data: ExtendedNodeData;
  selected?: boolean;
}

// Shape style mappings for different node shapes
const SHAPE_STYLES: Record<string, string> = {
  rectangle: 'rounded-none',
  rounded: 'rounded-lg',
  ellipse: 'rounded-full px-6',
  diamond: 'rotate-45',
  cloud: 'rounded-[40%]',
};

// Handle style presets based on connection state
const HANDLE_BASE_CLASSES = '!w-3 !h-3 !border-2 !border-white transition-all duration-200';
const HANDLE_HOVER_CLASSES = 'hover:!w-4 hover:!h-4 hover:!bg-primary/80';

function MindMapNodeComponent({ id, data, selected }: MindMapNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.text);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Use sync versions when API sync is enabled
  const updateNodeText = useMapStore((state) =>
    ENABLE_API_SYNC ? state.updateNodeTextWithSync : state.updateNodeText
  );
  const addNode = useMapStore((state) =>
    ENABLE_API_SYNC ? state.createNodeWithSync : state.addNode
  );
  const deleteNode = useMapStore((state) =>
    ENABLE_API_SYNC ? state.deleteNodeWithSync : state.deleteNode
  );
  const toggleNodeCollapse = useMapStore((state) => state.toggleNodeCollapse);
  const nodes = useMapStore((state) => state.nodes);

  // Calculate child count for collapse indicator
  const childCount = useMemo(() => {
    return nodes.filter((node) => node.data.parentId === id).length;
  }, [nodes, id]);

  const hasChildren = childCount > 0;

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditText(data.text);
    // Notify that editing has started
    data.onEditingStart?.(id);
  }, [data.text, data.onEditingStart, id]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editText.trim() !== data.text) {
      updateNodeText(id, editText.trim() || 'Empty');
    }
    // Notify that editing has stopped
    data.onEditingStop?.(id);
  }, [editText, data.text, id, updateNodeText, data.onEditingStop]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
      } else if (e.key === 'Escape') {
        setEditText(data.text);
        setIsEditing(false);
        // Notify that editing has stopped
        data.onEditingStop?.(id);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        handleBlur();
        // Add child node
        addNode(id);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Allow delete/backspace in edit mode for text editing
        if (!isEditing && data.type !== 'ROOT') {
          e.preventDefault();
          deleteNode(id);
        }
      }
    },
    [handleBlur, data.text, data.type, data.onEditingStop, id, addNode, deleteNode, isEditing]
  );

  // Handle click on add child button
  const handleAddChild = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    addNode(id);
  }, [addNode, id]);

  // Handle collapse/expand toggle
  const handleCollapseToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeCollapse(id);
  }, [id, toggleNodeCollapse]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [editText, isEditing]);

  const { style } = data;
  const isRoot = data.type === 'ROOT';
  const hasUnresolved = (data.unresolvedComments || 0) > 0;
  const selectedBy = data.selectedBy || [];
  const editingBy = data.editingBy || [];

  const handleCommentClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      data.onCommentClick?.(id);
    },
    [id, data]
  );

  // Compute dynamic node classes based on state
  // Priority: editing > selected > selectedBy
  const nodeClasses = useMemo(() => cn(
    'relative px-4 py-2 min-w-[100px] max-w-[300px] transition-all duration-200',
    'shadow-sm hover:shadow-md',
    SHAPE_STYLES[style.shape] || 'rounded-lg',
    selected && 'ring-2 ring-primary ring-offset-2 shadow-lg',
    // Editing by others has higher priority - show with animation
    editingBy.length > 0 && !selected && 'ring-2 ring-offset-2 animate-pulse',
    // Selected by others (but not editing) - show without animation
    selectedBy.length > 0 && editingBy.length === 0 && !selected && 'ring-2 ring-offset-2',
    isRoot && 'min-w-[150px] shadow-md',
    isHovered && !selected && selectedBy.length === 0 && editingBy.length === 0 && 'ring-1 ring-primary/30',
    data.isCollapsed && 'opacity-90'
  ), [style.shape, selected, selectedBy.length, editingBy.length, isRoot, isHovered, data.isCollapsed]);

  // Compute inline styles
  // Priority: editing > selectedBy for ring color
  const nodeStyles = useMemo(() => ({
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
    borderWidth: style.borderWidth,
    borderStyle: style.borderStyle || 'solid',
    borderRadius: style.borderRadius,
    // Apply ring color - editing takes priority over selection
    ...(editingBy.length > 0 && !selected
      ? ({ '--tw-ring-color': editingBy[0].color } as React.CSSProperties)
      : selectedBy.length > 0 && !selected
        ? ({ '--tw-ring-color': selectedBy[0].color } as React.CSSProperties)
        : {}),
  }), [style.backgroundColor, style.borderColor, style.borderWidth, style.borderStyle, style.borderRadius, editingBy, selectedBy, selected]);

  // Text content styles
  const textStyles = useMemo(() => ({
    color: style.textColor,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
  }), [style.textColor, style.fontSize, style.fontWeight, style.fontStyle]);

  return (
    <div
      className="relative group"
      ref={nodeRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`mind-map-node-${id}`}
    >
      {/* Editing indicators - show who is actively editing this node (higher priority) */}
      {editingBy.length > 0 && (
        <div
          className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20"
          data-testid={`editing-indicators-${id}`}
        >
          {editingBy.slice(0, 3).map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shadow-md animate-pulse"
              style={{ backgroundColor: user.color }}
              title={`${user.name} is editing`}
              data-testid={`editing-indicator-${user.id}`}
            >
              <span className="truncate max-w-[60px]">{user.name}</span>
              <span className="text-[8px] opacity-80">✎</span>
            </div>
          ))}
          {editingBy.length > 3 && (
            <div
              className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-600 text-white"
              title={editingBy
                .slice(3)
                .map((u) => `${u.name} is editing`)
                .join(', ')}
            >
              +{editingBy.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Selection indicators - show who else is selecting this node (only if not being edited) */}
      {selectedBy.length > 0 && editingBy.length === 0 && (
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10"
          data-testid={`selection-indicators-${id}`}
        >
          {selectedBy.slice(0, 3).map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white shadow-sm"
              style={{ backgroundColor: user.color }}
              title={`${user.name} has selected this`}
              data-testid={`selection-indicator-${user.id}`}
            >
              <span className="truncate max-w-[60px]">{user.name}</span>
            </div>
          ))}
          {selectedBy.length > 3 && (
            <div
              className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-500 text-white"
              title={selectedBy
                .slice(3)
                .map((u) => u.name)
                .join(', ')}
            >
              +{selectedBy.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Collapse/Expand indicator for nodes with children */}
      {hasChildren && (
        <button
          onClick={handleCollapseToggle}
          className={cn(
            'absolute -left-5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center',
            'bg-white border border-gray-300 rounded-full shadow-sm',
            'hover:bg-gray-100 hover:border-gray-400 transition-colors',
            'opacity-0 group-hover:opacity-100 focus:opacity-100',
            selected && 'opacity-100'
          )}
          title={data.isCollapsed ? `Expand (${childCount} children)` : `Collapse (${childCount} children)`}
          data-testid={`collapse-toggle-${id}`}
        >
          {data.isCollapsed ? (
            <ChevronRight className="w-3 h-3 text-gray-600" />
          ) : (
            <ChevronDown className="w-3 h-3 text-gray-600" />
          )}
        </button>
      )}

      {/* Main node container */}
      <div
        className={nodeClasses}
        style={nodeStyles}
        onDoubleClick={handleDoubleClick}
        data-testid={`node-content-${id}`}
      >
        {/* Drag handle indicator (visible on hover) */}
        <div
          className={cn(
            'absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab',
            isEditing && 'hidden'
          )}
        >
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>

        {/* Target handles - multiple positions for flexible connections */}
        {!isRoot && (
          <>
            <Handle
              type="target"
              position={Position.Left}
              id="target-left"
              className={cn(HANDLE_BASE_CLASSES, HANDLE_HOVER_CLASSES, '!bg-primary')}
              data-testid={`handle-target-left-${id}`}
            />
            <Handle
              type="target"
              position={Position.Top}
              id="target-top"
              className={cn(
                HANDLE_BASE_CLASSES,
                HANDLE_HOVER_CLASSES,
                '!bg-primary/70',
                'opacity-0 group-hover:opacity-100'
              )}
              data-testid={`handle-target-top-${id}`}
            />
          </>
        )}

        {/* Source handles - multiple positions for flexible connections */}
        <Handle
          type="source"
          position={Position.Right}
          id="source-right"
          className={cn(HANDLE_BASE_CLASSES, HANDLE_HOVER_CLASSES, '!bg-primary')}
          data-testid={`handle-source-right-${id}`}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="source-bottom"
          className={cn(
            HANDLE_BASE_CLASSES,
            HANDLE_HOVER_CLASSES,
            '!bg-primary/70',
            'opacity-0 group-hover:opacity-100'
          )}
          data-testid={`handle-source-bottom-${id}`}
        />

        {/* Content */}
        <div className={cn(
          style.shape === 'diamond' && '-rotate-45',
          'transition-transform'
        )}>
          {isEditing ? (
            <textarea
              ref={inputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={cn(
                'w-full min-h-[1.5em] bg-transparent border-none outline-none resize-none text-center',
                'focus:ring-0 focus:outline-none',
                'placeholder:text-gray-400'
              )}
              style={textStyles}
              rows={1}
              placeholder="Enter text..."
              data-testid={`node-input-${id}`}
            />
          ) : (
            <div
              className="text-center break-words select-none"
              style={textStyles}
              data-testid={`node-text-${id}`}
            >
              {style.icon && <span className="mr-1">{style.icon}</span>}
              {data.text}
            </div>
          )}
        </div>

        {/* Quick add child button (visible on hover) */}
        <button
          onClick={handleAddChild}
          className={cn(
            'absolute -right-6 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center',
            'bg-primary text-white rounded-full shadow-md',
            'hover:bg-primary/90 hover:scale-110 transition-all',
            'opacity-0 group-hover:opacity-100 focus:opacity-100',
            selected && 'opacity-100'
          )}
          title="Add child node (Tab)"
          data-testid={`add-child-${id}`}
        >
          <Plus className="w-3 h-3" />
        </button>

        {/* Child count badge (when collapsed) */}
        {data.isCollapsed && hasChildren && (
          <div
            className={cn(
              'absolute -right-2 -bottom-2 min-w-[18px] h-[18px] flex items-center justify-center',
              'bg-gray-600 text-white rounded-full text-[10px] font-medium shadow-sm'
            )}
            title={`${childCount} hidden children`}
          >
            {childCount}
          </div>
        )}

        {/* Comment indicator badge - shows unresolved comment count */}
        {hasUnresolved && (
          <button
            onClick={handleCommentClick}
            className={cn(
              'absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold shadow-md transition-transform hover:scale-110',
              'bg-orange-500 text-white'
            )}
            title={`${data.unresolvedComments} unresolved comment${data.unresolvedComments !== 1 ? 's' : ''}`}
            data-testid={`comment-badge-${id}`}
          >
            <MessageCircle className="h-3 w-3 mr-0.5" />
            {data.unresolvedComments}
          </button>
        )}
      </div>

      {/* Node type indicator (for debugging/development) */}
      {process.env.NODE_ENV === 'development' && isHovered && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-gray-400 whitespace-nowrap">
          {data.type} | {id.slice(0, 8)}...
        </div>
      )}
    </div>
  );
}

export const MindMapNode = memo(MindMapNodeComponent);
