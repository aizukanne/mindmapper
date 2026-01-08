import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Trash2,
  Copy,
  Edit3,
  MoreHorizontal,
  X,
  Users,
  Link,
  Unlink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TouchContextMenuAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  hidden?: boolean;
}

export interface TouchContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  nodeId: string | null;
  onClose: () => void;
  actions: TouchContextMenuAction[];
  title?: string;
}

const MENU_WIDTH = 200;
const MENU_PADDING = 16;

export function TouchContextMenu({
  isOpen,
  position,
  onClose,
  actions,
  title,
}: TouchContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate adjusted position to keep menu on screen
  useEffect(() => {
    if (!position || !isOpen) {
      setAdjustedPosition(null);
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuHeight = 300; // Approximate max height

    let x = position.x - MENU_WIDTH / 2;
    let y = position.y + 10;

    // Adjust horizontal position
    if (x < MENU_PADDING) {
      x = MENU_PADDING;
    } else if (x + MENU_WIDTH > viewportWidth - MENU_PADDING) {
      x = viewportWidth - MENU_WIDTH - MENU_PADDING;
    }

    // Adjust vertical position - prefer below touch point, but flip if needed
    if (y + menuHeight > viewportHeight - MENU_PADDING) {
      y = position.y - menuHeight - 10;
      if (y < MENU_PADDING) {
        y = MENU_PADDING;
      }
    }

    setAdjustedPosition({ x, y });
    setIsAnimating(true);
  }, [position, isOpen]);

  // Handle click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    },
    [onClose]
  );

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter out hidden actions
  const visibleActions = actions.filter((action) => !action.hidden);

  if (!isOpen || !adjustedPosition) {
    return null;
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/20 touch-none"
        onClick={handleBackdropClick}
        onTouchEnd={handleBackdropClick}
        data-testid="touch-context-menu-backdrop"
      />

      {/* Context Menu */}
      <div
        ref={menuRef}
        className={cn(
          'fixed z-[101] bg-white rounded-xl shadow-2xl overflow-hidden touch-none',
          'transform transition-all duration-200 ease-out',
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
          width: MENU_WIDTH,
        }}
        data-testid="touch-context-menu"
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-medium text-gray-700 truncate">{title}</span>
            <button
              onClick={onClose}
              className="p-1 -mr-1 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-colors"
              data-testid="touch-context-menu-close"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="py-1 max-h-[300px] overflow-y-auto">
          {visibleActions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No actions available
            </div>
          ) : (
            visibleActions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  if (!action.disabled) {
                    action.onClick();
                    onClose();
                  }
                }}
                disabled={action.disabled}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                  'active:bg-gray-100',
                  action.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-50',
                  action.destructive && !action.disabled
                    ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
                    : 'text-gray-700'
                )}
                data-testid={`touch-context-menu-action-${action.id}`}
              >
                <span className={cn(
                  'flex-shrink-0',
                  action.destructive && !action.disabled ? 'text-red-500' : 'text-gray-500'
                )}>
                  {action.icon}
                </span>
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

// Pre-built action creators for common operations
export function createNodeActions(options: {
  nodeId: string | null;
  nodeType?: string;
  onAddChild?: () => void;
  onAddSibling?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onLink?: () => void;
  onUnlink?: () => void;
}): TouchContextMenuAction[] {
  const {
    nodeId,
    nodeType,
    onAddChild,
    onAddSibling,
    onEdit,
    onDelete,
    onDuplicate,
    onLink,
    onUnlink,
  } = options;

  const isRoot = nodeType === 'ROOT';

  return [
    {
      id: 'add-child',
      label: 'Add Child',
      icon: <Plus className="w-5 h-5" />,
      onClick: onAddChild || (() => {}),
      disabled: !nodeId || !onAddChild,
    },
    {
      id: 'add-sibling',
      label: 'Add Sibling',
      icon: <Plus className="w-5 h-5" />,
      onClick: onAddSibling || (() => {}),
      disabled: !nodeId || isRoot || !onAddSibling,
      hidden: isRoot,
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: <Edit3 className="w-5 h-5" />,
      onClick: onEdit || (() => {}),
      disabled: !nodeId || !onEdit,
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: <Copy className="w-5 h-5" />,
      onClick: onDuplicate || (() => {}),
      disabled: !nodeId || isRoot || !onDuplicate,
      hidden: isRoot,
    },
    {
      id: 'link',
      label: 'Link',
      icon: <Link className="w-5 h-5" />,
      onClick: onLink || (() => {}),
      disabled: !nodeId || !onLink,
      hidden: !onLink,
    },
    {
      id: 'unlink',
      label: 'Unlink',
      icon: <Unlink className="w-5 h-5" />,
      onClick: onUnlink || (() => {}),
      disabled: !nodeId || !onUnlink,
      hidden: !onUnlink,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-5 h-5" />,
      onClick: onDelete || (() => {}),
      disabled: !nodeId || isRoot || !onDelete,
      destructive: true,
      hidden: isRoot,
    },
  ];
}

// Pre-built action creators for canvas/background operations
export function createCanvasActions(options: {
  onAddNode?: () => void;
  onFitView?: () => void;
}): TouchContextMenuAction[] {
  const { onAddNode, onFitView } = options;

  return [
    {
      id: 'add-node',
      label: 'Add Node Here',
      icon: <Plus className="w-5 h-5" />,
      onClick: onAddNode || (() => {}),
      disabled: !onAddNode,
    },
    {
      id: 'fit-view',
      label: 'Fit View',
      icon: <MoreHorizontal className="w-5 h-5" />,
      onClick: onFitView || (() => {}),
      disabled: !onFitView,
    },
  ];
}

// Family tree specific actions
export function createFamilyTreePersonActions(options: {
  personId: string | null;
  personName?: string;
  onViewDetails?: () => void;
  onAddParent?: () => void;
  onAddChild?: () => void;
  onAddSpouse?: () => void;
  onAddSibling?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onIsolateBranch?: () => void;
}): TouchContextMenuAction[] {
  const {
    personId,
    onViewDetails,
    onAddParent,
    onAddChild,
    onAddSpouse,
    onAddSibling,
    onEdit,
    onDelete,
    onIsolateBranch,
  } = options;

  return [
    {
      id: 'view-details',
      label: 'View Details',
      icon: <Users className="w-5 h-5" />,
      onClick: onViewDetails || (() => {}),
      disabled: !personId || !onViewDetails,
    },
    {
      id: 'edit',
      label: 'Edit Person',
      icon: <Edit3 className="w-5 h-5" />,
      onClick: onEdit || (() => {}),
      disabled: !personId || !onEdit,
    },
    {
      id: 'add-parent',
      label: 'Add Parent',
      icon: <Plus className="w-5 h-5" />,
      onClick: onAddParent || (() => {}),
      disabled: !personId || !onAddParent,
      hidden: !onAddParent,
    },
    {
      id: 'add-child',
      label: 'Add Child',
      icon: <Plus className="w-5 h-5" />,
      onClick: onAddChild || (() => {}),
      disabled: !personId || !onAddChild,
      hidden: !onAddChild,
    },
    {
      id: 'add-spouse',
      label: 'Add Spouse',
      icon: <Plus className="w-5 h-5" />,
      onClick: onAddSpouse || (() => {}),
      disabled: !personId || !onAddSpouse,
      hidden: !onAddSpouse,
    },
    {
      id: 'add-sibling',
      label: 'Add Sibling',
      icon: <Plus className="w-5 h-5" />,
      onClick: onAddSibling || (() => {}),
      disabled: !personId || !onAddSibling,
      hidden: !onAddSibling,
    },
    {
      id: 'isolate-branch',
      label: 'View Branch',
      icon: <Users className="w-5 h-5" />,
      onClick: onIsolateBranch || (() => {}),
      disabled: !personId || !onIsolateBranch,
      hidden: !onIsolateBranch,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-5 h-5" />,
      onClick: onDelete || (() => {}),
      disabled: !personId || !onDelete,
      destructive: true,
    },
  ];
}

export default TouchContextMenu;
