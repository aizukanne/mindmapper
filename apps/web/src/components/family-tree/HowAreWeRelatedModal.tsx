/**
 * HowAreWeRelatedModal - Allows users to select two people and see how they're related
 *
 * Features:
 * - Person selection dropdowns
 * - Computed relationship display
 * - Common ancestors visualization
 * - Relationship path display
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Users,
  GitBranch,
  Search,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useComputedRelationship } from '../../hooks/useComputedRelationship';
import { getRelationshipPaths, getCommonAncestors } from '../../lib/relationship-api';
import { RelationshipBadge, RelationshipBadgeDetailed } from './RelationshipBadge';
import type { PersonSummary, CommonAncestor, RelationshipPath } from '../../lib/relationship-api';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender?: string;
  profilePhoto?: string;
}

interface HowAreWeRelatedModalProps {
  /** Tree ID */
  treeId: string;
  /** All people in the tree for selection */
  people: Person[];
  /** Pre-selected person A (optional) */
  initialPersonA?: Person;
  /** Pre-selected person B (optional) */
  initialPersonB?: Person;
  /** Close handler */
  onClose: () => void;
}

export function HowAreWeRelatedModal({
  treeId,
  people,
  initialPersonA,
  initialPersonB,
  onClose,
}: HowAreWeRelatedModalProps) {
  const [personA, setPersonA] = useState<Person | null>(initialPersonA || null);
  const [personB, setPersonB] = useState<Person | null>(initialPersonB || null);
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [showDropdownA, setShowDropdownA] = useState(false);
  const [showDropdownB, setShowDropdownB] = useState(false);
  const [commonAncestors, setCommonAncestors] = useState<CommonAncestor[]>([]);
  const [paths, setPaths] = useState<RelationshipPath[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(false);

  // Compute relationship when both people are selected
  const {
    relationship,
    isLoading,
    error,
  } = useComputedRelationship({
    treeId,
    personAId: personA?.id,
    personBId: personB?.id,
    enabled: !!personA && !!personB,
  });

  // Filter people based on search
  const filteredPeopleA = useMemo(() => {
    if (!searchA) return people.filter(p => p.id !== personB?.id);
    const lower = searchA.toLowerCase();
    return people.filter(p =>
      p.id !== personB?.id &&
      (`${p.firstName} ${p.lastName}`.toLowerCase().includes(lower))
    );
  }, [people, searchA, personB]);

  const filteredPeopleB = useMemo(() => {
    if (!searchB) return people.filter(p => p.id !== personA?.id);
    const lower = searchB.toLowerCase();
    return people.filter(p =>
      p.id !== personA?.id &&
      (`${p.firstName} ${p.lastName}`.toLowerCase().includes(lower))
    );
  }, [people, searchB, personA]);

  // Load common ancestors and paths when relationship is found
  useEffect(() => {
    if (relationship?.isRelated && personA && personB) {
      setLoadingExtra(true);
      Promise.all([
        getCommonAncestors(treeId, personA.id, personB.id).catch(() => ({ data: [] })),
        getRelationshipPaths(treeId, personA.id, personB.id).catch(() => ({ data: { paths: [], commonAncestors: [] } })),
      ]).then(([ancestorsRes, pathsRes]) => {
        setCommonAncestors(ancestorsRes.data);
        setPaths(pathsRes.data.paths);
      }).finally(() => {
        setLoadingExtra(false);
      });
    } else {
      setCommonAncestors([]);
      setPaths([]);
    }
  }, [relationship?.isRelated, personA, personB, treeId]);

  // Person selector component
  const PersonSelector = ({
    label,
    selected,
    search,
    setSearch,
    showDropdown,
    setShowDropdown,
    filteredPeople,
    onSelect,
  }: {
    label: string;
    selected: Person | null;
    search: string;
    setSearch: (s: string) => void;
    showDropdown: boolean;
    setShowDropdown: (b: boolean) => void;
    filteredPeople: Person[];
    onSelect: (p: Person) => void;
  }) => (
    <div className="flex-1 relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {selected ? (
        <div className="flex items-center gap-2 p-2 border rounded-lg bg-white">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 overflow-hidden">
            {selected.profilePhoto ? (
              <img src={selected.profilePhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              selected.firstName[0]
            )}
          </div>
          <span className="flex-1 font-medium">{selected.firstName} {selected.lastName}</span>
          <button
            onClick={() => {
              onSelect(null as unknown as Person);
              setSearch('');
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search for a person..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                {filteredPeople.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 text-center">No matches found</div>
                ) : (
                  filteredPeople.slice(0, 20).map((person) => (
                    <button
                      key={person.id}
                      onClick={() => {
                        onSelect(person);
                        setShowDropdown(false);
                        setSearch('');
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
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">How Are We Related?</h2>
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
          {/* Person Selectors */}
          <div className="flex gap-4 items-end">
            <PersonSelector
              label="Person A"
              selected={personA}
              search={searchA}
              setSearch={setSearchA}
              showDropdown={showDropdownA}
              setShowDropdown={setShowDropdownA}
              filteredPeople={filteredPeopleA}
              onSelect={setPersonA}
            />
            <div className="pb-2">
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
            <PersonSelector
              label="Person B"
              selected={personB}
              search={searchB}
              setSearch={setSearchB}
              showDropdown={showDropdownB}
              setShowDropdown={setShowDropdownB}
              filteredPeople={filteredPeopleB}
              onSelect={setPersonB}
            />
          </div>

          {/* Swap button */}
          {personA && personB && (
            <div className="flex justify-center">
              <button
                onClick={() => {
                  const temp = personA;
                  setPersonA(personB);
                  setPersonB(temp);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Users className="w-4 h-4" />
                Swap people
              </button>
            </div>
          )}

          {/* Results */}
          {personA && personB && (
            <div className="mt-6 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Computing relationship...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8 text-red-600">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span>Failed to compute relationship</span>
                </div>
              ) : relationship ? (
                <>
                  {/* Main Relationship Display */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      {personA.firstName} is {personB.firstName}'s...
                    </p>
                    {relationship.isRelated ? (
                      <div className="flex flex-col items-center">
                        <RelationshipBadgeDetailed relationship={relationship} />
                        {relationship.consanguinity !== undefined && relationship.consanguinity > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            Consanguinity: {(relationship.consanguinity * 100).toFixed(4)}%
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-lg font-medium text-gray-500">
                        No direct relationship found
                      </p>
                    )}
                  </div>

                  {/* Common Ancestors */}
                  {loadingExtra ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Loading details...</span>
                    </div>
                  ) : (
                    <>
                      {commonAncestors.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <h3 className="font-medium text-gray-900 mb-3">Common Ancestors</h3>
                          <div className="space-y-2">
                            {commonAncestors.slice(0, 5).map((ca, idx) => (
                              <div key={ca.ancestorId} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className={idx === 0 ? 'font-medium' : ''}>
                                    {ca.ancestor?.firstName} {ca.ancestor?.lastName}
                                    {idx === 0 && (
                                      <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                        MRCA
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {ca.distanceFromA} gen from {personA.firstName},
                                  {' '}{ca.distanceFromB} gen from {personB.firstName}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Relationship Path */}
                      {paths.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <h3 className="font-medium text-gray-900 mb-3">Relationship Path</h3>
                          <div className="flex flex-wrap items-center gap-1 text-sm">
                            {paths[0].edges.map((edge, idx) => (
                              <React.Fragment key={idx}>
                                {idx === 0 && (
                                  <span className="font-medium text-blue-700">
                                    {edge.from?.firstName}
                                  </span>
                                )}
                                <span className="text-gray-400">→</span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {edge.relationship.replace(/_/g, ' ').toLowerCase()}
                                </span>
                                <span className="text-gray-400">→</span>
                                <span className={idx === paths[0].edges.length - 1 ? 'font-medium text-blue-700' : ''}>
                                  {edge.to?.firstName}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* Empty state */}
          {(!personA || !personB) && (
            <div className="text-center py-12 text-gray-500">
              <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select two people to see how they're related</p>
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

export default HowAreWeRelatedModal;
