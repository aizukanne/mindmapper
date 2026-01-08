import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

const BottomSheet = DialogPrimitive.Root;
const BottomSheetTrigger = DialogPrimitive.Trigger;
const BottomSheetClose = DialogPrimitive.Close;
const BottomSheetPortal = DialogPrimitive.Portal;

const BottomSheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
BottomSheetOverlay.displayName = 'BottomSheetOverlay';

interface BottomSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Height of the sheet - 'auto', 'sm', 'md', 'lg', or custom value */
  size?: 'auto' | 'sm' | 'md' | 'lg';
  /** Show drag handle indicator */
  showHandle?: boolean;
}

const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  BottomSheetContentProps
>(({ className, children, size = 'auto', showHandle = true, ...props }, ref) => (
  <BottomSheetPortal>
    <BottomSheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50',
        'bg-background border-t border-border rounded-t-2xl shadow-lg',
        'safe-area-inset-bottom',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        'duration-300 ease-out',
        // Size variants
        size === 'sm' && 'max-h-[30vh]',
        size === 'md' && 'max-h-[50vh]',
        size === 'lg' && 'max-h-[75vh]',
        size === 'auto' && 'max-h-[85vh]',
        className
      )}
      {...props}
    >
      {/* Drag handle indicator */}
      {showHandle && (
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
      )}
      <div className="overflow-y-auto px-4 pb-4">{children}</div>
    </DialogPrimitive.Content>
  </BottomSheetPortal>
));
BottomSheetContent.displayName = 'BottomSheetContent';

const BottomSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
);
BottomSheetHeader.displayName = 'BottomSheetHeader';

const BottomSheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
BottomSheetTitle.displayName = 'BottomSheetTitle';

const BottomSheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
BottomSheetDescription.displayName = 'BottomSheetDescription';

/** Section component for grouping actions */
const BottomSheetSection = ({
  className,
  title,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { title?: string }) => (
  <div className={cn('py-2', className)} {...props}>
    {title && (
      <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
        {title}
      </h4>
    )}
    {children}
  </div>
);
BottomSheetSection.displayName = 'BottomSheetSection';

/** Action button for bottom sheet */
interface BottomSheetActionProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  destructive?: boolean;
}

const BottomSheetAction = React.forwardRef<
  HTMLButtonElement,
  BottomSheetActionProps
>(({ className, icon, label, description, destructive, disabled, ...props }, ref) => (
  <button
    ref={ref}
    disabled={disabled}
    className={cn(
      'flex items-center w-full gap-3 px-3 py-3 rounded-lg',
      'transition-colors duration-150',
      'hover:bg-accent focus:bg-accent focus:outline-none',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
      destructive && 'text-destructive hover:bg-destructive/10',
      className
    )}
    {...props}
  >
    {icon && (
      <span
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-lg bg-muted',
          destructive && 'bg-destructive/10'
        )}
      >
        {icon}
      </span>
    )}
    <div className="flex flex-col items-start text-left">
      <span className="font-medium">{label}</span>
      {description && (
        <span className="text-xs text-muted-foreground">{description}</span>
      )}
    </div>
  </button>
));
BottomSheetAction.displayName = 'BottomSheetAction';

export {
  BottomSheet,
  BottomSheetTrigger,
  BottomSheetClose,
  BottomSheetPortal,
  BottomSheetOverlay,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetSection,
  BottomSheetAction,
};
