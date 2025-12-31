import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapStore, type NodeData } from '@/stores/mapStore';

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
  onCommentClick?: (nodeId: string) => void;
}

interface MindMapNodeProps {
  id: string;
  data: ExtendedNodeData;
  selected?: boolean;
}

function MindMapNodeComponent({ id, data, selected }: MindMapNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const updateNodeText = useMapStore((state) => state.updateNodeText);
  const addNode = useMapStore((state) => state.addNode);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditText(data.text);
  }, [data.text]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editText.trim() !== data.text) {
      updateNodeText(id, editText.trim() || 'Empty');
    }
  }, [editText, data.text, id, updateNodeText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
      } else if (e.key === 'Escape') {
        setEditText(data.text);
        setIsEditing(false);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        handleBlur();
        // Add child node
        addNode(id);
      }
    },
    [handleBlur, data.text, id, addNode]
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const { style } = data;
  const isRoot = data.type === 'ROOT';
  const hasComments = (data.commentCount || 0) > 0;
  const hasUnresolved = (data.unresolvedComments || 0) > 0;
  const selectedBy = data.selectedBy || [];

  const shapeStyles: Record<string, string> = {
    rectangle: 'rounded-none',
    rounded: 'rounded-lg',
    ellipse: 'rounded-full',
    diamond: 'rotate-45',
    cloud: 'rounded-[40%]',
  };

  const handleCommentClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      data.onCommentClick?.(id);
    },
    [id, data]
  );

  return (
    <div className="relative">
      {/* Selection indicators - show who else is selecting this node */}
      {selectedBy.length > 0 && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
          {selectedBy.slice(0, 3).map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white shadow-sm animate-pulse"
              style={{ backgroundColor: user.color }}
              title={`${user.name} is editing`}
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

      {/* Main node container */}
      <div
        className={cn(
          'relative px-4 py-2 min-w-[100px] max-w-[300px] transition-all',
          shapeStyles[style.shape] || 'rounded-lg',
          selected && 'ring-2 ring-primary ring-offset-2',
          selectedBy.length > 0 && !selected && 'ring-2 ring-offset-2',
          data.type === 'ROOT' && 'min-w-[150px]'
        )}
        style={{
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          borderWidth: style.borderWidth,
          borderStyle: 'solid',
          borderRadius: style.borderRadius,
          // Apply selection ring color from first collaborator
          ...(selectedBy.length > 0 && !selected
            ? ({ '--tw-ring-color': selectedBy[0].color } as React.CSSProperties)
            : {}),
        }}
        onDoubleClick={handleDoubleClick}
      >
        {/* Input handles */}
        {!isRoot && (
          <Handle
            type="target"
            position={Position.Left}
            className="!w-3 !h-3 !bg-primary !border-2 !border-white"
          />
        )}

        {/* Output handles */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-primary !border-2 !border-white"
        />

        {/* Content */}
        <div className={cn(style.shape === 'diamond' && '-rotate-45')}>
          {isEditing ? (
            <textarea
              ref={inputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[1.5em] bg-transparent border-none outline-none resize-none text-center"
              style={{
                color: style.textColor,
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                fontStyle: style.fontStyle,
              }}
              rows={1}
            />
          ) : (
            <div
              className="text-center break-words"
              style={{
                color: style.textColor,
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                fontStyle: style.fontStyle,
              }}
            >
              {style.icon && <span className="mr-1">{style.icon}</span>}
              {data.text}
            </div>
          )}
        </div>

        {/* Comment indicator badge */}
        {hasComments && (
          <button
            onClick={handleCommentClick}
            className={cn(
              'absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold shadow-md transition-transform hover:scale-110',
              hasUnresolved
                ? 'bg-orange-500 text-white'
                : 'bg-gray-400 text-white'
            )}
            title={
              hasUnresolved
                ? `${data.unresolvedComments} unresolved comment${data.unresolvedComments !== 1 ? 's' : ''}`
                : `${data.commentCount} comment${data.commentCount !== 1 ? 's' : ''} (all resolved)`
            }
          >
            <MessageCircle className="h-3 w-3 mr-0.5" />
            {data.commentCount}
          </button>
        )}
      </div>
    </div>
  );
}

export const MindMapNode = memo(MindMapNodeComponent);
