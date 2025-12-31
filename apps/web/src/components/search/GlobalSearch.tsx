import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, Circle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface SearchResult {
  type: 'map' | 'node';
  id: string;
  mapId: string;
  mapTitle: string;
  text: string;
  matchedField: string;
  excerpt: string;
  score: number;
  createdAt: string;
  updatedAt: string;
}

interface SearchResponse {
  success: boolean;
  data: SearchResult[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  query: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setLoading(true);

      try {
        const response = await fetch(
          `${API_URL}/api/search?q=${encodeURIComponent(query)}&limit=20`,
          {
            credentials: 'include',
            signal: abortControllerRef.current.signal,
          }
        );

        if (response.ok) {
          const data: SearchResponse = await response.json();
          setResults(data.data);
          setSelectedIndex(0);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Search failed:', error);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelectResult(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [results, selectedIndex, onOpenChange]
  );

  const handleSelectResult = (result: SearchResult) => {
    onOpenChange(false);
    // Navigate to the map, potentially focusing on the node
    if (result.type === 'node') {
      navigate(`/map/${result.mapId}?nodeId=${result.id}`);
    } else {
      navigate(`/map/${result.mapId}`);
    }
  };

  // Highlight matching text in excerpt
  const highlightMatch = (text: string, searchQuery: string) => {
    const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    let result = text;

    for (const term of terms) {
      const regex = new RegExp(`(${term})`, 'gi');
      result = result.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 rounded px-0.5">$1</mark>');
    }

    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Search modal */}
      <div className="absolute left-1/2 top-[15%] -translate-x-1/2 w-full max-w-2xl bg-background rounded-xl shadow-2xl border border-border overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search maps and nodes..."
            className="flex-1 border-none bg-transparent focus-visible:ring-0 text-lg"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query && results.length === 0 && !loading && (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="divide-y divide-border">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}-${result.matchedField}`}
                  onClick={() => handleSelectResult(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors',
                    index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'mt-0.5 p-1.5 rounded shrink-0',
                      result.type === 'map' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                    )}
                  >
                    {result.type === 'map' ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {result.type === 'map' ? result.mapTitle : highlightMatch(result.text, query)}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded shrink-0',
                          result.type === 'map' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        )}
                      >
                        {result.type === 'map' ? 'Map' : 'Node'}
                      </span>
                    </div>

                    {/* Excerpt */}
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {result.type === 'node' ? (
                        <>
                          in <span className="font-medium">{result.mapTitle}</span>
                        </>
                      ) : result.matchedField === 'description' ? (
                        highlightMatch(result.excerpt, query)
                      ) : (
                        highlightMatch(result.excerpt, query)
                      )}
                    </p>

                    {/* Meta */}
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {formatDistanceToNow(new Date(result.updatedAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}

          {/* Keyboard hints */}
          {results.length > 0 && (
            <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground flex items-center gap-4">
              <span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono ml-1">↓</kbd>
                <span className="ml-1">to navigate</span>
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Enter</kbd>
                <span className="ml-1">to select</span>
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Esc</kbd>
                <span className="ml-1">to close</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to trigger global search with keyboard shortcut
 */
export function useGlobalSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
}
