/**
 * RelationshipSearchModal - Search for relatives by relationship type
 *
 * Allows searching for relationships like:
 * - "1st cousin"
 * - "2nd cousin once removed"
 * - "great-aunt"
 * - "half-brother"
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Loader2,
  User,
  ChevronRight,
} from 'lucide-react';
import { useRelationshipSearch } from '../../hooks/useComputedRelationship';
import { RelationshipBadge } from './RelationshipBadge';
import type { PersonSummary, ComputedRelationship } from '../../lib/relationship-api';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender?: string;
  profilePhoto?: string;
}

interface RelationshipSearchModalProps {
  /** Tree ID */
  treeId: string;
  /** All people in the tree for selection */
  people: Person[];
  /** Pre-selected person to search from (optional) */
  initialPerson?: Person;
  /** Close handler */
  onClose: () => void;
  /** Handler when a person is selected from results */
  onPersonSelect?: (person: PersonSummary) => void;
}

// Common relationship search suggestions
const SEARCH_SUGGESTIONS = [
  { label: '1st Cousin', query: '1st cousin' },
  { label: '2nd Cousin', query: '2nd cousin' },
  { label: 'Aunt', query: 'aunt' },
  { label: 'Uncle', query: 'uncle' },
  { label: 'Niece', query: 'niece' },
  { label: 'Nephew', query: 'nephew' },
  { label: 'Grandparent', query: 'grandparent' },
  { label: 'Grandchild', query: 'grandchild' },
  { label: 'Great-aunt', query: 'great-aunt' },
  { label: 'Great-uncle', query: 'great-uncle' },
  { label: 'Half-sibling', query: 'half-sibling' },
  { label: 'Step-parent', query: 'step-parent' },
];

export function RelationshipSearchModal({
  treeId,
  people,
  initialPerson,
  onClose,
  onPersonSelect,
}: RelationshipSearchModalProps) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(initialPerson || null);
  const [personSearch, setPersonSearch] = useState('');
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [relationshipQuery, setRelationshipQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the relationship query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(relationshipQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [relationshipQuery]);

  // Search for relatives
  const { results, isLoading, error, search } = useRelationshipSearch({
    treeId,
    fromPersonId: selectedPerson?.id,
    enabled: !!selectedPerson,
  });

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery && selectedPerson) {
      search(debouncedQuery);
    }
  }, [debouncedQuery, selectedPerson, search]);

  // Filter people for dropdown
  const filteredPeople = useMemo(() => {
    if (!personSearch) return people;
    const lower = personSearch.toLowerCase();
    return people.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(lower)
    );
  }, [people, personSearch]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Find Relatives</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Person Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search from person
            </label>
            {selectedPerson ? (
              <div className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 overflow-hidden">
                  {selectedPerson.profilePhoto ? (
                    <img src={selectedPerson.profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedPerson.firstName[0]
                  )}
                </div>
                <span className="flex-1 font-medium">{selectedPerson.firstName} {selectedPerson.lastName}</span>
                <button
                  onClick={() => {
                    setSelectedPerson(null);
                    setPersonSearch('');
                    setRelationshipQuery('');
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  onFocus={() => setShowPersonDropdown(true)}
                  placeholder="Select a person..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {showPersonDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowPersonDropdown(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                      {filteredPeople.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">No matches found</div>
                      ) : (
                        filteredPeople.slice(0, 20).map((person) => (
                          <button
                            key={person.id}
                            onClick={() => {
                              setSelectedPerson(person);
                              setShowPersonDropdown(false);
                              setPersonSearch('');
                            }}
                            className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 overflow-hidden">
                              {person.profilePhoto ? (
                                <img src={person.profilePhoto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                person.firstName[0]
                              )}
                            </div>
                            <span>{person.firstName} {person.lastName}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Relationship Search */}
          {selectedPerson && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search for relationship type
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={relationshipQuery}
                    onChange={(e) => setRelationshipQuery(e.target.value)}
                    placeholder="e.g., 2nd cousin, great-aunt, nephew..."
                    className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Quick Search Suggestions */}
              {!relationshipQuery && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Quick searches:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SEARCH_SUGGESTIONS.map(({ label, query }) => (
                      <button
                        key={query}
                        onClick={() => setRelationshipQuery(query)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {relationshipQuery && (
                <div className="mt-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Searching...</span>
                    </div>
                  ) : error ? (
                    <div className="text-center py-8 text-red-600">
                      Search failed. Please try again.
                    </div>
                  ) : results.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>No "{relationshipQuery}" found for {selectedPerson.firstName}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">
                        Found {results.length} match{results.length !== 1 ? 'es' : ''}:
                      </p>
                      <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                        {results.map(({ person, relationship }) => (
                          <button
                            key={person.id}
                            onClick={() => onPersonSelect?.(person)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 overflow-hidden flex-shrink-0">
                              {person.profilePhoto ? (
                                <img src={person.profilePhoto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                person.firstName[0]
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {person.firstName} {person.lastName}
                              </p>
                              <RelationshipBadge relationship={relationship} size="sm" />
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Empty state when no person selected */}
          {!selectedPerson && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Select a person to search for their relatives</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default RelationshipSearchModal;
