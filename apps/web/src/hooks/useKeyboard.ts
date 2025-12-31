import { useEffect, useCallback, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useMapStore } from '@/stores/mapStore';

interface UseKeyboardShortcutsOptions {
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onShowHelp?: () => void;
}

interface UseKeyboardShortcutsReturn {
  isPanMode: boolean;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}): UseKeyboardShortcutsReturn {
  const { undo, redo, canUndo, canRedo, onShowHelp } = options;
  const { selectedNodeId, addNode, deleteNode, duplicateNode, nodes } = useMapStore();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [isPanMode, setIsPanMode] = useState(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      switch (event.key) {
        case 'Tab':
          // Add child node
          event.preventDefault();
          if (selectedNodeId) {
            const selectedNode = nodes.find((n) => n.id === selectedNodeId);
            if (selectedNode) {
              const newPosition = {
                x: selectedNode.position.x + 200,
                y: selectedNode.position.y,
              };
              addNode(selectedNodeId, newPosition);
            }
          }
          break;

        case 'Enter':
          // Add sibling node
          event.preventDefault();
          if (selectedNodeId) {
            const selectedNode = nodes.find((n) => n.id === selectedNodeId);
            if (selectedNode && selectedNode.data.parentId) {
              const newPosition = {
                x: selectedNode.position.x,
                y: selectedNode.position.y + 80,
              };
              addNode(selectedNode.data.parentId, newPosition);
            }
          }
          break;

        case 'Delete':
        case 'Backspace':
          // Delete selected node (not root)
          if (selectedNodeId) {
            const selectedNode = nodes.find((n) => n.id === selectedNodeId);
            if (selectedNode && selectedNode.data.type !== 'ROOT') {
              event.preventDefault();
              deleteNode(selectedNodeId);
            }
          }
          break;

        case 'd':
        case 'D':
          // Duplicate node (Ctrl+D / Cmd+D)
          if (modKey && selectedNodeId) {
            event.preventDefault();
            duplicateNode(selectedNodeId);
          }
          break;

        case ' ':
          // Space - Toggle pan mode
          event.preventDefault();
          setIsPanMode(true);
          break;

        case '=':
        case '+':
          // Zoom in (with or without modifier for convenience)
          event.preventDefault();
          zoomIn();
          break;

        case '-':
          // Zoom out (with or without modifier for convenience)
          if (!event.target || !(event.target as HTMLElement).closest('input')) {
            event.preventDefault();
            zoomOut();
          }
          break;

        case '0':
          // Fit view
          if (modKey) {
            event.preventDefault();
            fitView({ padding: 0.2 });
          }
          break;

        case 'z':
          // Undo (Ctrl+Z / Cmd+Z)
          if (modKey && !event.shiftKey && undo && canUndo) {
            event.preventDefault();
            undo();
          }
          // Redo (Ctrl+Shift+Z / Cmd+Shift+Z)
          if (modKey && event.shiftKey && redo && canRedo) {
            event.preventDefault();
            redo();
          }
          break;

        case 'y':
          // Redo (Ctrl+Y / Cmd+Y) - Windows convention
          if (modKey && redo && canRedo) {
            event.preventDefault();
            redo();
          }
          break;

        case '?':
          // Show keyboard shortcuts help
          if (event.shiftKey && onShowHelp) {
            event.preventDefault();
            onShowHelp();
          }
          break;

        case 'Escape':
          // Exit pan mode
          setIsPanMode(false);
          break;

        default:
          break;
      }
    },
    [selectedNodeId, nodes, addNode, deleteNode, duplicateNode, fitView, zoomIn, zoomOut, undo, redo, canUndo, canRedo, onShowHelp]
  );

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.key === ' ') {
      setIsPanMode(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return { isPanMode };
}
