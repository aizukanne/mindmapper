import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, User, Calendar, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Person } from '@mindmapper/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface TreeSearchProps {
  treeId: string;
  onPersonSelect: (person: Person) => void;
  onClose?: () => void;
  className?: string;
}

interface SearchResult {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  birthDate?: Date | null;
  deathDate?: Date | null;
  birthPlace?: string | null;
  isLiving: boolean;
  profilePhoto?: string | null;
  generation: number;
}

export function TreeSearch({
  treeId,
  onPersonSelect,
  onClose,
  className = '',
}: TreeSearchProps) {
  const [query, setQuery] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim() && !birthYear && !location) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append('q', query.trim());
      if (birthYear) params.append('birthYear', birthYear);
      if (location) params.append('location', location);

      const response = await fetch(
        `${API_URL}/api/family-trees/${treeId}/search?${params.toString()}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.data || []);
    } catch (err) {
      setError('Failed to search. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [treeId, query, birthYear, location]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim() || birthYear || location) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, birthYear, location, handleSearch]);

  const handleSelect = (result: SearchResult) => {
    onPersonSelect(result as Person);
  };

  const handleClear = () => {
    setQuery('');
    setBirthYear('');
    setLocation('');
    setResults([]);
    inputRef.current?.focus();
  };

  const formatLifespan = (result: SearchResult): string => {
    const birthYear = result.birthDate ? new Date(result.birthDate).getFullYear() : null;
    const deathYear = result.deathDate ? new Date(result.deathDate).getFullYear() : null;

    if (birthYear && deathYear) {
      return `${birthYear} - ${deathYear}`;
    }
    if (birthYear) {
      return result.isLiving ? `b. ${birthYear}` : `b. ${birthYear}`;
    }
    return '';
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium text-gray-900">Search Family Tree</h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Search Input */}
      <div className="p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {(query || birthYear || location) && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Advanced Search Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
        </button>

        {/* Advanced Search Options */}
        {showAdvanced && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Birth Year</label>
              <div className="relative">
                <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                  type="number"
                  placeholder="e.g. 1950"
                  value={birthYear}
                  onChange={e => setBirthYear(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Location</label>
              <div className="relative">
                <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="City, Country"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="border-t max-h-80 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && (query || birthYear || location) && (
          <div className="p-4 text-sm text-gray-500 text-center">
            No results found
          </div>
        )}

        {!loading && !error && results.length === 0 && !query && !birthYear && !location && (
          <div className="p-4 text-sm text-gray-500 text-center">
            Enter a name to search
          </div>
        )}

        {!loading && results.length > 0 && (
          <ul className="divide-y">
            {results.map(result => (
              <li
                key={result.id}
                className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleSelect(result)}
              >
                <div className="flex items-center gap-3">
                  {/* Photo */}
                  {result.profilePhoto ? (
                    <img
                      src={result.profilePhoto}
                      alt={`${result.firstName} ${result.lastName}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {result.firstName} {result.lastName}
                      {result.maidenName && (
                        <span className="text-gray-500 font-normal"> (née {result.maidenName})</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {formatLifespan(result) && <span>{formatLifespan(result)}</span>}
                      {result.birthPlace && (
                        <>
                          <span>•</span>
                          <span className="truncate">{result.birthPlace}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Generation badge */}
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    Gen {result.generation}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && results.length > 0 && (
          <div className="p-2 text-xs text-gray-500 text-center border-t bg-gray-50">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>
    </div>
  );
}
