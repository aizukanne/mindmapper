import { useState, useCallback, useRef, DragEvent } from 'react';

/**
 * Types for drag-and-drop operations
 */
export type DragItemType = 'map' | 'folder';

export interface DragItem {
  type: DragItemType;
  id: string;
  sourceParentId: string | null;
}

export interface DropTarget {
  type: 'folder' | 'root';
  id: string | null;
  position?: 'before' | 'after' | 'inside';
}

export interface DragState {
  isDragging: boolean;
  dragItem: DragItem | null;
  dropTarget: DropTarget | null;
}

/**
 * Hook for managing drag-and-drop state across the application
 */
export function useDragAndDropState() {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragItem: null,
    dropTarget: null,
  });

  const startDrag = useCallback((item: DragItem) => {
    setDragState({
      isDragging: true,
      dragItem: item,
      dropTarget: null,
    });
  }, []);

  const updateDropTarget = useCallback((target: DropTarget | null) => {
    setDragState((prev) => ({
      ...prev,
      dropTarget: target,
    }));
  }, []);

  const endDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      dragItem: null,
      dropTarget: null,
    });
  }, []);

  return {
    dragState,
    startDrag,
    updateDropTarget,
    endDrag,
  };
}

/**
 * Hook for making an element draggable
 */
export function useDraggable(item: DragItem, onDragStart?: () => void, onDragEnd?: () => void) {
  const [isDragging, setIsDragging] = useState(false);
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLElement>) => {
      // Set data for the drag operation
      e.dataTransfer.setData('application/json', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'move';

      // Create custom drag image
      if (dragImageRef.current) {
        e.dataTransfer.setDragImage(dragImageRef.current, 0, 0);
      }

      setIsDragging(true);
      onDragStart?.();
    },
    [item, onDragStart]
  );

  const handleDragEnd = useCallback(
    (_e: DragEvent<HTMLElement>) => {
      setIsDragging(false);
      onDragEnd?.();
    },
    [onDragEnd]
  );

  return {
    isDragging,
    dragImageRef,
    dragHandlers: {
      draggable: true,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    },
  };
}

/**
 * Hook for making an element a drop target
 */
export function useDropTarget(
  targetId: string | null,
  targetType: 'folder' | 'root',
  options: {
    acceptTypes?: DragItemType[];
    onDrop?: (item: DragItem, position?: 'before' | 'after' | 'inside') => void;
    onDragEnter?: () => void;
    onDragLeave?: () => void;
    disabled?: boolean;
  } = {}
) {
  const { acceptTypes = ['map', 'folder'], onDrop, onDragEnter, onDragLeave, disabled = false } = options;

  const [isOver, setIsOver] = useState(false);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);
  const dragCounterRef = useRef(0);

  const canAcceptDrop = useCallback(
    (item: DragItem): boolean => {
      if (disabled) return false;

      // Check if item type is accepted
      if (!acceptTypes.includes(item.type)) return false;

      // Prevent dropping folder on itself
      if (item.type === 'folder' && item.id === targetId) return false;

      // Prevent dropping folder into its children (circular reference prevention)
      // This is handled on the backend, but we can also prevent it in the UI
      if (item.type === 'folder' && targetType === 'folder') {
        // For now, allow it and let backend validate
        return true;
      }

      return true;
    },
    [acceptTypes, targetId, targetType, disabled]
  );

  const getDragItem = useCallback((e: DragEvent<HTMLElement>): DragItem | null => {
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        return JSON.parse(data) as DragItem;
      }
    } catch {
      // Ignore parse errors during drag (data not available until drop)
    }
    return null;
  }, []);

  const calculateDropPosition = useCallback(
    (e: DragEvent<HTMLElement>, element: HTMLElement): 'before' | 'after' | 'inside' => {
      const rect = element.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;

      // Top 25% = before, bottom 25% = after, middle 50% = inside
      if (y < height * 0.25) return 'before';
      if (y > height * 0.75) return 'after';
      return 'inside';
    },
    []
  );

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      dragCounterRef.current++;

      if (dragCounterRef.current === 1) {
        setIsOver(true);
        onDragEnter?.();
      }
    },
    [onDragEnter]
  );

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      dragCounterRef.current--;

      if (dragCounterRef.current === 0) {
        setIsOver(false);
        setDropPosition(null);
        onDragLeave?.();
      }
    },
    [onDragLeave]
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();

      // Calculate drop position for folder reordering
      if (targetType === 'folder') {
        const position = calculateDropPosition(e, e.currentTarget);
        setDropPosition(position);
      }

      e.dataTransfer.dropEffect = 'move';
    },
    [calculateDropPosition, targetType]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current = 0;
      setIsOver(false);

      const item = getDragItem(e);
      if (item && canAcceptDrop(item)) {
        const position = targetType === 'folder' ? calculateDropPosition(e, e.currentTarget) : 'inside';
        onDrop?.(item, position);
      }

      setDropPosition(null);
    },
    [getDragItem, canAcceptDrop, onDrop, targetType, calculateDropPosition]
  );

  return {
    isOver,
    dropPosition,
    dropHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}

/**
 * Context for sharing drag state across components
 */
import { createContext, useContext, ReactNode } from 'react';

interface DragAndDropContextValue {
  dragState: DragState;
  startDrag: (item: DragItem) => void;
  updateDropTarget: (target: DropTarget | null) => void;
  endDrag: () => void;
}

const DragAndDropContext = createContext<DragAndDropContextValue | null>(null);

export function DragAndDropProvider({ children }: { children: ReactNode }) {
  const { dragState, startDrag, updateDropTarget, endDrag } = useDragAndDropState();

  return (
    <DragAndDropContext.Provider value={{ dragState, startDrag, updateDropTarget, endDrag }}>
      {children}
    </DragAndDropContext.Provider>
  );
}

export function useDragAndDropContext() {
  const context = useContext(DragAndDropContext);
  if (!context) {
    throw new Error('useDragAndDropContext must be used within a DragAndDropProvider');
  }
  return context;
}
