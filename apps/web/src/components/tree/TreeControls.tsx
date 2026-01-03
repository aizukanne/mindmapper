import { useState } from 'react';
import {
  User,
  Layers,
  GitBranch,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  UserCheck,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Person } from '@mindmapper/types';

interface LinkedPersonData {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  profilePhoto?: string | null;
  generation: number;
}

interface GenerationInfo {
  generation: number;
  count: number;
}

interface RootPerson {
  id: string;
  firstName: string;
  lastName: string;
}

export interface TreeControlsProps {
  // Find Me
  linkedPerson: LinkedPersonData | null;
  linkedPersonLoading: boolean;
  onFindMe: () => void;
  onLinkToPerson: (personId: string) => void;
  onUnlinkPerson: () => void;
  selectedPerson: Person | null;

  // Generation Filter
  generations: GenerationInfo[];
  minGeneration: number;
  maxGeneration: number;
  generationFilter: [number, number] | null;
  onGenerationFilterChange: (filter: [number, number] | null) => void;
  generationsLoading: boolean;

  // Branch Isolation
  isolatedBranchRoot: RootPerson | null;
  branchDirection: 'ancestors' | 'descendants' | 'both';
  onIsolateBranch: (personId: string, direction: 'ancestors' | 'descendants' | 'both') => void;
  onClearIsolation: () => void;
  branchLoading: boolean;

  className?: string;
}

export function TreeControls({
  linkedPerson,
  linkedPersonLoading,
  onFindMe,
  onLinkToPerson,
  onUnlinkPerson,
  selectedPerson,
  generations,
  minGeneration,
  maxGeneration,
  generationFilter,
  onGenerationFilterChange,
  generationsLoading,
  isolatedBranchRoot,
  branchDirection,
  onIsolateBranch,
  onClearIsolation,
  branchLoading,
  className = '',
}: TreeControlsProps) {
  const [showGenFilter, setShowGenFilter] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [filterMin, setFilterMin] = useState(minGeneration);
  const [filterMax, setFilterMax] = useState(maxGeneration);

  const handleApplyGenFilter = () => {
    onGenerationFilterChange([filterMin, filterMax]);
    setShowGenFilter(false);
  };

  const handleClearGenFilter = () => {
    onGenerationFilterChange(null);
    setFilterMin(minGeneration);
    setFilterMax(maxGeneration);
    setShowGenFilter(false);
  };

  const getGenerationLabel = (gen: number): string => {
    if (gen === 0) return 'Self';
    if (gen < 0) return `${Math.abs(gen)} gen. ancestors`;
    return `${gen} gen. descendants`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Find Me Button */}
      <div className="relative">
        {linkedPersonLoading ? (
          <Button variant="outline" size="sm" disabled>
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
            Loading...
          </Button>
        ) : linkedPerson ? (
          <div className="flex items-center gap-1">
            <Button
              variant="default"
              size="sm"
              onClick={onFindMe}
              className="bg-green-600 hover:bg-green-700"
              title={`Find ${linkedPerson.firstName} ${linkedPerson.lastName} in tree`}
            >
              <UserCheck className="w-4 h-4 mr-1" />
              Find Me
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onUnlinkPerson}
              title="Unlink from this person"
              className="px-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedPerson) {
                onLinkToPerson(selectedPerson.id);
              }
            }}
            disabled={!selectedPerson}
            title={selectedPerson ? `Link yourself to ${selectedPerson.firstName}` : 'Select a person to link as yourself'}
          >
            <User className="w-4 h-4 mr-1" />
            {selectedPerson ? `I am ${selectedPerson.firstName}` : 'Link Me'}
          </Button>
        )}
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {/* Generation Filter */}
      <div className="relative">
        <Button
          variant={generationFilter ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowGenFilter(!showGenFilter)}
          disabled={generationsLoading || generations.length === 0}
        >
          <Layers className="w-4 h-4 mr-1" />
          {generationFilter
            ? `Gen ${generationFilter[0]} - ${generationFilter[1]}`
            : 'Generations'}
          {showGenFilter ? (
            <ChevronUp className="w-3 h-3 ml-1" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-1" />
          )}
        </Button>

        {showGenFilter && (
          <div className="absolute top-full mt-2 left-0 z-30 bg-white rounded-lg shadow-xl border p-3 w-64">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-900">Filter by Generation</h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <select
                    value={filterMin}
                    onChange={e => setFilterMin(parseInt(e.target.value))}
                    className="w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {generations.map(g => (
                      <option key={g.generation} value={g.generation}>
                        Gen {g.generation} ({g.count})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <select
                    value={filterMax}
                    onChange={e => setFilterMax(parseInt(e.target.value))}
                    className="w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {generations.map(g => (
                      <option key={g.generation} value={g.generation}>
                        Gen {g.generation} ({g.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                {getGenerationLabel(filterMin)} to {getGenerationLabel(filterMax)}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  onClick={handleApplyGenFilter}
                  disabled={filterMin > filterMax}
                  className="flex-1"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Apply
                </Button>
                {generationFilter && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearGenFilter}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Branch Isolation */}
      <div className="relative">
        {isolatedBranchRoot ? (
          <div className="flex items-center gap-1">
            <Button
              variant="default"
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              title={`Viewing ${isolatedBranchRoot.firstName}'s ${branchDirection === 'both' ? 'full branch' : branchDirection}`}
            >
              <GitBranch className="w-4 h-4 mr-1" />
              {isolatedBranchRoot.firstName}'s Branch
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearIsolation}
              title="Show full tree"
              className="px-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBranchMenu(!showBranchMenu)}
              disabled={!selectedPerson || branchLoading}
              title={selectedPerson ? 'Isolate branch' : 'Select a person first'}
            >
              {branchLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <GitBranch className="w-4 h-4 mr-1" />
              )}
              Branch
              {showBranchMenu ? (
                <ChevronUp className="w-3 h-3 ml-1" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-1" />
              )}
            </Button>

            {showBranchMenu && selectedPerson && (
              <div className="absolute top-full mt-2 left-0 z-30 bg-white rounded-lg shadow-xl border p-2 w-48">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 px-2 pb-1 border-b mb-1">
                    Isolate {selectedPerson.firstName}'s:
                  </p>
                  <button
                    onClick={() => {
                      onIsolateBranch(selectedPerson.id, 'ancestors');
                      setShowBranchMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-100 rounded"
                  >
                    <ArrowUp className="w-4 h-4 text-gray-500" />
                    Ancestors only
                  </button>
                  <button
                    onClick={() => {
                      onIsolateBranch(selectedPerson.id, 'descendants');
                      setShowBranchMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-100 rounded"
                  >
                    <ArrowDown className="w-4 h-4 text-gray-500" />
                    Descendants only
                  </button>
                  <button
                    onClick={() => {
                      onIsolateBranch(selectedPerson.id, 'both');
                      setShowBranchMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-100 rounded"
                  >
                    <ArrowUpDown className="w-4 h-4 text-gray-500" />
                    Full branch
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
