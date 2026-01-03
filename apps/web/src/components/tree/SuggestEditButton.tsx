import { useState } from 'react';
import {
  MessageSquarePlus,
  X,
  Send,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useSuggestions,
  type SuggestionType,
  type CreateSuggestionInput,
} from '@/hooks/useSuggestions';

export interface PersonData {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  nickname?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
  isLiving?: boolean;
  biography?: string | null;
  occupation?: string | null;
  education?: string | null;
}

export interface SuggestEditButtonProps {
  treeId: string;
  person: PersonData;
  onSuccess?: () => void;
  className?: string;
}

const SUGGESTION_TYPES: { value: SuggestionType; label: string; description: string }[] = [
  {
    value: 'UPDATE_PERSON',
    label: 'Update Information',
    description: 'Correct or add details about this person',
  },
  {
    value: 'CORRECT_DATE',
    label: 'Date Correction',
    description: 'Fix a birth, death, or marriage date',
  },
  {
    value: 'ADD_RELATIONSHIP',
    label: 'Add Relationship',
    description: 'Suggest a new family connection',
  },
  {
    value: 'ADD_PERSON',
    label: 'Add Family Member',
    description: 'Add a parent, sibling, or other relative',
  },
  {
    value: 'OTHER',
    label: 'Other',
    description: 'Any other suggestion or correction',
  },
];

const EDITABLE_FIELDS: { key: keyof PersonData; label: string; type: 'text' | 'date' | 'textarea' | 'boolean' }[] = [
  { key: 'firstName', label: 'First Name', type: 'text' },
  { key: 'middleName', label: 'Middle Name', type: 'text' },
  { key: 'lastName', label: 'Last Name', type: 'text' },
  { key: 'maidenName', label: 'Maiden Name', type: 'text' },
  { key: 'nickname', label: 'Nickname', type: 'text' },
  { key: 'birthDate', label: 'Birth Date', type: 'date' },
  { key: 'birthPlace', label: 'Birth Place', type: 'text' },
  { key: 'deathDate', label: 'Death Date', type: 'date' },
  { key: 'deathPlace', label: 'Death Place', type: 'text' },
  { key: 'isLiving', label: 'Is Living', type: 'boolean' },
  { key: 'occupation', label: 'Occupation', type: 'text' },
  { key: 'education', label: 'Education', type: 'text' },
  { key: 'biography', label: 'Biography', type: 'textarea' },
];

function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function formatDisplayValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return '(not set)';
  if (type === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'date' && typeof value === 'string') {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  }
  return String(value);
}

export function SuggestEditButton({
  treeId,
  person,
  onSuccess,
  className = '',
}: SuggestEditButtonProps) {
  const { createSuggestion } = useSuggestions(treeId);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'type' | 'details' | 'success'>('type');
  const [selectedType, setSelectedType] = useState<SuggestionType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [suggestedChanges, setSuggestedChanges] = useState<Partial<PersonData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setStep('type');
    setSelectedType(null);
    setTitle('');
    setDescription('');
    setSuggestedChanges({});
    setError(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleTypeSelect = (type: SuggestionType) => {
    setSelectedType(type);
    setStep('details');
  };

  const handleFieldChange = (key: keyof PersonData, value: string | boolean) => {
    setSuggestedChanges(prev => ({
      ...prev,
      [key]: value === '' ? null : value,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedType || !title.trim()) {
      setError('Please provide a title for your suggestion');
      return;
    }

    // For UPDATE_PERSON and CORRECT_DATE, require at least one change
    if (
      (selectedType === 'UPDATE_PERSON' || selectedType === 'CORRECT_DATE') &&
      Object.keys(suggestedChanges).length === 0
    ) {
      setError('Please specify at least one change');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const input: CreateSuggestionInput = {
        personId: person.id,
        type: selectedType,
        title: title.trim(),
        description: description.trim() || undefined,
        currentData: {
          firstName: person.firstName,
          middleName: person.middleName,
          lastName: person.lastName,
          maidenName: person.maidenName,
          nickname: person.nickname,
          birthDate: person.birthDate,
          birthPlace: person.birthPlace,
          deathDate: person.deathDate,
          deathPlace: person.deathPlace,
          isLiving: person.isLiving,
          occupation: person.occupation,
          education: person.education,
          biography: person.biography,
        },
        suggestedData: suggestedChanges,
      };

      const result = await createSuggestion(input);

      if (result) {
        setStep('success');
        onSuccess?.();
      } else {
        setError('Failed to submit suggestion. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <MessageSquarePlus className="w-4 h-4 mr-1" />
        Suggest Edit
      </Button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {step === 'success'
                  ? 'Suggestion Submitted'
                  : `Suggest Edit for ${person.firstName} ${person.lastName}`}
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* Step 1: Select Type */}
              {step === 'type' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    What type of suggestion would you like to make?
                  </p>
                  {SUGGESTION_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => handleTypeSelect(type.value)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{type.label}</div>
                      <div className="text-sm text-gray-500">{type.description}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: Details */}
              {step === 'details' && selectedType && (
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Brief summary of your suggestion"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Provide more details about your suggestion (optional)"
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Field changes for UPDATE_PERSON and CORRECT_DATE */}
                  {(selectedType === 'UPDATE_PERSON' || selectedType === 'CORRECT_DATE') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Suggested Changes
                      </label>
                      <div className="space-y-3 max-h-60 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                        {EDITABLE_FIELDS.filter(field => {
                          // For CORRECT_DATE, only show date fields
                          if (selectedType === 'CORRECT_DATE') {
                            return field.type === 'date';
                          }
                          return true;
                        }).map(field => (
                          <div key={field.key} className="space-y-1">
                            <label className="block text-xs font-medium text-gray-600">
                              {field.label}
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-24 truncate">
                                Current: {formatDisplayValue(person[field.key], field.type)}
                              </span>
                              {field.type === 'boolean' ? (
                                <select
                                  value={
                                    suggestedChanges[field.key] !== undefined
                                      ? String(suggestedChanges[field.key])
                                      : ''
                                  }
                                  onChange={e =>
                                    handleFieldChange(
                                      field.key,
                                      e.target.value === '' ? '' : e.target.value === 'true'
                                    )
                                  }
                                  className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">No change</option>
                                  <option value="true">Yes</option>
                                  <option value="false">No</option>
                                </select>
                              ) : field.type === 'textarea' ? (
                                <textarea
                                  value={(suggestedChanges[field.key] as string) || ''}
                                  onChange={e => handleFieldChange(field.key, e.target.value)}
                                  placeholder="New value"
                                  rows={2}
                                  className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                <input
                                  type={field.type}
                                  value={
                                    field.type === 'date'
                                      ? formatDateForInput(suggestedChanges[field.key] as string)
                                      : (suggestedChanges[field.key] as string) || ''
                                  }
                                  onChange={e => handleFieldChange(field.key, e.target.value)}
                                  placeholder="New value"
                                  className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* For other types, just show description */}
                  {(selectedType === 'ADD_RELATIONSHIP' ||
                    selectedType === 'ADD_PERSON' ||
                    selectedType === 'OTHER') && (
                    <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                      Please describe the relationship or person you want to add in the description
                      field above. An admin will review your suggestion.
                    </div>
                  )}

                  {/* Error message */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Success */}
              {step === 'success' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Thank You!
                  </h4>
                  <p className="text-gray-600">
                    Your suggestion has been submitted and will be reviewed by a family tree
                    admin.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
              {step === 'type' && (
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
              )}
              {step === 'details' && (
                <>
                  <Button variant="ghost" onClick={() => setStep('type')}>
                    Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-1" />
                        Submit Suggestion
                      </>
                    )}
                  </Button>
                </>
              )}
              {step === 'success' && (
                <Button onClick={handleClose}>Done</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
