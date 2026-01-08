import { useEffect, useRef, useCallback, useState } from 'react';
import { useReactFlow } from '@xyflow/react';

interface TouchPoint {
  x: number;
  y: number;
}

export interface LongPressContext {
  x: number;
  y: number;
  target: HTMLElement | null;
  nodeId: string | null;
}

interface UseTouchGesturesOptions {
  enabled?: boolean;
  onLongPress?: (context: LongPressContext) => void;
  longPressDelay?: number;
  longPressMoveThreshold?: number;
}

export interface UseTouchGesturesResult {
  isLongPressing: boolean;
  longPressPosition: TouchPoint | null;
}

export function useTouchGestures(options: UseTouchGesturesOptions = {}): UseTouchGesturesResult {
  const {
    enabled = true,
    onLongPress,
    longPressDelay = 500,
    longPressMoveThreshold = 10,
  } = options;
  const { setViewport, getViewport } = useReactFlow();

  const lastTouchesRef = useRef<TouchPoint[]>([]);
  const initialDistanceRef = useRef<number>(0);
  const initialZoomRef = useRef<number>(1);
  const lastPanRef = useRef<TouchPoint>({ x: 0, y: 0 });

  // Long press state
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressPosition, setLongPressPosition] = useState<TouchPoint | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStartRef = useRef<TouchPoint | null>(null);
  const longPressTargetRef = useRef<HTMLElement | null>(null);

  // Clear long press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Find closest node element from touch target
  const findNodeFromTarget = useCallback((target: HTMLElement | null): string | null => {
    if (!target) return null;
    const nodeElement = target.closest('[data-id]');
    if (nodeElement) {
      return nodeElement.getAttribute('data-id');
    }
    return null;
  }, []);

  const getDistance = useCallback((touches: TouchPoint[]) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].x - touches[1].x;
    const dy = touches[0].y - touches[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getCenter = useCallback((touches: TouchPoint[]): TouchPoint => {
    if (touches.length === 0) return { x: 0, y: 0 };
    if (touches.length === 1) return touches[0];
    return {
      x: (touches[0].x + touches[1].x) / 2,
      y: (touches[0].y + touches[1].y) / 2,
    };
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touches: TouchPoint[] = Array.from(e.touches).map((t) => ({
        x: t.clientX,
        y: t.clientY,
      }));

      lastTouchesRef.current = touches;

      if (touches.length === 2) {
        // Start pinch-to-zoom - cancel any long press
        clearLongPressTimer();
        setIsLongPressing(false);
        initialDistanceRef.current = getDistance(touches);
        initialZoomRef.current = getViewport().zoom;
        lastPanRef.current = getCenter(touches);
      } else if (touches.length === 1) {
        lastPanRef.current = touches[0];

        // Start long press detection for single touch
        if (onLongPress) {
          const touch = e.touches[0];
          longPressStartRef.current = { x: touch.clientX, y: touch.clientY };
          longPressTargetRef.current = e.target as HTMLElement;

          longPressTimerRef.current = setTimeout(() => {
            setIsLongPressing(true);
            setLongPressPosition({ x: touch.clientX, y: touch.clientY });
            const nodeId = findNodeFromTarget(longPressTargetRef.current);
            onLongPress({
              x: touch.clientX,
              y: touch.clientY,
              target: longPressTargetRef.current,
              nodeId,
            });
          }, longPressDelay);
        }
      }
    },
    [enabled, getDistance, getCenter, getViewport, onLongPress, longPressDelay, clearLongPressTimer, findNodeFromTarget]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touches: TouchPoint[] = Array.from(e.touches).map((t) => ({
        x: t.clientX,
        y: t.clientY,
      }));

      // Cancel long press if moved beyond threshold
      if (touches.length === 1 && longPressStartRef.current && longPressTimerRef.current) {
        const dx = touches[0].x - longPressStartRef.current.x;
        const dy = touches[0].y - longPressStartRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > longPressMoveThreshold) {
          clearLongPressTimer();
        }
      }

      if (touches.length === 2 && initialDistanceRef.current > 0) {
        // Pinch-to-zoom
        e.preventDefault();
        clearLongPressTimer();

        const currentDistance = getDistance(touches);
        const scale = currentDistance / initialDistanceRef.current;
        const newZoom = Math.min(
          Math.max(initialZoomRef.current * scale, 0.25),
          4
        );

        // Calculate pan during pinch
        const currentCenter = getCenter(touches);
        const viewport = getViewport();

        const dx = currentCenter.x - lastPanRef.current.x;
        const dy = currentCenter.y - lastPanRef.current.y;

        setViewport({
          x: viewport.x + dx,
          y: viewport.y + dy,
          zoom: newZoom,
        });

        lastPanRef.current = currentCenter;
      } else if (touches.length === 2 && lastTouchesRef.current.length === 2) {
        // Two-finger pan (without pinch)
        clearLongPressTimer();
        const currentCenter = getCenter(touches);
        const viewport = getViewport();

        const dx = currentCenter.x - lastPanRef.current.x;
        const dy = currentCenter.y - lastPanRef.current.y;

        setViewport({
          ...viewport,
          x: viewport.x + dx,
          y: viewport.y + dy,
        });

        lastPanRef.current = currentCenter;
      }

      lastTouchesRef.current = touches;
    },
    [enabled, getDistance, getCenter, getViewport, setViewport, longPressMoveThreshold, clearLongPressTimer]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      // Clear long press timer on touch end
      clearLongPressTimer();
      longPressStartRef.current = null;
      longPressTargetRef.current = null;

      // Reset long press state after a short delay (allows context menu to appear)
      setTimeout(() => {
        setIsLongPressing(false);
        setLongPressPosition(null);
      }, 100);

      const touches: TouchPoint[] = Array.from(e.touches).map((t) => ({
        x: t.clientX,
        y: t.clientY,
      }));

      if (touches.length < 2) {
        initialDistanceRef.current = 0;
      }

      if (touches.length === 1) {
        lastPanRef.current = touches[0];
      }

      lastTouchesRef.current = touches;
    },
    [enabled, clearLongPressTimer]
  );

  useEffect(() => {
    if (!enabled) return;

    // Use passive: false to allow preventDefault
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Double-tap to zoom
  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = useCallback(
    (e: TouchEvent) => {
      if (!enabled || e.touches.length !== 1) return;

      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;

      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        // Double tap detected
        e.preventDefault();
        const viewport = getViewport();
        const newZoom = viewport.zoom < 1.5 ? 2 : 1;
        setViewport({ ...viewport, zoom: newZoom });
      }

      lastTapRef.current = now;
    },
    [enabled, getViewport, setViewport]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('touchstart', handleDoubleTap, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleDoubleTap);
    };
  }, [enabled, handleDoubleTap]);

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return {
    isLongPressing,
    longPressPosition,
  };
}
