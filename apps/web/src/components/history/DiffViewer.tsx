import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Columns, Rows } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type DiffViewMode = 'inline' | 'side-by-side';

interface DiffViewerProps {
  previousState: unknown;
  newState: unknown;
  entityType: string;
  viewMode?: DiffViewMode;
  showViewToggle?: boolean;
  defaultCollapsed?: boolean;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  key: string;
  oldValue?: unknown;
  newValue?: unknown;
  nestedDiff?: DiffLine[];
}

/**
 * Computes the diff between two objects and returns a list of changes
 * Supports nested object diffing for detailed property change visualization
 */
function computeObjectDiff(
  prev: Record<string, unknown> | null,
  next: Record<string, unknown> | null,
  depth: number = 0
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
      // Check if both values are objects (not arrays) for nested diff
      const isPrevObject = prevValue !== null && typeof prevValue === 'object' && !Array.isArray(prevValue);
      const isNextObject = nextValue !== null && typeof nextValue === 'object' && !Array.isArray(nextValue);

      if (isPrevObject && isNextObject && depth < 2) {
        // Compute nested diff for objects
        const nestedDiff = computeObjectDiff(
          prevValue as Record<string, unknown>,
          nextValue as Record<string, unknown>,
          depth + 1
        );
        lines.push({ type: 'modified', key, oldValue: prevValue, newValue: nextValue, nestedDiff });
      } else {
        lines.push({ type: 'modified', key, oldValue: prevValue, newValue: nextValue });
      }
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
 * Format a value for display with type-aware formatting
 */
function formatValue(value: unknown, key?: string): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    // Add units for known properties
    if (key && ['fontSize', 'borderWidth', 'borderRadius', 'width', 'height'].includes(key)) {
      return `${value}px`;
    }
    if (key && ['positionX', 'positionY'].includes(key)) {
      return value.toFixed(0);
    }
    return String(value);
  }
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
 * Check if a value is a color (hex, rgb, hsl)
 */
function isColorValue(value: unknown, key?: string): boolean {
  if (typeof value !== 'string') return false;
  const colorKeys = ['color', 'backgroundColor', 'borderColor', 'textColor', 'fill', 'stroke'];
  if (key && colorKeys.some(ck => key.toLowerCase().includes(ck.toLowerCase()))) {
    return true;
  }
  // Check for hex color pattern
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(value) || /^rgb/.test(value) || /^hsl/.test(value);
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
      sortOrder: 'Sort Order',
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
    PERSON: {
      firstName: 'First Name',
      middleName: 'Middle Name',
      lastName: 'Last Name',
      maidenName: 'Maiden Name',
      suffix: 'Suffix',
      nickname: 'Nickname',
      gender: 'Gender',
      birthDate: 'Birth Date',
      birthPlace: 'Birth Place',
      deathDate: 'Death Date',
      deathPlace: 'Death Place',
      isLiving: 'Living',
      biography: 'Biography',
      occupation: 'Occupation',
      education: 'Education',
      privacy: 'Privacy',
      profilePhoto: 'Profile Photo',
    },
    RELATIONSHIP: {
      type: 'Relationship Type',
      person1Id: 'Person 1',
      person2Id: 'Person 2',
    },
    STYLE: {
      backgroundColor: 'Background Color',
      borderColor: 'Border Color',
      borderWidth: 'Border Width',
      borderRadius: 'Border Radius',
      textColor: 'Text Color',
      fontSize: 'Font Size',
      fontWeight: 'Font Weight',
      fontStyle: 'Font Style',
      icon: 'Icon',
      shape: 'Shape',
    },
  };

  return labels[entityType]?.[key] || labels.STYLE?.[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

/**
 * Color swatch component for displaying color values
 */
function ColorSwatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-4 h-4 rounded border border-gray-300 mr-1.5 align-middle"
      style={{ backgroundColor: color }}
      title={color}
    />
  );
}

/**
 * Inline diff line component
 */
function InlineDiffLine({
  line,
  entityType,
  isNested = false,
}: {
  line: DiffLine;
  entityType: string;
  isNested?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasNestedDiff = line.nestedDiff && line.nestedDiff.length > 0;

  return (
    <div
      className={cn(
        'rounded border',
        isNested ? 'p-1.5 text-[10px]' : 'p-2',
        line.type === 'added' && 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
        line.type === 'removed' && 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
        line.type === 'modified' && 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
        line.type === 'unchanged' && 'bg-gray-50 border-gray-200 dark:bg-gray-800/30 dark:border-gray-700'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {hasNestedDiff && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-black/5 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-gray-500" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-500" />
            )}
          </button>
        )}
        <span
          className={cn(
            'px-1.5 py-0.5 rounded font-medium',
            isNested ? 'text-[8px]' : 'text-[10px]',
            line.type === 'added' && 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200',
            line.type === 'removed' && 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200',
            line.type === 'modified' && 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200',
            line.type === 'unchanged' && 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          )}
        >
          {line.type === 'added' && '+ Added'}
          {line.type === 'removed' && '− Removed'}
          {line.type === 'modified' && '~ Modified'}
          {line.type === 'unchanged' && '= Unchanged'}
        </span>
        <span className={cn('font-medium text-gray-700 dark:text-gray-200', isNested && 'text-[10px]')}>
          {getPropertyLabel(line.key, entityType)}
        </span>
      </div>

      {hasNestedDiff && isExpanded ? (
        <div className="pl-4 space-y-1 mt-1">
          {line.nestedDiff!.filter(l => l.type !== 'unchanged').map((nestedLine, idx) => (
            <InlineDiffLine
              key={`${nestedLine.key}-${idx}`}
              line={nestedLine}
              entityType="STYLE"
              isNested
            />
          ))}
        </div>
      ) : (
        <div className={cn('space-y-1', isNested ? 'pl-1' : 'pl-2')}>
          {line.type === 'removed' && (
            <div className="flex items-start gap-2">
              <span className="text-red-600 font-mono shrink-0">−</span>
              <span className="text-red-700 dark:text-red-400 font-mono break-all whitespace-pre-wrap">
                {isColorValue(line.oldValue, line.key) && <ColorSwatch color={line.oldValue as string} />}
                {formatValue(line.oldValue, line.key)}
              </span>
            </div>
          )}

          {line.type === 'added' && (
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-mono shrink-0">+</span>
              <span className="text-green-700 dark:text-green-400 font-mono break-all whitespace-pre-wrap">
                {isColorValue(line.newValue, line.key) && <ColorSwatch color={line.newValue as string} />}
                {formatValue(line.newValue, line.key)}
              </span>
            </div>
          )}

          {line.type === 'modified' && !hasNestedDiff && (
            <>
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-mono shrink-0">−</span>
                <span className="text-red-700 dark:text-red-400 font-mono break-all whitespace-pre-wrap line-through opacity-70">
                  {isColorValue(line.oldValue, line.key) && <ColorSwatch color={line.oldValue as string} />}
                  {formatValue(line.oldValue, line.key)}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-mono shrink-0">+</span>
                <span className="text-green-700 dark:text-green-400 font-mono break-all whitespace-pre-wrap">
                  {isColorValue(line.newValue, line.key) && <ColorSwatch color={line.newValue as string} />}
                  {formatValue(line.newValue, line.key)}
                </span>
              </div>
            </>
          )}

          {line.type === 'unchanged' && (
            <div className="flex items-start gap-2">
              <span className="text-gray-400 font-mono shrink-0">=</span>
              <span className="text-gray-500 dark:text-gray-400 font-mono break-all whitespace-pre-wrap">
                {isColorValue(line.newValue, line.key) && <ColorSwatch color={line.newValue as string} />}
                {formatValue(line.newValue, line.key)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Side-by-side diff view component
 */
function SideBySideDiffView({
  diffLines,
  entityType,
}: {
  diffLines: DiffLine[];
  entityType: string;
}) {
  return (
    <div className="border rounded-lg overflow-hidden" data-testid="diff-side-by-side">
      {/* Header */}
      <div className="grid grid-cols-2 gap-0 bg-gray-100 dark:bg-gray-800 border-b">
        <div className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 border-r border-gray-200 dark:border-gray-700">
          Previous
        </div>
        <div className="px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400">
          Current
        </div>
      </div>

      {/* Diff rows */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {diffLines.map((line, index) => (
          <div
            key={`${line.key}-${index}`}
            className={cn(
              'grid grid-cols-2 gap-0',
              line.type === 'added' && 'bg-green-50/50 dark:bg-green-950/20',
              line.type === 'removed' && 'bg-red-50/50 dark:bg-red-950/20',
              line.type === 'modified' && 'bg-amber-50/50 dark:bg-amber-950/20',
              line.type === 'unchanged' && 'bg-gray-50/50 dark:bg-gray-800/20'
            )}
          >
            {/* Left side (previous) */}
            <div className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 min-h-[40px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-xs text-gray-700 dark:text-gray-300">
                  {getPropertyLabel(line.key, entityType)}
                </span>
                {(line.type === 'removed' || line.type === 'modified') && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-300">
                    {line.type === 'removed' ? 'removed' : 'old'}
                  </span>
                )}
              </div>
              {(line.type === 'removed' || line.type === 'modified' || line.type === 'unchanged') && (
                <div className={cn(
                  'font-mono text-xs break-all whitespace-pre-wrap',
                  line.type === 'removed' && 'text-red-600 dark:text-red-400 line-through',
                  line.type === 'modified' && 'text-red-600 dark:text-red-400 line-through opacity-70',
                  line.type === 'unchanged' && 'text-gray-500 dark:text-gray-400'
                )}>
                  {isColorValue(line.oldValue, line.key) && <ColorSwatch color={line.oldValue as string} />}
                  {formatValue(line.oldValue, line.key)}
                </div>
              )}
              {line.type === 'added' && (
                <div className="text-gray-400 dark:text-gray-500 text-xs italic">—</div>
              )}
            </div>

            {/* Right side (new) */}
            <div className="px-3 py-2 min-h-[40px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-xs text-gray-700 dark:text-gray-300">
                  {getPropertyLabel(line.key, entityType)}
                </span>
                {(line.type === 'added' || line.type === 'modified') && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-300">
                    {line.type === 'added' ? 'added' : 'new'}
                  </span>
                )}
              </div>
              {(line.type === 'added' || line.type === 'modified' || line.type === 'unchanged') && (
                <div className={cn(
                  'font-mono text-xs break-all whitespace-pre-wrap',
                  line.type === 'added' && 'text-green-600 dark:text-green-400',
                  line.type === 'modified' && 'text-green-600 dark:text-green-400',
                  line.type === 'unchanged' && 'text-gray-500 dark:text-gray-400'
                )}>
                  {isColorValue(line.newValue, line.key) && <ColorSwatch color={line.newValue as string} />}
                  {formatValue(line.newValue, line.key)}
                </div>
              )}
              {line.type === 'removed' && (
                <div className="text-gray-400 dark:text-gray-500 text-xs italic">—</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * View mode toggle component
 */
function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: DiffViewMode;
  onChange: (mode: DiffViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 mb-2" data-testid="diff-view-toggle">
      <Button
        variant={mode === 'inline' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => onChange('inline')}
        title="Inline view"
        data-testid="diff-view-inline-btn"
      >
        <Rows className="h-3.5 w-3.5 mr-1" />
        Inline
      </Button>
      <Button
        variant={mode === 'side-by-side' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => onChange('side-by-side')}
        title="Side by side view"
        data-testid="diff-view-sidebyside-btn"
      >
        <Columns className="h-3.5 w-3.5 mr-1" />
        Side by Side
      </Button>
    </div>
  );
}

/**
 * Renders a visual diff between two states with support for inline and side-by-side views
 */
export function DiffViewer({
  previousState,
  newState,
  entityType,
  viewMode: initialViewMode = 'inline',
  showViewToggle = true,
  defaultCollapsed = false,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<DiffViewMode>(initialViewMode);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const diffLines = useMemo(() => {
    const prev = previousState as Record<string, unknown> | null;
    const next = newState as Record<string, unknown> | null;
    return computeObjectDiff(prev, next);
  }, [previousState, newState]);

  // Filter out unchanged lines that are not interesting (like IDs)
  const interestingDiffs = diffLines.filter(
    (line) => line.type !== 'unchanged' || !['id', 'mindMapId', 'createdAt', 'updatedAt', 'treeId'].includes(line.key)
  );

  // Show only changed lines by default, but show all if no changes
  const hasChanges = interestingDiffs.some((line) => line.type !== 'unchanged');
  const displayLines = hasChanges
    ? interestingDiffs.filter((line) => line.type !== 'unchanged')
    : interestingDiffs.slice(0, 5); // Show first 5 unchanged if no changes

  const unchangedCount = interestingDiffs.filter((l) => l.type === 'unchanged').length;

  if (displayLines.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic" data-testid="diff-viewer-empty">
        No significant changes detected
      </div>
    );
  }

  return (
    <div className="text-xs" data-testid="diff-viewer">
      {/* View mode toggle */}
      {showViewToggle && (
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      )}

      {/* Collapsible header */}
      {defaultCollapsed && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          {displayLines.length} change{displayLines.length !== 1 ? 's' : ''}
        </button>
      )}

      {/* Diff content */}
      {!isCollapsed && (
        <>
          {viewMode === 'inline' ? (
            <div className="space-y-2" data-testid="diff-inline">
              {displayLines.map((line, index) => (
                <InlineDiffLine
                  key={`${line.key}-${index}`}
                  line={line}
                  entityType={entityType}
                />
              ))}
            </div>
          ) : (
            <SideBySideDiffView diffLines={displayLines} entityType={entityType} />
          )}

          {/* Unchanged count */}
          {hasChanges && unchangedCount > 0 && (
            <div className="text-muted-foreground text-center py-2" data-testid="diff-unchanged-count">
              {unchangedCount} unchanged propert{unchangedCount !== 1 ? 'ies' : 'y'} hidden
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Export types and utilities for use in other components
export { computeObjectDiff, formatValue, getPropertyLabel };
