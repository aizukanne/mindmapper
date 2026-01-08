import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  FileText,
  Circle,
  Loader2,
  ArrowRight,
  Clock,
  Command,
  Plus,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Types
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

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'action' | 'navigation';
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

// Constants
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const RECENT_SEARCHES_KEY = 'mindmapper_recent_searches';
const MAX_RECENT_SEARCHES = 5;

// Helper functions for recent searches
function getRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load recent searches:', error);
  }
  return [];
}

function saveRecentSearch(query: string): void {
  try {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const searches = getRecentSearches();
    // Remove existing entry for this query if present
    const filtered = searches.filter((s) => s.query.toLowerCase() !== trimmedQuery.toLowerCase());
    // Add new entry at the beginning
    const updated = [{ query: trimmedQuery, timestamp: Date.now() }, ...filtered].slice(
      0,
      MAX_RECENT_SEARCHES
    );
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent search:', error);
  }
}

function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (error) {
    console.error('Failed to clear recent searches:', error);
  }
}

// Group results by type
interface CategorizedResults {
  maps: SearchResult[];
  nodes: SearchResult[];
}

function categorizeResults(results: SearchResult[]): CategorizedResults {
  return {
    maps: results.filter((r) => r.type === 'map'),
    nodes: results.filter((r) => r.type === 'node'),
  };
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Quick actions
  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'new-map',
        label: 'Create New Mind Map',
        description: 'Start with a blank canvas',
        icon: <Plus className="h-4 w-4" />,
        action: () => {
          onOpenChange(false);
          // Trigger new map creation by navigating to dashboard with create flag
          navigate('/?action=create');
        },
        category: 'action',
      },
      {
        id: 'dashboard',
        label: 'Go to Dashboard',
        description: 'View all your mind maps',
        icon: <Command className="h-4 w-4" />,
        action: () => {
          onOpenChange(false);
          navigate('/');
        },
        category: 'navigation',
      },
      {
        id: 'help',
        label: 'Keyboard Shortcuts',
        description: 'View all keyboard shortcuts',
        icon: <HelpCircle className="h-4 w-4" />,
        action: () => {
          onOpenChange(false);
          // Dispatch custom event to open keyboard shortcuts modal
          window.dispatchEvent(new CustomEvent('openKeyboardShortcuts'));
        },
        category: 'navigation',
      },
    ],
    [navigate, onOpenChange]
  );

  // Categorized results
  const categorizedResults = useMemo(() => categorizeResults(results), [results]);

  // Build flat list for keyboard navigation
  const flatNavigationItems = useMemo(() => {
    const items: Array<{
      type: 'recent' | 'action' | 'map' | 'node';
      data: SearchResult | QuickAction | RecentSearch;
      categoryIndex: number;
    }> = [];

    if (!query.trim()) {
      // Show recent searches and quick actions when no query
      recentSearches.forEach((search, index) => {
        items.push({ type: 'recent', data: search, categoryIndex: index });
      });
      quickActions.forEach((action, index) => {
        items.push({
          type: 'action',
          data: action,
          categoryIndex: recentSearches.length + index,
        });
      });
    } else {
      // Show categorized results
      categorizedResults.maps.forEach((result, index) => {
        items.push({ type: 'map', data: result, categoryIndex: index });
      });
      categorizedResults.nodes.forEach((result, index) => {
        items.push({
          type: 'node',
          data: result,
          categoryIndex: categorizedResults.maps.length + index,
        });
      });
    }

    return items;
  }, [query, recentSearches, quickActions, categorizedResults]);

  // Load recent searches when modal opens
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      if (inputRef.current) {
        inputRef.current.focus();
        setQuery('');
        setResults([]);
        setSelectedIndex(0);
      }
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

  // Scroll selected item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const selectedElement = resultsContainerRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const maxIndex = flatNavigationItems.length - 1;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, maxIndex));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          handleSelectItem(selectedIndex);
          break;
        case 'Escape':
          e.preventDefault();
          onOpenChange(false);
          break;
        case 'Tab':
          // Prevent focus from leaving the search input
          e.preventDefault();
          break;
      }
    },
    [flatNavigationItems, selectedIndex, onOpenChange]
  );

  const handleSelectItem = (index: number) => {
    const item = flatNavigationItems[index];
    if (!item) return;

    switch (item.type) {
      case 'recent':
        const recentSearch = item.data as RecentSearch;
        setQuery(recentSearch.query);
        break;
      case 'action':
        const action = item.data as QuickAction;
        action.action();
        break;
      case 'map':
      case 'node':
        const result = item.data as SearchResult;
        handleSelectResult(result);
        break;
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    // Save to recent searches
    saveRecentSearch(query);
    onOpenChange(false);

    // Navigate to the map, potentially focusing on the node
    if (result.type === 'node') {
      navigate(`/map/${result.mapId}?nodeId=${result.id}`);
    } else {
      navigate(`/map/${result.mapId}`);
    }
  };

  const handleClearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleRemoveRecentSearch = (e: React.MouseEvent, searchQuery: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s.query !== searchQuery);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update recent searches:', error);
    }
  };

  // Highlight matching text in excerpt
  const highlightMatch = (text: string, searchQuery: string) => {
    const terms = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    let result = text;

    for (const term of terms) {
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(
        regex,
        '<mark class="bg-yellow-200 text-yellow-900 rounded px-0.5">$1</mark>'
      );
    }

    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  if (!open) return null;

  const showRecentAndActions = !query.trim();
  const hasResults = results.length > 0;
  const hasRecentSearches = recentSearches.length > 0;

  return (
    <div className="fixed inset-0 z-50" data-testid="command-palette">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
        data-testid="command-palette-backdrop"
      />

      {/* Search modal */}
      <div className="absolute left-1/2 top-[15%] -translate-x-1/2 w-full max-w-2xl bg-background rounded-xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-top-4 fade-in duration-200">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search maps and nodes, or type a command..."
            className="flex-1 border-none bg-transparent focus-visible:ring-0 text-lg"
            data-testid="command-palette-input"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
            data-testid="command-palette-close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Results */}
        <div
          ref={resultsContainerRef}
          className="max-h-[60vh] overflow-y-auto"
          data-testid="command-palette-results"
        >
          {/* Recent searches and quick actions (when no query) */}
          {showRecentAndActions && (
            <>
              {/* Recent Searches */}
              {hasRecentSearches && (
                <div className="py-2">
                  <div className="flex items-center justify-between px-4 py-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Recent Searches
                    </span>
                    <button
                      onClick={handleClearRecentSearches}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="clear-recent-searches"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="mt-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={search.query}
                        data-index={index}
                        onClick={() => setQuery(search.query)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          'w-full text-left px-4 py-2 flex items-center gap-3 transition-colors group',
                          index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                        )}
                        data-testid={`recent-search-${index}`}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{search.query}</span>
                        <button
                          onClick={(e) => handleRemoveRecentSearch(e, search.query)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted-foreground/20 rounded transition-opacity"
                          data-testid={`remove-recent-${index}`}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="py-2 border-t border-border">
                <div className="px-4 py-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quick Actions
                  </span>
                </div>
                <div className="mt-1">
                  {quickActions.map((action, index) => {
                    const itemIndex = recentSearches.length + index;
                    return (
                      <button
                        key={action.id}
                        data-index={itemIndex}
                        onClick={() => action.action()}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={cn(
                          'w-full text-left px-4 py-2 flex items-center gap-3 transition-colors',
                          itemIndex === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                        )}
                        data-testid={`quick-action-${action.id}`}
                      >
                        <div
                          className={cn(
                            'p-1.5 rounded shrink-0',
                            action.category === 'action'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted-foreground/10 text-muted-foreground'
                          )}
                        >
                          {action.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{action.label}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {action.description}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Suggestions */}
              <div className="py-2 border-t border-border">
                <div className="px-4 py-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Tips
                  </span>
                </div>
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  <p>Type to search for mind maps and nodes. Results are categorized for easy navigation.</p>
                </div>
              </div>
            </>
          )}

          {/* Search results (when query exists) */}
          {!showRecentAndActions && (
            <>
              {/* No results */}
              {!loading && results.length === 0 && query && (
                <div className="py-12 text-center text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No results found for "{query}"</p>
                  <p className="text-sm mt-1">Try different keywords</p>
                </div>
              )}

              {/* Categorized Results */}
              {hasResults && (
                <>
                  {/* Maps category */}
                  {categorizedResults.maps.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 py-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Mind Maps ({categorizedResults.maps.length})
                        </span>
                      </div>
                      <div className="mt-1">
                        {categorizedResults.maps.map((result, index) => (
                          <button
                            key={`map-${result.id}-${result.matchedField}`}
                            data-index={index}
                            onClick={() => handleSelectResult(result)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={cn(
                              'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors',
                              index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                            )}
                            data-testid={`search-result-map-${index}`}
                          >
                            <div className="mt-0.5 p-1.5 rounded shrink-0 bg-blue-100 text-blue-600">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">
                                  {highlightMatch(result.mapTitle, query)}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 bg-blue-100 text-blue-700">
                                  Map
                                </span>
                              </div>
                              {result.excerpt && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {highlightMatch(result.excerpt, query)}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Updated{' '}
                                {formatDistanceToNow(new Date(result.updatedAt), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nodes category */}
                  {categorizedResults.nodes.length > 0 && (
                    <div className="py-2 border-t border-border">
                      <div className="px-4 py-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Circle className="h-3 w-3" />
                          Nodes ({categorizedResults.nodes.length})
                        </span>
                      </div>
                      <div className="mt-1">
                        {categorizedResults.nodes.map((result, index) => {
                          const itemIndex = categorizedResults.maps.length + index;
                          return (
                            <button
                              key={`node-${result.id}-${result.matchedField}`}
                              data-index={itemIndex}
                              onClick={() => handleSelectResult(result)}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              className={cn(
                                'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors',
                                itemIndex === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                              )}
                              data-testid={`search-result-node-${index}`}
                            >
                              <div className="mt-0.5 p-1.5 rounded shrink-0 bg-green-100 text-green-600">
                                <Circle className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">
                                    {highlightMatch(result.text, query)}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 bg-green-100 text-green-700">
                                    Node
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  in <span className="font-medium">{result.mapTitle}</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Updated{' '}
                                  {formatDistanceToNow(new Date(result.updatedAt), {
                                    addSuffix: true,
                                  })}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Keyboard hints footer */}
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
