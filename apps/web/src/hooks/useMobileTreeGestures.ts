import { useState, useCallback, useRef, useEffect } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface GestureState {
  isPanning: boolean;
  isPinching: boolean;
  lastTap: number;
  tapCount: number;
}

interface UseMobileTreeGesturesOptions {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  initialPosition?: Point;
  onDoubleTap?: (point: Point) => void;
  onLongPress?: (point: Point) => void;
  boundaryPadding?: number;
}

interface UseMobileTreeGesturesResult {
  transform: Transform;
  setTransform: React.Dispatch<React.SetStateAction<Transform>>;
  gestureState: GestureState;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onWheel: (e: React.WheelEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
  };
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  centerOnPoint: (point: Point, animate?: boolean) => void;
  isMobile: boolean;
}

// Detect if device is mobile/touch
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Touch interface for compatibility
interface TouchPoint {
  clientX: number;
  clientY: number;
}

// Calculate distance between two touch points
function getDistance(touch1: TouchPoint, touch2: TouchPoint): number {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Calculate center point between two touches
function getCenter(touch1: TouchPoint, touch2: TouchPoint): Point {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

export function useMobileTreeGestures(
  containerRef: React.RefObject<HTMLElement>,
  options: UseMobileTreeGesturesOptions = {}
): UseMobileTreeGesturesResult {
  const {
    minScale = 0.25,
    maxScale = 3,
    initialScale = 1,
    initialPosition = { x: 0, y: 0 },
    onDoubleTap,
    onLongPress,
  } = options;

  const [transform, setTransform] = useState<Transform>({
    x: initialPosition.x,
    y: initialPosition.y,
    scale: initialScale,
  });

  const [gestureState, setGestureState] = useState<GestureState>({
    isPanning: false,
    isPinching: false,
    lastTap: 0,
    tapCount: 0,
  });

  const [isMobile] = useState(isTouchDevice);

  // Refs for gesture tracking
  const lastTouchRef = useRef<Point | null>(null);
  const lastDistanceRef = useRef<number>(0);
  const lastCenterRef = useRef<Point | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMouseDownRef = useRef(false);

  // Clear long press timer
  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Touch start handler
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    clearLongPress();

    if (e.touches.length === 1) {
      // Single touch - prepare for pan or tap
      const touch = e.touches[0];
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

      setGestureState(prev => ({ ...prev, isPanning: true }));

      // Set up long press detection
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          onLongPress({ x: touch.clientX, y: touch.clientY });
        }, 500);
      }
    } else if (e.touches.length === 2) {
      // Two touches - prepare for pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      lastDistanceRef.current = getDistance(touch1, touch2);
      lastCenterRef.current = getCenter(touch1, touch2);

      setGestureState(prev => ({
        ...prev,
        isPanning: false,
        isPinching: true,
      }));
    }
  }, [clearLongPress, onLongPress]);

  // Touch move handler
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    clearLongPress();

    if (e.touches.length === 1 && lastTouchRef.current) {
      // Pan
      const touch = e.touches[0];
      const dx = touch.clientX - lastTouchRef.current.x;
      const dy = touch.clientY - lastTouchRef.current.y;

      setTransform(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));

      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2 && lastCenterRef.current) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getDistance(touch1, touch2);
      const center = getCenter(touch1, touch2);

      if (lastDistanceRef.current > 0) {
        const scaleDelta = distance / lastDistanceRef.current;
        const container = containerRef.current;

        if (container) {
          const rect = container.getBoundingClientRect();
          const centerX = center.x - rect.left;
          const centerY = center.y - rect.top;

          setTransform(prev => {
            const newScale = Math.min(maxScale, Math.max(minScale, prev.scale * scaleDelta));
            const scaleChange = newScale / prev.scale;

            // Adjust position to zoom toward pinch center
            const newX = centerX - (centerX - prev.x) * scaleChange;
            const newY = centerY - (centerY - prev.y) * scaleChange;

            return {
              x: newX,
              y: newY,
              scale: newScale,
            };
          });
        }
      }

      lastDistanceRef.current = distance;
      lastCenterRef.current = center;
    }
  }, [clearLongPress, containerRef, maxScale, minScale]);

  // Touch end handler
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    clearLongPress();

    if (e.touches.length === 0) {
      // All touches released
      const now = Date.now();
      const timeSinceLastTap = now - gestureState.lastTap;

      // Detect double tap
      if (timeSinceLastTap < 300 && lastTouchRef.current && onDoubleTap) {
        onDoubleTap(lastTouchRef.current);
      }

      setGestureState(prev => ({
        ...prev,
        isPanning: false,
        isPinching: false,
        lastTap: now,
        tapCount: timeSinceLastTap < 300 ? prev.tapCount + 1 : 1,
      }));

      lastTouchRef.current = null;
      lastDistanceRef.current = 0;
      lastCenterRef.current = null;
    } else if (e.touches.length === 1) {
      // Transitioned from pinch to pan
      const touch = e.touches[0];
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      lastDistanceRef.current = 0;
      lastCenterRef.current = null;

      setGestureState(prev => ({
        ...prev,
        isPanning: true,
        isPinching: false,
      }));
    }
  }, [clearLongPress, gestureState.lastTap, onDoubleTap]);

  // Mouse wheel for desktop zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;

    setTransform(prev => {
      const newScale = Math.min(maxScale, Math.max(minScale, prev.scale * delta));
      const scaleChange = newScale / prev.scale;

      // Zoom toward mouse position
      const newX = mouseX - (mouseX - prev.x) * scaleChange;
      const newY = mouseY - (mouseY - prev.y) * scaleChange;

      return {
        x: newX,
        y: newY,
        scale: newScale,
      };
    });
  }, [containerRef, maxScale, minScale]);

  // Mouse handlers for desktop panning
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    isMouseDownRef.current = true;
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
    setGestureState(prev => ({ ...prev, isPanning: true }));
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMouseDownRef.current || !lastTouchRef.current) return;

    const dx = e.clientX - lastTouchRef.current.x;
    const dy = e.clientY - lastTouchRef.current.y;

    setTransform(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));

    lastTouchRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    lastTouchRef.current = null;
    setGestureState(prev => ({ ...prev, isPanning: false }));
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setTransform(prev => {
      const newScale = Math.min(maxScale, prev.scale * 1.25);
      return { ...prev, scale: newScale };
    });
  }, [maxScale]);

  const zoomOut = useCallback(() => {
    setTransform(prev => {
      const newScale = Math.max(minScale, prev.scale / 1.25);
      return { ...prev, scale: newScale };
    });
  }, [minScale]);

  const resetView = useCallback(() => {
    setTransform({
      x: initialPosition.x,
      y: initialPosition.y,
      scale: initialScale,
    });
  }, [initialPosition, initialScale]);

  const centerOnPoint = useCallback((point: Point, _animate = true) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Note: Animation could be implemented with CSS transitions or spring physics
    setTransform(prev => ({
      ...prev,
      x: centerX - point.x * prev.scale,
      y: centerY - point.y * prev.scale,
    }));
  }, [containerRef]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearLongPress();
    };
  }, [clearLongPress]);

  // Add global mouse up listener for desktop
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isMouseDownRef.current = false;
      setGestureState(prev => ({ ...prev, isPanning: false }));
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return {
    transform,
    setTransform,
    gestureState,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onWheel,
      onMouseDown,
      onMouseMove,
      onMouseUp,
    },
    zoomIn,
    zoomOut,
    resetView,
    centerOnPoint,
    isMobile,
  };
}

export default useMobileTreeGestures;
