import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionErrorToastProps {
  error: string | null;
  onDismiss: () => void;
}

export function ConnectionErrorToast({ error, onDismiss }: ConnectionErrorToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [error]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  if (!error) return null;

  return (
    <div
      className={cn(
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-50',
        'transition-all duration-300 ease-out',
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2 pointer-events-none'
      )}
      role="alert"
      aria-live="polite"
      data-testid="connection-error-toast"
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg shadow-lg max-w-md">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <p className="text-sm text-red-700 flex-1" data-testid="connection-error-message">
          {error}
        </p>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-red-100 transition-colors"
          aria-label="Dismiss error"
          data-testid="dismiss-connection-error"
        >
          <X className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
  );
}
