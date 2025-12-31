import { useEffect, useRef, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

interface TouchPoint {
  x: number;
  y: number;
}

interface UseTouchGesturesOptions {
  enabled?: boolean;
}

export function useTouchGestures(options: UseTouchGesturesOptions = {}) {
  const { enabled = true } = options;
  const { setViewport, getViewport } = useReactFlow();

  const lastTouchesRef = useRef<TouchPoint[]>([]);
  const initialDistanceRef = useRef<number>(0);
  const initialZoomRef = useRef<number>(1);
  const lastPanRef = useRef<TouchPoint>({ x: 0, y: 0 });

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
        // Start pinch-to-zoom
        initialDistanceRef.current = getDistance(touches);
        initialZoomRef.current = getViewport().zoom;
        lastPanRef.current = getCenter(touches);
      } else if (touches.length === 1) {
        lastPanRef.current = touches[0];
      }
    },
    [enabled, getDistance, getCenter, getViewport]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touches: TouchPoint[] = Array.from(e.touches).map((t) => ({
        x: t.clientX,
        y: t.clientY,
      }));

      if (touches.length === 2 && initialDistanceRef.current > 0) {
        // Pinch-to-zoom
        e.preventDefault();

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
    [enabled, getDistance, getCenter, getViewport, setViewport]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

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
    [enabled]
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
}
