import { useState, useEffect, useCallback } from 'react';
import { Loader2, Eye, Shield, Lock, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Person, Gender, PersonPrivacy } from '@mindmapper/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Form data type for internal state
interface PersonFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  maidenName: string;
  suffix: string;
  nickname: string;
  gender: Gender;
  birthDate: string;
  birthPlace: string;
  deathDate: string;
  deathPlace: string;
  isLiving: boolean;
  biography: string;
  occupation: string;
  education: string;
  privacy: PersonPrivacy;
}

// Field-level error type - matching form data fields
interface FieldErrors {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  maidenName?: string;
  suffix?: string;
  nickname?: string;
  gender?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  isLiving?: string;
  biography?: string;
  occupation?: string;
  education?: string;
  privacy?: string;
  general?: string;
}

interface PersonEditDialogProps {
  /** The person to edit. If null, creates a new person. */
  person: Person | null;
  /** ID of the family tree this person belongs to */
  treeId: string;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog should close */
  onClose: () => void;
  /** Callback when save is successful */
  onSave: (person: Person) => void;
  /** Optional: User's role in the tree for permission-based UI */
  userRole?: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

// Default form values for new person
const DEFAULT_FORM_DATA: PersonFormData = {
  firstName: '',
  middleName: '',
  lastName: '',
  maidenName: '',
  suffix: '',
  nickname: '',
  gender: 'UNKNOWN',
  birthDate: '',
  birthPlace: '',
  deathDate: '',
  deathPlace: '',
  isLiving: true,
  biography: '',
  occupation: '',
  education: '',
  privacy: 'FAMILY_ONLY',
};

// Convert Date to YYYY-MM-DD string for input[type="date"]
function dateToInputValue(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

// Convert Person to FormData
function personToFormData(person: Person | null): PersonFormData {
  if (!person) return DEFAULT_FORM_DATA;

  return {
    firstName: person.firstName || '',
    middleName: person.middleName || '',
    lastName: person.lastName || '',
    maidenName: person.maidenName || '',
    suffix: person.suffix || '',
    nickname: person.nickname || '',
    gender: person.gender || 'UNKNOWN',
    birthDate: dateToInputValue(person.birthDate),
    birthPlace: person.birthPlace || '',
    deathDate: dateToInputValue(person.deathDate),
    deathPlace: person.deathPlace || '',
    isLiving: person.isLiving ?? true,
    biography: person.biography || '',
    occupation: person.occupation || '',
    education: person.education || '',
    privacy: person.privacy || 'FAMILY_ONLY',
  };
}

// Gender options
const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

// Privacy options with descriptions
const PRIVACY_OPTIONS: { value: PersonPrivacy; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'PUBLIC',
    label: 'Public',
    description: 'Visible to anyone viewing the tree',
    icon: <Eye className="w-4 h-4 text-emerald-600" />,
  },
  {
    value: 'FAMILY_ONLY',
    label: 'Family Only',
    description: 'Visible only to tree members and admins',
    icon: <Shield className="w-4 h-4 text-amber-600" />,
  },
  {
    value: 'PRIVATE',
    label: 'Private',
    description: 'Visible only to admins',
    icon: <Lock className="w-4 h-4 text-red-600" />,
  },
];

// Suffix options
const SUFFIX_OPTIONS = ['', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V', 'PhD', 'MD', 'Esq.'];

export function PersonEditDialog({
  person,
  treeId,
  open,
  onClose,
  onSave,
  userRole = 'MEMBER',
}: PersonEditDialogProps) {
  const [formData, setFormData] = useState<PersonFormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const isEditMode = Boolean(person?.id);

  // Initialize form data when person changes
  useEffect(() => {
    if (open) {
      setFormData(personToFormData(person));
      setErrors({});
      setIsDirty(false);
    }
  }, [person, open]);

  // Handle field changes
  const handleChange = useCallback((
    field: keyof PersonFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Auto-set isLiving to false when deathDate is provided
      if (field === 'deathDate' && value) {
        newData.isLiving = false;
      }

      // Clear deathDate and deathPlace if isLiving is toggled to true
      if (field === 'isLiving' && value === true) {
        newData.deathDate = '';
        newData.deathPlace = '';
      }

      return newData;
    });
    setIsDirty(true);

    // Clear field-specific error when field is edited
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Client-side validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FieldErrors = {};

    // Required fields
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length > 100) {
      newErrors.firstName = 'First name must be 100 characters or less';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length > 100) {
      newErrors.lastName = 'Last name must be 100 characters or less';
    }

    // Optional field length limits
    if (formData.middleName && formData.middleName.length > 100) {
      newErrors.middleName = 'Middle name must be 100 characters or less';
    }

    if (formData.maidenName && formData.maidenName.length > 100) {
      newErrors.maidenName = 'Maiden name must be 100 characters or less';
    }

    if (formData.nickname && formData.nickname.length > 100) {
      newErrors.nickname = 'Nickname must be 100 characters or less';
    }

    if (formData.birthPlace && formData.birthPlace.length > 255) {
      newErrors.birthPlace = 'Birth place must be 255 characters or less';
    }

    if (formData.deathPlace && formData.deathPlace.length > 255) {
      newErrors.deathPlace = 'Death place must be 255 characters or less';
    }

    if (formData.biography && formData.biography.length > 10000) {
      newErrors.biography = 'Biography must be 10,000 characters or less';
    }

    if (formData.occupation && formData.occupation.length > 255) {
      newErrors.occupation = 'Occupation must be 255 characters or less';
    }

    if (formData.education && formData.education.length > 255) {
      newErrors.education = 'Education must be 255 characters or less';
    }

    // Date validations
    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();

      if (birthDate > today) {
        newErrors.birthDate = 'Birth date cannot be in the future';
      }

      // Check for unreasonably old ages (150+ years)
      const maxAge = 150;
      const oldestPossibleBirth = new Date();
      oldestPossibleBirth.setFullYear(oldestPossibleBirth.getFullYear() - maxAge);
      if (birthDate < oldestPossibleBirth) {
        newErrors.birthDate = 'Birth date seems unreasonably old (over 150 years ago)';
      }
    }

    if (formData.deathDate) {
      const deathDate = new Date(formData.deathDate);
      const today = new Date();

      if (deathDate > today) {
        newErrors.deathDate = 'Death date cannot be in the future';
      }

      // Death must be after birth
      if (formData.birthDate) {
        const birthDate = new Date(formData.birthDate);
        if (deathDate < birthDate) {
          newErrors.deathDate = 'Death date must be after birth date';
        }
      }
    }

    // Privacy restrictions for non-admins
    if (formData.privacy === 'PRIVATE' && userRole !== 'ADMIN') {
      newErrors.privacy = 'Only administrators can set privacy to Private';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, userRole]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        maidenName: formData.maidenName.trim() || undefined,
        suffix: formData.suffix || undefined,
        nickname: formData.nickname.trim() || undefined,
        gender: formData.gender,
        birthDate: formData.birthDate || undefined,
        birthPlace: formData.birthPlace.trim() || undefined,
        deathDate: formData.deathDate || undefined,
        deathPlace: formData.deathPlace.trim() || undefined,
        isLiving: formData.isLiving,
        biography: formData.biography.trim() || undefined,
        occupation: formData.occupation.trim() || undefined,
        education: formData.education.trim() || undefined,
        privacy: formData.privacy,
        treeId,
      };

      const url = isEditMode
        ? `${API_URL}/api/people/${person!.id}`
        : `${API_URL}/api/people`;

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle API validation errors
        if (data.details && Array.isArray(data.details)) {
          const fieldErrors: FieldErrors = {};
          data.details.forEach((detail: { path: string[]; message: string }) => {
            const field = detail.path[0] as keyof FieldErrors;
            fieldErrors[field] = detail.message;
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ general: data.message || 'Failed to save person' });
        }
        return;
      }

      onSave(data.data);
      onClose();
    } catch (error) {
      console.error('Failed to save person:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (isDirty && !isSubmitting) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Determine if we can set privacy to PRIVATE
  const canSetPrivate = userRole === 'ADMIN';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="person-edit-dialog">
        <DialogHeader>
          <DialogTitle data-testid="person-edit-dialog-title">
            {isEditMode ? 'Edit Person' : 'Add New Person'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the details for this person in your family tree.'
              : 'Add a new person to your family tree.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General error */}
          {errors.general && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700" data-testid="person-edit-general-error">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{errors.general}</span>
            </div>
          )}

          {/* Names Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Names</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-1">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  data-testid="person-edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="John"
                  maxLength={100}
                  className={errors.firstName ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500" data-testid="person-edit-firstName-error">{errors.firstName}</p>
                )}
              </div>

              {/* Middle Name */}
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  data-testid="person-edit-middleName"
                  value={formData.middleName}
                  onChange={(e) => handleChange('middleName', e.target.value)}
                  placeholder="William"
                  maxLength={100}
                  className={errors.middleName ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.middleName && (
                  <p className="text-xs text-red-500">{errors.middleName}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center gap-1">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  data-testid="person-edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Smith"
                  maxLength={100}
                  className={errors.lastName ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500" data-testid="person-edit-lastName-error">{errors.lastName}</p>
                )}
              </div>

              {/* Maiden Name */}
              <div className="space-y-2">
                <Label htmlFor="maidenName">Maiden Name</Label>
                <Input
                  id="maidenName"
                  data-testid="person-edit-maidenName"
                  value={formData.maidenName}
                  onChange={(e) => handleChange('maidenName', e.target.value)}
                  placeholder="Johnson"
                  maxLength={100}
                  className={errors.maidenName ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.maidenName && (
                  <p className="text-xs text-red-500">{errors.maidenName}</p>
                )}
              </div>

              {/* Suffix */}
              <div className="space-y-2">
                <Label htmlFor="suffix">Suffix</Label>
                <Select
                  value={formData.suffix}
                  onValueChange={(value) => handleChange('suffix', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="suffix" data-testid="person-edit-suffix">
                    <SelectValue placeholder="Select suffix..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SUFFIX_OPTIONS.map((suffix) => (
                      <SelectItem key={suffix || 'none'} value={suffix || 'none'}>
                        {suffix || 'None'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nickname */}
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname</Label>
                <Input
                  id="nickname"
                  data-testid="person-edit-nickname"
                  value={formData.nickname}
                  onChange={(e) => handleChange('nickname', e.target.value)}
                  placeholder="Johnny"
                  maxLength={100}
                  className={errors.nickname ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.nickname && (
                  <p className="text-xs text-red-500">{errors.nickname}</p>
                )}
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleChange('gender', value as Gender)}
                disabled={isSubmitting}
              >
                <SelectTrigger data-testid="person-edit-gender">
                  <SelectValue placeholder="Select gender..." />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Life Events Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Life Events</h3>

            {/* Is Living Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="isLiving" className="cursor-pointer">Living</Label>
                <span title="Toggle off if this person is deceased">
                  <Info className="w-4 h-4 text-gray-400" />
                </span>
              </div>
              <Switch
                id="isLiving"
                data-testid="person-edit-isLiving"
                checked={formData.isLiving}
                onCheckedChange={(checked) => handleChange('isLiving', checked)}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Birth Date */}
              <div className="space-y-2">
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  data-testid="person-edit-birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                  className={errors.birthDate ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.birthDate && (
                  <p className="text-xs text-red-500" data-testid="person-edit-birthDate-error">{errors.birthDate}</p>
                )}
              </div>

              {/* Birth Place */}
              <div className="space-y-2">
                <Label htmlFor="birthPlace">Birth Place</Label>
                <Input
                  id="birthPlace"
                  data-testid="person-edit-birthPlace"
                  value={formData.birthPlace}
                  onChange={(e) => handleChange('birthPlace', e.target.value)}
                  placeholder="City, State, Country"
                  maxLength={255}
                  className={errors.birthPlace ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.birthPlace && (
                  <p className="text-xs text-red-500">{errors.birthPlace}</p>
                )}
              </div>

              {/* Death Date */}
              <div className="space-y-2">
                <Label htmlFor="deathDate" className={formData.isLiving ? 'text-gray-400' : ''}>
                  Death Date
                </Label>
                <Input
                  id="deathDate"
                  data-testid="person-edit-deathDate"
                  type="date"
                  value={formData.deathDate}
                  onChange={(e) => handleChange('deathDate', e.target.value)}
                  className={errors.deathDate ? 'border-red-500' : ''}
                  disabled={isSubmitting || formData.isLiving}
                />
                {errors.deathDate && (
                  <p className="text-xs text-red-500" data-testid="person-edit-deathDate-error">{errors.deathDate}</p>
                )}
              </div>

              {/* Death Place */}
              <div className="space-y-2">
                <Label htmlFor="deathPlace" className={formData.isLiving ? 'text-gray-400' : ''}>
                  Death Place
                </Label>
                <Input
                  id="deathPlace"
                  data-testid="person-edit-deathPlace"
                  value={formData.deathPlace}
                  onChange={(e) => handleChange('deathPlace', e.target.value)}
                  placeholder="City, State, Country"
                  maxLength={255}
                  className={errors.deathPlace ? 'border-red-500' : ''}
                  disabled={isSubmitting || formData.isLiving}
                />
                {errors.deathPlace && (
                  <p className="text-xs text-red-500">{errors.deathPlace}</p>
                )}
              </div>
            </div>
          </div>

          {/* Biography & Professional Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Biography & Background</h3>

            {/* Occupation */}
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                data-testid="person-edit-occupation"
                value={formData.occupation}
                onChange={(e) => handleChange('occupation', e.target.value)}
                placeholder="Software Engineer, Teacher, Doctor..."
                maxLength={255}
                className={errors.occupation ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.occupation && (
                <p className="text-xs text-red-500">{errors.occupation}</p>
              )}
            </div>

            {/* Education */}
            <div className="space-y-2">
              <Label htmlFor="education">Education</Label>
              <Input
                id="education"
                data-testid="person-edit-education"
                value={formData.education}
                onChange={(e) => handleChange('education', e.target.value)}
                placeholder="Harvard University, PhD in Physics..."
                maxLength={255}
                className={errors.education ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.education && (
                <p className="text-xs text-red-500">{errors.education}</p>
              )}
            </div>

            {/* Biography */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="biography">Biography</Label>
                <span className="text-xs text-gray-500">
                  {formData.biography.length}/10,000 characters
                </span>
              </div>
              <Textarea
                id="biography"
                data-testid="person-edit-biography"
                value={formData.biography}
                onChange={(e) => handleChange('biography', e.target.value)}
                placeholder="Share the story of this person's life, achievements, interests, and memories..."
                maxLength={10000}
                className={`min-h-[120px] ${errors.biography ? 'border-red-500' : ''}`}
                disabled={isSubmitting}
              />
              {errors.biography && (
                <p className="text-xs text-red-500">{errors.biography}</p>
              )}
            </div>
          </div>

          {/* Privacy Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Privacy Settings</h3>

            <RadioGroup
              value={formData.privacy}
              onValueChange={(value) => handleChange('privacy', value as PersonPrivacy)}
              disabled={isSubmitting}
              className="space-y-3"
              data-testid="person-edit-privacy"
            >
              {PRIVACY_OPTIONS.map((option) => {
                const isDisabled = option.value === 'PRIVATE' && !canSetPrivate;
                return (
                  <div
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      formData.privacy === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`privacy-${option.value}`}
                      disabled={isDisabled}
                      data-testid={`person-edit-privacy-${option.value}`}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`privacy-${option.value}`}
                        className={`flex items-center gap-2 cursor-pointer ${
                          isDisabled ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        {option.icon}
                        {option.label}
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        {option.description}
                        {isDisabled && ' (Admin only)'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
            {errors.privacy && (
              <p className="text-xs text-red-500">{errors.privacy}</p>
            )}
          </div>

          {/* Form Actions */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              data-testid="person-edit-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="person-edit-save"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                isEditMode ? 'Save Changes' : 'Add Person'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PersonEditDialog;
