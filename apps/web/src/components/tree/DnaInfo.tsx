import { useState, useEffect } from 'react';
import {
  Dna,
  AlertTriangle,
  Edit,
  Save,
  X,
  Calendar,
  Hash,
  Info,
  Lock,
  Users,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Types
export type DnaPrivacy = 'PRIVATE' | 'FAMILY_ONLY';

export interface DnaData {
  dnaTestProvider?: string | null;
  dnaTestDate?: string | null;
  yDnaHaplogroup?: string | null;
  mtDnaHaplogroup?: string | null;
  dnaKitNumber?: string | null;
  dnaEthnicityNotes?: string | null;
  dnaMatchNotes?: string | null;
  dnaPrivacy: DnaPrivacy;
}

export interface PersonInfo {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
}

interface DnaInfoProps {
  personId: string;
  person: PersonInfo;
  dnaData: DnaData;
  canEdit: boolean;
  canView: boolean;
  isAdmin: boolean;
  onSave?: (data: Partial<DnaData>) => Promise<void>;
}

// Common DNA test providers
const DNA_PROVIDERS = [
  '23andMe',
  'AncestryDNA',
  'MyHeritage DNA',
  'FamilyTreeDNA',
  'Living DNA',
  'Nebula Genomics',
  'Other',
];

// Privacy descriptions
const PRIVACY_OPTIONS: { value: DnaPrivacy; label: string; description: string; icon: typeof Lock }[] = [
  {
    value: 'PRIVATE',
    label: 'Private',
    description: 'Only you and tree admins can view',
    icon: Lock,
  },
  {
    value: 'FAMILY_ONLY',
    label: 'Family Members',
    description: 'All tree members can view',
    icon: Users,
  },
];

export function DnaInfo({
  personId: _personId,
  person,
  dnaData,
  canEdit,
  canView,
  isAdmin,
  onSave,
}: DnaInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [formData, setFormData] = useState<DnaData>(dnaData);

  // Reset form when dnaData changes
  useEffect(() => {
    setFormData(dnaData);
  }, [dnaData]);

  // Check if person has any DNA data
  const hasDnaData = Boolean(
    dnaData.dnaTestProvider ||
    dnaData.yDnaHaplogroup ||
    dnaData.mtDnaHaplogroup ||
    dnaData.dnaEthnicityNotes
  );

  // Handle save
  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save DNA data:', error);
      alert('Failed to save DNA data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData(dnaData);
    setIsEditing(false);
  };

  // If can't view, show restricted message
  if (!canView) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 text-gray-500">
          <Lock className="w-5 h-5" />
          <span>DNA information is private</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dna className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">DNA Information</h3>
          <button
            onClick={() => setShowDisclaimer(!showDisclaimer)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Privacy information"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {canEdit && !isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            {hasDnaData ? 'Edit' : 'Add DNA Info'}
          </Button>
        )}

        {isEditing && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {/* Privacy Disclaimer */}
      {showDisclaimer && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 mb-1">Privacy Notice</h4>
              <p className="text-sm text-amber-700">
                This section stores only reference information about DNA tests (provider, haplogroups, notes).
                <strong> No actual genetic data is stored in this system.</strong> For security, never share
                sensitive personal identifiers or raw DNA data here. DNA information is visible only to you
                and tree administrators by default.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isEditing ? (
        <EditForm
          formData={formData}
          setFormData={setFormData}
          person={person}
          isAdmin={isAdmin}
        />
      ) : hasDnaData ? (
        <DisplayView dnaData={dnaData} person={person} />
      ) : (
        <EmptyState canEdit={canEdit} onAddClick={() => setIsEditing(true)} />
      )}
    </div>
  );
}

// Display view component
function DisplayView({ dnaData, person }: { dnaData: DnaData; person: PersonInfo }) {
  const privacyOption = PRIVACY_OPTIONS.find(p => p.value === dnaData.dnaPrivacy);
  const PrivacyIcon = privacyOption?.icon || Lock;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100 space-y-4">
      {/* Privacy indicator */}
      <div className="flex items-center gap-2 text-sm text-purple-700">
        <PrivacyIcon className="w-4 h-4" />
        <span>{privacyOption?.label}: {privacyOption?.description}</span>
      </div>

      {/* Test provider and date */}
      {(dnaData.dnaTestProvider || dnaData.dnaTestDate) && (
        <div className="flex flex-wrap gap-4">
          {dnaData.dnaTestProvider && (
            <div className="flex items-center gap-2">
              <Dna className="w-4 h-4 text-purple-500" />
              <span className="text-gray-900 font-medium">{dnaData.dnaTestProvider}</span>
            </div>
          )}
          {dnaData.dnaTestDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                {new Date(dnaData.dnaTestDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {dnaData.dnaKitNumber && (
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Kit: {dnaData.dnaKitNumber}</span>
            </div>
          )}
        </div>
      )}

      {/* Haplogroups */}
      {(dnaData.yDnaHaplogroup || dnaData.mtDnaHaplogroup) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dnaData.yDnaHaplogroup && person.gender === 'MALE' && (
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <div className="text-xs text-gray-500 mb-1">Y-DNA Haplogroup</div>
              <div className="text-lg font-semibold text-purple-700">{dnaData.yDnaHaplogroup}</div>
              <a
                href={`https://www.familytreedna.com/learn/y-dna-testing/haplogroups/${dnaData.yDnaHaplogroup.charAt(0).toLowerCase()}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1 mt-1"
              >
                Learn more <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {dnaData.mtDnaHaplogroup && (
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <div className="text-xs text-gray-500 mb-1">Mitochondrial (mtDNA) Haplogroup</div>
              <div className="text-lg font-semibold text-purple-700">{dnaData.mtDnaHaplogroup}</div>
              <a
                href={`https://www.familytreedna.com/learn/mtdna-testing/haplogroups/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1 mt-1"
              >
                Learn more <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Ethnicity notes */}
      {dnaData.dnaEthnicityNotes && (
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Ethnicity Notes</div>
          <p className="text-gray-600 text-sm whitespace-pre-wrap">{dnaData.dnaEthnicityNotes}</p>
        </div>
      )}

      {/* Match notes */}
      {dnaData.dnaMatchNotes && (
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">DNA Match Notes</div>
          <p className="text-gray-600 text-sm whitespace-pre-wrap">{dnaData.dnaMatchNotes}</p>
        </div>
      )}
    </div>
  );
}

// Edit form component
function EditForm({
  formData,
  setFormData,
  person,
  isAdmin: _isAdmin,
}: {
  formData: DnaData;
  setFormData: React.Dispatch<React.SetStateAction<DnaData>>;
  person: PersonInfo;
  isAdmin: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      {/* Privacy warning banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          Only store reference information here. Never enter raw DNA data or sensitive identifiers.
        </p>
      </div>

      {/* Privacy setting */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Privacy Level
        </label>
        <div className="grid grid-cols-2 gap-3">
          {PRIVACY_OPTIONS.map(option => {
            const Icon = option.icon;
            const isSelected = formData.dnaPrivacy === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, dnaPrivacy: option.value }))}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                  <span className={`font-medium ${isSelected ? 'text-purple-900' : 'text-gray-700'}`}>
                    {option.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{option.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Test provider and date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            DNA Test Provider
          </label>
          <select
            value={formData.dnaTestProvider || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, dnaTestProvider: e.target.value || null }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
          >
            <option value="">Select provider...</option>
            {DNA_PROVIDERS.map(provider => (
              <option key={provider} value={provider}>{provider}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Test Date
          </label>
          <input
            type="date"
            value={formData.dnaTestDate ? formData.dnaTestDate.split('T')[0] : ''}
            onChange={(e) => setFormData(prev => ({ ...prev, dnaTestDate: e.target.value || null }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
          />
        </div>
      </div>

      {/* Kit number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Kit Number (optional)
        </label>
        <input
          type="text"
          value={formData.dnaKitNumber || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, dnaKitNumber: e.target.value || null }))}
          placeholder="e.g., ABC123456"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
        />
      </div>

      {/* Haplogroups */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {person.gender === 'MALE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Y-DNA Haplogroup
            </label>
            <input
              type="text"
              value={formData.yDnaHaplogroup || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, yDnaHaplogroup: e.target.value || null }))}
              placeholder="e.g., R1b-M269"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Paternal lineage marker (males only)
            </p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            mtDNA Haplogroup
          </label>
          <input
            type="text"
            value={formData.mtDnaHaplogroup || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, mtDnaHaplogroup: e.target.value || null }))}
            placeholder="e.g., H1a1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maternal lineage marker
          </p>
        </div>
      </div>

      {/* Ethnicity notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ethnicity Notes
        </label>
        <textarea
          value={formData.dnaEthnicityNotes || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, dnaEthnicityNotes: e.target.value || null }))}
          placeholder="e.g., 45% British/Irish, 30% Germanic Europe, 15% Scandinavian..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Summary of ethnicity estimates from your DNA test
        </p>
      </div>

      {/* Match notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          DNA Match Notes
        </label>
        <textarea
          value={formData.dnaMatchNotes || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, dnaMatchNotes: e.target.value || null }))}
          placeholder="Notes about DNA matches or connections discovered..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          <strong>Important:</strong> Do not include names, emails, or personal details of matches.
          Use general descriptions only.
        </p>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ canEdit, onAddClick }: { canEdit: boolean; onAddClick: () => void }) {
  return (
    <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 text-center">
      <Dna className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h4 className="font-medium text-gray-700 mb-2">No DNA Information</h4>
      <p className="text-sm text-gray-500 mb-4">
        Record DNA test results and haplogroup information for genealogical research.
      </p>
      {canEdit && (
        <Button
          variant="outline"
          onClick={onAddClick}
        >
          Add DNA Information
        </Button>
      )}
    </div>
  );
}

export default DnaInfo;
