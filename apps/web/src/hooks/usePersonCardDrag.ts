import { useCallback, useRef, useEffect } from 'react';
import { useFamilyTreeStore } from '@/stores/familyTreeStore';

export interface UsePersonCardDragOptions {
  /** Tree ID for storing custom positions */
  treeId: string;
  /** Callback when position is finalized (for API sync) */
  onPositionChange?: (personId: string, position: { x: number; y: number }) => void;
  /** Current view state for coordinate conversion */
  viewState: {
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  /** Minimum distance to move before starting drag (prevents accidental drags) */
  dragThreshold?: number;
  /** Canvas boundaries (optional, for constraining drag) */
  bounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface PersonCardDragHandlers {
  /** Mouse down handler to start drag */
  onMouseDown: (e: React.MouseEvent, personId: string, currentPosition: { x: number; y: number }) => void;
  /** Touch start handler for mobile */
  onTouchStart: (e: React.TouchEvent, personId: string, currentPosition: { x: number; y: number }) => void;
  /** Check if clicks should be suppressed (after a drag) */
  shouldSuppressClick: () => boolean;
}

/**
 * Hook for handling drag-and-drop of person cards on the family tree canvas
 *
 * Features:
 * - Mouse and touch support
 * - Drag threshold to prevent accidental drags
 * - Visual feedback during drag (cursor, elevation)
 * - Boundary constraints
 * - Coordinate system conversion (screen to canvas)
 * - Integration with family tree store for position persistence
 */
export function usePersonCardDrag({
  treeId,
  onPositionChange,
  viewState,
  dragThreshold = 5,
  bounds,
}: UsePersonCardDragOptions): PersonCardDragHandlers {
  const {
    isDragging,
    dragState,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    setCustomPosition,
  } = useFamilyTreeStore();

  // Track if we've exceeded the drag threshold
  const dragStartedRef = useRef(false);
  const initialMousePosRef = useRef<{ x: number; y: number } | null>(null);
  // Track if we should suppress the next click (after dragging)
  const suppressClickRef = useRef(false);
  const suppressClickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - viewState.offsetX) / viewState.scale,
      y: (screenY - viewState.offsetY) / viewState.scale,
    };
  }, [viewState.offsetX, viewState.offsetY, viewState.scale]);

  // Constrain position to bounds
  const constrainPosition = useCallback((position: { x: number; y: number }) => {
    if (!bounds) return position;
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, position.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, position.y)),
    };
  }, [bounds]);

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!initialMousePosRef.current) return;

    const dx = e.clientX - initialMousePosRef.current.x;
    const dy = e.clientY - initialMousePosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if we've exceeded the drag threshold
    if (!dragStartedRef.current && distance >= dragThreshold) {
      dragStartedRef.current = true;
      // Prevent text selection and default drag behavior ONLY when actual drag starts
      e.preventDefault();
    }

    if (!dragStartedRef.current || !dragState) return;

    // Prevent default during active drag
    e.preventDefault();

    // Calculate new position in canvas coordinates
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    const newPosition = constrainPosition({
      x: canvasPos.x - dragState.offset.x,
      y: canvasPos.y - dragState.offset.y,
    });

    updateDrag(newPosition);
  }, [dragState, dragThreshold, screenToCanvas, constrainPosition, updateDrag]);

  // Handle mouse up to end drag
  const handleMouseUp = useCallback(() => {
    const wasDragging = dragStartedRef.current;

    if (dragStartedRef.current) {
      const result = endDrag();
      if (result) {
        // Save position to store
        setCustomPosition(treeId, result.personId, result.finalPosition);
        // Notify parent for API sync
        onPositionChange?.(result.personId, result.finalPosition);
      }
    } else {
      cancelDrag();
    }

    dragStartedRef.current = false;
    initialMousePosRef.current = null;

    // Suppress click events briefly after dragging to prevent opening details
    if (wasDragging) {
      suppressClickRef.current = true;
      // Clear any existing timeout
      if (suppressClickTimeoutRef.current) {
        clearTimeout(suppressClickTimeoutRef.current);
      }
      // Reset after a short delay (click events fire almost immediately)
      suppressClickTimeoutRef.current = setTimeout(() => {
        suppressClickRef.current = false;
      }, 50);
    }
  }, [treeId, endDrag, cancelDrag, setCustomPosition, onPositionChange]);

  // Handle touch move during drag
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1 || !initialMousePosRef.current) return;

    const touch = e.touches[0];
    const dx = touch.clientX - initialMousePosRef.current.x;
    const dy = touch.clientY - initialMousePosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if we've exceeded the drag threshold
    if (!dragStartedRef.current && distance >= dragThreshold) {
      dragStartedRef.current = true;
    }

    if (!dragStartedRef.current || !dragState) return;

    // Prevent scrolling while dragging
    e.preventDefault();

    // Calculate new position in canvas coordinates
    const canvasPos = screenToCanvas(touch.clientX, touch.clientY);
    const newPosition = constrainPosition({
      x: canvasPos.x - dragState.offset.x,
      y: canvasPos.y - dragState.offset.y,
    });

    updateDrag(newPosition);
  }, [dragState, dragThreshold, screenToCanvas, constrainPosition, updateDrag]);

  // Handle touch end to end drag
  const handleTouchEnd = useCallback(() => {
    const wasDragging = dragStartedRef.current;

    if (dragStartedRef.current) {
      const result = endDrag();
      if (result) {
        // Save position to store
        setCustomPosition(treeId, result.personId, result.finalPosition);
        // Notify parent for API sync
        onPositionChange?.(result.personId, result.finalPosition);
      }
    } else {
      cancelDrag();
    }

    dragStartedRef.current = false;
    initialMousePosRef.current = null;

    // Suppress click events briefly after dragging to prevent opening details
    if (wasDragging) {
      suppressClickRef.current = true;
      // Clear any existing timeout
      if (suppressClickTimeoutRef.current) {
        clearTimeout(suppressClickTimeoutRef.current);
      }
      // Reset after a short delay (click events fire almost immediately)
      suppressClickTimeoutRef.current = setTimeout(() => {
        suppressClickRef.current = false;
      }, 50);
    }
  }, [treeId, endDrag, cancelDrag, setCustomPosition, onPositionChange]);

  // Set up global event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);

      // Set cursor style on body during drag
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);

        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Mouse down handler
  const onMouseDown = useCallback((
    e: React.MouseEvent,
    personId: string,
    currentPosition: { x: number; y: number }
  ) => {
    // Only handle left click
    if (e.button !== 0) return;

    // DON'T call preventDefault() here - it blocks click events
    // We only want to prevent default behavior during actual drag (handled in handleMouseMove)

    // Calculate cursor offset from card top-left corner
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    const offset = {
      x: canvasPos.x - currentPosition.x,
      y: canvasPos.y - currentPosition.y,
    };

    initialMousePosRef.current = { x: e.clientX, y: e.clientY };
    dragStartedRef.current = false;

    startDrag(personId, currentPosition, offset);
  }, [screenToCanvas, startDrag]);

  // Touch start handler
  const onTouchStart = useCallback((
    e: React.TouchEvent,
    personId: string,
    currentPosition: { x: number; y: number }
  ) => {
    // Only handle single touch
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];

    // Calculate cursor offset from card top-left corner
    const canvasPos = screenToCanvas(touch.clientX, touch.clientY);
    const offset = {
      x: canvasPos.x - currentPosition.x,
      y: canvasPos.y - currentPosition.y,
    };

    initialMousePosRef.current = { x: touch.clientX, y: touch.clientY };
    dragStartedRef.current = false;

    startDrag(personId, currentPosition, offset);
  }, [screenToCanvas, startDrag]);

  // Check if clicks should be suppressed (after a drag operation)
  const shouldSuppressClick = useCallback(() => {
    return suppressClickRef.current;
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (suppressClickTimeoutRef.current) {
        clearTimeout(suppressClickTimeoutRef.current);
      }
    };
  }, []);

  return {
    onMouseDown,
    onTouchStart,
    shouldSuppressClick,
  };
}
