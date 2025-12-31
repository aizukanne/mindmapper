import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  previousState: unknown;
  newState: unknown;
  entityType: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  key: string;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Computes the diff between two objects and returns a list of changes
 */
function computeObjectDiff(
  prev: Record<string, unknown> | null,
  next: Record<string, unknown> | null
): DiffLine[] {
  const lines: DiffLine[] = [];
  const allKeys = new Set([
    ...Object.keys(prev || {}),
    ...Object.keys(next || {}),
  ]);

  for (const key of allKeys) {
    const prevValue = prev?.[key];
    const nextValue = next?.[key];

    if (prevValue === undefined && nextValue !== undefined) {
      lines.push({ type: 'added', key, newValue: nextValue });
    } else if (prevValue !== undefined && nextValue === undefined) {
      lines.push({ type: 'removed', key, oldValue: prevValue });
    } else if (JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
      lines.push({ type: 'modified', key, oldValue: prevValue, newValue: nextValue });
    } else {
      lines.push({ type: 'unchanged', key, oldValue: prevValue, newValue: nextValue });
    }
  }

  // Sort: modified/added/removed first, then unchanged
  return lines.sort((a, b) => {
    const order = { modified: 0, added: 1, removed: 2, unchanged: 3 };
    return order[a.type] - order[b.type];
  });
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Get a human-readable label for a property key
 */
function getPropertyLabel(key: string, entityType: string): string {
  const labels: Record<string, Record<string, string>> = {
    NODE: {
      text: 'Text',
      type: 'Node Type',
      positionX: 'X Position',
      positionY: 'Y Position',
      width: 'Width',
      height: 'Height',
      isCollapsed: 'Collapsed',
      parentId: 'Parent Node',
      style: 'Styling',
      metadata: 'Metadata',
    },
    CONNECTION: {
      sourceNodeId: 'Source Node',
      targetNodeId: 'Target Node',
      type: 'Connection Type',
      label: 'Label',
      style: 'Styling',
    },
    MAP: {
      title: 'Title',
      description: 'Description',
      isPublic: 'Public',
      isFavorite: 'Favorite',
      settings: 'Settings',
    },
  };

  return labels[entityType]?.[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

/**
 * Renders a visual diff between two states
 */
export function DiffViewer({ previousState, newState, entityType }: DiffViewerProps) {
  const diffLines = useMemo(() => {
    const prev = previousState as Record<string, unknown> | null;
    const next = newState as Record<string, unknown> | null;
    return computeObjectDiff(prev, next);
  }, [previousState, newState]);

  // Filter out unchanged lines that are not interesting (like IDs)
  const interestingDiffs = diffLines.filter(
    (line) => line.type !== 'unchanged' || !['id', 'mindMapId', 'createdAt', 'updatedAt'].includes(line.key)
  );

  // Show only changed lines by default, but show all if no changes
  const hasChanges = interestingDiffs.some((line) => line.type !== 'unchanged');
  const displayLines = hasChanges
    ? interestingDiffs.filter((line) => line.type !== 'unchanged')
    : interestingDiffs.slice(0, 5); // Show first 5 unchanged if no changes

  if (displayLines.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        No significant changes detected
      </div>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      {displayLines.map((line, index) => (
        <div
          key={`${line.key}-${index}`}
          className={cn(
            'rounded p-2 border',
            line.type === 'added' && 'bg-green-50 border-green-200',
            line.type === 'removed' && 'bg-red-50 border-red-200',
            line.type === 'modified' && 'bg-amber-50 border-amber-200',
            line.type === 'unchanged' && 'bg-gray-50 border-gray-200'
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-medium',
                line.type === 'added' && 'bg-green-200 text-green-800',
                line.type === 'removed' && 'bg-red-200 text-red-800',
                line.type === 'modified' && 'bg-amber-200 text-amber-800',
                line.type === 'unchanged' && 'bg-gray-200 text-gray-600'
              )}
            >
              {line.type === 'added' && '+ Added'}
              {line.type === 'removed' && '− Removed'}
              {line.type === 'modified' && '~ Modified'}
              {line.type === 'unchanged' && '= Unchanged'}
            </span>
            <span className="font-medium text-gray-700">
              {getPropertyLabel(line.key, entityType)}
            </span>
          </div>

          <div className="pl-2 space-y-1">
            {line.type === 'removed' && (
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-mono shrink-0">−</span>
                <span className="text-red-700 font-mono break-all whitespace-pre-wrap">
                  {formatValue(line.oldValue)}
                </span>
              </div>
            )}

            {line.type === 'added' && (
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-mono shrink-0">+</span>
                <span className="text-green-700 font-mono break-all whitespace-pre-wrap">
                  {formatValue(line.newValue)}
                </span>
              </div>
            )}

            {line.type === 'modified' && (
              <>
                <div className="flex items-start gap-2">
                  <span className="text-red-600 font-mono shrink-0">−</span>
                  <span className="text-red-700 font-mono break-all whitespace-pre-wrap line-through opacity-70">
                    {formatValue(line.oldValue)}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-mono shrink-0">+</span>
                  <span className="text-green-700 font-mono break-all whitespace-pre-wrap">
                    {formatValue(line.newValue)}
                  </span>
                </div>
              </>
            )}

            {line.type === 'unchanged' && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 font-mono shrink-0">=</span>
                <span className="text-gray-500 font-mono break-all whitespace-pre-wrap">
                  {formatValue(line.newValue)}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}

      {hasChanges && interestingDiffs.filter((l) => l.type === 'unchanged').length > 0 && (
        <div className="text-muted-foreground text-center py-1">
          {interestingDiffs.filter((l) => l.type === 'unchanged').length} unchanged properties hidden
        </div>
      )}
    </div>
  );
}
