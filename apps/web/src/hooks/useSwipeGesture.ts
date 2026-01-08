import { useRef, useEffect, useCallback } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance for swipe
  restraint?: number; // Maximum distance in perpendicular direction
  allowedTime?: number; // Maximum time for swipe
  onSwipeProgress?: (progress: number, direction: 'left' | 'right' | 'up' | 'down') => void;
}

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  isTracking: boolean;
}

export function useSwipeGesture<T extends HTMLElement = HTMLElement>(
  options: SwipeGestureOptions = {}
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    restraint = 100,
    allowedTime = 500,
    onSwipeProgress,
  } = options;

  const elementRef = useRef<T>(null);
  const swipeStateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isTracking: false,
  });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    swipeStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isTracking: true,
    };
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!swipeStateRef.current.isTracking || !onSwipeProgress) return;

      const touch = e.touches[0];
      const diffX = touch.clientX - swipeStateRef.current.startX;
      const diffY = touch.clientY - swipeStateRef.current.startY;

      // Determine primary direction
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        const progress = Math.min(Math.abs(diffX) / threshold, 1);
        const direction = diffX > 0 ? 'right' : 'left';
        onSwipeProgress(progress, direction);
      } else {
        // Vertical swipe
        const progress = Math.min(Math.abs(diffY) / threshold, 1);
        const direction = diffY > 0 ? 'down' : 'up';
        onSwipeProgress(progress, direction);
      }
    },
    [onSwipeProgress, threshold]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!swipeStateRef.current.isTracking) return;

      const touch = e.changedTouches[0];
      const { startX, startY, startTime } = swipeStateRef.current;

      const diffX = touch.clientX - startX;
      const diffY = touch.clientY - startY;
      const elapsedTime = Date.now() - startTime;

      // Reset tracking
      swipeStateRef.current.isTracking = false;

      // Check if swipe was fast enough
      if (elapsedTime > allowedTime) return;

      // Horizontal swipe
      if (Math.abs(diffX) >= threshold && Math.abs(diffY) <= restraint) {
        if (diffX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (diffX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }

      // Vertical swipe
      if (Math.abs(diffY) >= threshold && Math.abs(diffX) <= restraint) {
        if (diffY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (diffY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, restraint, allowedTime]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return elementRef;
}

// Hook for edge swipe detection (swipe from screen edge)
export function useEdgeSwipe(options: {
  side: 'left' | 'right';
  onSwipe: () => void;
  edgeThreshold?: number; // How close to edge touch must start
  swipeThreshold?: number; // How far to swipe
}) {
  const {
    side,
    onSwipe,
    edgeThreshold = 20,
    swipeThreshold = 50,
  } = options;

  const swipeStateRef = useRef({
    startX: 0,
    startY: 0,
    isEdgeSwipe: false,
  });

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const windowWidth = window.innerWidth;

      // Check if touch started from the edge
      const isFromLeftEdge = side === 'left' && touch.clientX < edgeThreshold;
      const isFromRightEdge = side === 'right' && touch.clientX > windowWidth - edgeThreshold;

      if (isFromLeftEdge || isFromRightEdge) {
        swipeStateRef.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          isEdgeSwipe: true,
        };
      } else {
        swipeStateRef.current.isEdgeSwipe = false;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!swipeStateRef.current.isEdgeSwipe) return;

      const touch = e.changedTouches[0];
      const { startX, startY } = swipeStateRef.current;

      const diffX = touch.clientX - startX;
      const diffY = touch.clientY - startY;

      // Check if horizontal swipe is dominant
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) >= swipeThreshold) {
        // Left side: must swipe right
        if (side === 'left' && diffX > 0) {
          onSwipe();
        }
        // Right side: must swipe left
        if (side === 'right' && diffX < 0) {
          onSwipe();
        }
      }

      swipeStateRef.current.isEdgeSwipe = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [side, onSwipe, edgeThreshold, swipeThreshold]);
}
