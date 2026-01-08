import { useEffect, useRef, useCallback, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  enableEdgeSwipe?: boolean;
  enableSwipeToClose?: boolean;
}

export function MobileSidebarDrawer({
  isOpen,
  onClose,
  onOpen,
  title = 'Menu',
  children,
  className,
  enableEdgeSwipe = true,
  enableSwipeToClose = true,
}: MobileSidebarDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0, isTracking: false });
  const translateXRef = useRef(0);

  // Handle swipe to close on the drawer itself
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enableSwipeToClose) return;

      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        isTracking: true,
      };
      translateXRef.current = 0;
    },
    [enableSwipeToClose]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enableSwipeToClose || !touchStartRef.current.isTracking) return;

      const touch = e.touches[0];
      const diffX = touch.clientX - touchStartRef.current.x;
      const diffY = touch.clientY - touchStartRef.current.y;

      // Only track horizontal swipes (left direction for closing)
      if (Math.abs(diffX) > Math.abs(diffY) && diffX < 0) {
        e.preventDefault();
        translateXRef.current = diffX;

        // Apply transform directly for smooth tracking
        if (drawerRef.current) {
          const clampedDiff = Math.max(diffX, -280); // Don't allow more than drawer width
          drawerRef.current.style.transform = `translateX(${clampedDiff}px)`;
          drawerRef.current.style.transition = 'none';
        }

        // Update backdrop opacity
        if (backdropRef.current) {
          const progress = Math.abs(diffX) / 280;
          backdropRef.current.style.opacity = String(Math.max(0, 1 - progress));
        }
      }
    },
    [enableSwipeToClose]
  );

  const handleTouchEnd = useCallback(() => {
    if (!enableSwipeToClose || !touchStartRef.current.isTracking) return;

    touchStartRef.current.isTracking = false;

    // If swiped more than 30% of drawer width, close it
    if (translateXRef.current < -84) {
      onClose();
    }

    // Reset styles
    if (drawerRef.current) {
      drawerRef.current.style.transform = '';
      drawerRef.current.style.transition = '';
    }
    if (backdropRef.current) {
      backdropRef.current.style.opacity = '';
    }

    translateXRef.current = 0;
  }, [enableSwipeToClose, onClose]);

  // Edge swipe to open - listen on document level
  useEffect(() => {
    if (!enableEdgeSwipe || isOpen) return;

    let startX = 0;
    let startY = 0;
    let isEdgeSwipe = false;

    const handleDocTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Check if touch started from left edge (within 20px)
      if (touch.clientX < 20) {
        startX = touch.clientX;
        startY = touch.clientY;
        isEdgeSwipe = true;
      }
    };

    const handleDocTouchEnd = (e: TouchEvent) => {
      if (!isEdgeSwipe) return;

      const touch = e.changedTouches[0];
      const diffX = touch.clientX - startX;
      const diffY = touch.clientY - startY;

      // Swipe right from left edge
      if (diffX > 50 && Math.abs(diffX) > Math.abs(diffY)) {
        onOpen?.();
      }

      isEdgeSwipe = false;
    };

    document.addEventListener('touchstart', handleDocTouchStart, { passive: true });
    document.addEventListener('touchend', handleDocTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleDocTouchStart);
      document.removeEventListener('touchend', handleDocTouchEnd);
    };
  }, [enableEdgeSwipe, isOpen, onOpen]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      // Focus the drawer when it opens
      drawerRef.current.focus();
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden',
          'transition-opacity duration-300 ease-in-out',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
        data-testid="sidebar-backdrop"
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'fixed inset-y-0 left-0 z-50 md:hidden',
          'w-[280px] max-w-[85vw]',
          'bg-background border-r border-border shadow-xl',
          'transform transition-transform duration-300 ease-out',
          'flex flex-col',
          'safe-left safe-top safe-bottom',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="mobile-sidebar-drawer"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            aria-label="Close menu"
            data-testid="sidebar-close-button"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4" data-testid="sidebar-content">
          {children}
        </div>

        {/* Swipe indicator */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-muted-foreground/20 rounded-full" />
      </aside>
    </>
  );
}

export default MobileSidebarDrawer;
