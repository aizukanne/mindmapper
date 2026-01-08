import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutCategory {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const shortcutCategories: ShortcutCategory[] = [
  {
    title: 'Node Operations',
    shortcuts: [
      { keys: ['Tab'], description: 'Add child node' },
      { keys: ['Enter'], description: 'Add sibling node' },
      { keys: ['Delete', 'Backspace'], description: 'Delete selected node' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate node' },
    ],
  },
  {
    title: 'Navigation & View',
    shortcuts: [
      { keys: ['Space'], description: 'Pan mode (hold)' },
      { keys: ['P'], description: 'Toggle pan mode' },
      { keys: ['+', '='], description: 'Zoom in' },
      { keys: ['-'], description: 'Zoom out' },
      { keys: ['Ctrl', '0'], description: 'Fit view' },
      { keys: ['M'], description: 'Toggle minimap' },
    ],
  },
  {
    title: 'Edit History',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (alternate)' },
    ],
  },
  {
    title: 'Search & Help',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open global search' },
      { keys: ['Shift', '?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close modal / Cancel' },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-md shadow-sm min-w-[24px] text-center">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  // Detect if Mac for display purposes
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const formatKey = (key: string) => {
    if (key === 'Ctrl') return modKey;
    if (key === 'Shift') return isMac ? '⇧' : 'Shift';
    if (key === 'Delete') return isMac ? '⌫' : 'Del';
    if (key === 'Backspace') return '⌫';
    if (key === 'Enter') return '↵';
    if (key === 'Tab') return '⇥';
    if (key === 'Space') return '␣';
    if (key === 'Esc') return 'Esc';
    return key;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick actions to boost your productivity
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {shortcutCategories.map((category) => (
            <div key={category.title}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {category.title}
              </h3>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center">
                          <Kbd>{formatKey(key)}</Kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="mx-0.5 text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Press <Kbd>Shift</Kbd> + <Kbd>?</Kbd> anytime to show this help
        </div>
      </DialogContent>
    </Dialog>
  );
}
