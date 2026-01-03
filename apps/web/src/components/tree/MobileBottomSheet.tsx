import { useState, useRef, useEffect, useCallback } from 'react';
import { X, GripHorizontal } from 'lucide-react';

export type SheetHeight = 'closed' | 'peek' | 'half' | 'full';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  initialHeight?: SheetHeight;
  showHandle?: boolean;
  className?: string;
}

const HEIGHTS: Record<SheetHeight, number> = {
  closed: 0,
  peek: 15,   // 15% of viewport
  half: 50,   // 50% of viewport
  full: 90,   // 90% of viewport
};

export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  initialHeight = 'half',
  showHandle = true,
  className = '',
}: MobileBottomSheetProps) {
  const [height, setHeight] = useState<SheetHeight>(isOpen ? initialHeight : 'closed');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Update height when isOpen changes
  useEffect(() => {
    if (isOpen) {
      setHeight(initialHeight);
    } else {
      setHeight('closed');
    }
  }, [isOpen, initialHeight]);

  const getHeightPercent = useCallback(() => {
    const baseHeight = HEIGHTS[height];
    if (isDragging) {
      // Convert drag offset to percentage
      const viewportHeight = window.innerHeight;
      const offsetPercent = (dragOffset / viewportHeight) * 100;
      return Math.min(95, Math.max(0, baseHeight - offsetPercent));
    }
    return baseHeight;
  }, [height, isDragging, dragOffset]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Only allow dragging from the handle area
    if (!target.closest('[data-drag-handle]')) return;

    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    startHeightRef.current = getHeightPercent();
  }, [getHeightPercent]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    setDragOffset(diff);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    const currentHeight = getHeightPercent();
    setIsDragging(false);
    setDragOffset(0);

    // Snap to nearest height based on current position
    if (currentHeight < 10) {
      onClose();
    } else if (currentHeight < 30) {
      setHeight('peek');
    } else if (currentHeight < 70) {
      setHeight('half');
    } else {
      setHeight('full');
    }
  }, [isDragging, getHeightPercent, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  // Prevent scroll propagation
  const handleContentScroll = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const content = target.closest('[data-content]');
    if (content) {
      e.stopPropagation();
    }
  }, []);

  if (!isOpen && height === 'closed') {
    return null;
  }

  const heightPercent = getHeightPercent();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          heightPercent > 10 ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleBackdropClick}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl ${
          isDragging ? '' : 'transition-all duration-300 ease-out'
        } ${className}`}
        style={{
          height: `${heightPercent}vh`,
          touchAction: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        {showHandle && (
          <div
            data-drag-handle
            className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing"
          >
            <GripHorizontal className="w-8 h-1.5 text-gray-300 rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div
          data-content
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ maxHeight: `calc(${heightPercent}vh - ${title ? '100px' : '50px'})` }}
          onTouchMove={handleContentScroll}
        >
          {children}
        </div>
      </div>
    </>
  );
}

// Quick action button for bottom sheet
interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
}

export function QuickAction({ icon, label, onClick, variant = 'default' }: QuickActionProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    primary: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    danger: 'bg-red-100 text-red-700 hover:bg-red-200',
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 rounded-xl ${variantClasses[variant]} transition-colors`}
    >
      <div className="mb-2">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// Menu item for bottom sheet
interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  trailing?: React.ReactNode;
}

export function MenuItem({ icon, label, description, onClick, trailing }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <div className="font-medium text-gray-900">{label}</div>
        {description && <div className="text-sm text-gray-500">{description}</div>}
      </div>
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
    </button>
  );
}

export default MobileBottomSheet;
