import { useState } from 'react';
import { Eye, Users, UserCheck, Shield, Lock, EyeOff, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PhotoPrivacy, TreePhoto } from '@mindmapper/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface PhotoPrivacySettingsProps {
  photo: TreePhoto;
  treeId: string;
  isMinor: boolean;
  onUpdate: () => void;
}

export function PhotoPrivacySettings({ photo, treeId, isMinor, onUpdate }: PhotoPrivacySettingsProps) {
  const [updating, setUpdating] = useState(false);
  const [requestingRemoval, setRequestingRemoval] = useState(false);

  const handlePrivacyChange = async (newPrivacy: PhotoPrivacy) => {
    setUpdating(true);
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/photos/${photo.id}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ privacy: newPrivacy }),
      });

      if (response.ok) {
        onUpdate();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update photo privacy');
      }
    } catch (error) {
      console.error('Failed to update photo privacy:', error);
      alert('Failed to update photo privacy');
    } finally {
      setUpdating(false);
    }
  };

  const handleRequestRemoval = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to request removal of this photo?\n\n' +
      'The photo will be marked for review and may be permanently deleted after 90 days if approved.'
    );

    if (!confirmed) return;

    setRequestingRemoval(true);
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/photos/${photo.id}/request-removal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        alert('Photo removal request submitted successfully');
        onUpdate();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to request photo removal');
      }
    } catch (error) {
      console.error('Failed to request photo removal:', error);
      alert('Failed to request photo removal');
    } finally {
      setRequestingRemoval(false);
    }
  };

  const getPrivacyIcon = (privacy: PhotoPrivacy) => {
    const privacyStr = privacy as string;
    if (privacyStr === 'PUBLIC') return <Eye className="w-4 h-4" />;
    if (privacyStr === 'ALL_FAMILY') return <Users className="w-4 h-4" />;
    if (privacyStr === 'DIRECT_RELATIVES') return <UserCheck className="w-4 h-4" />;
    if (privacyStr === 'ADMINS_ONLY') return <Shield className="w-4 h-4" />;
    if (privacyStr === 'PRIVATE') return <Lock className="w-4 h-4" />;
    if (privacyStr === 'NONE') return <EyeOff className="w-4 h-4" />;
    return <Eye className="w-4 h-4" />;
  };

  const getPrivacyColor = (privacy: PhotoPrivacy) => {
    const privacyStr = privacy as string;
    if (privacyStr === 'PUBLIC') return 'text-emerald-600';
    if (privacyStr === 'ALL_FAMILY') return 'text-blue-600';
    if (privacyStr === 'DIRECT_RELATIVES') return 'text-indigo-600';
    if (privacyStr === 'ADMINS_ONLY') return 'text-amber-600';
    if (privacyStr === 'PRIVATE') return 'text-red-600';
    if (privacyStr === 'NONE') return 'text-gray-600';
    return 'text-gray-600';
  };

  const privacyOptions: Array<{
    value: PhotoPrivacy;
    label: string;
    description: string;
    recommended?: boolean;
  }> = [
    {
      value: 'PUBLIC' as PhotoPrivacy,
      label: 'Public',
      description: 'Visible to everyone who can view the family tree',
    },
    {
      value: 'ALL_FAMILY' as PhotoPrivacy,
      label: 'All Family Members',
      description: 'Visible to all members and viewers of this family tree',
      recommended: !isMinor,
    },
    {
      value: 'DIRECT_RELATIVES' as PhotoPrivacy,
      label: 'Direct Relatives Only',
      description: 'Visible only to parents, children, siblings, and spouses',
      recommended: isMinor,
    },
    {
      value: 'ADMINS_ONLY' as PhotoPrivacy,
      label: 'Administrators Only',
      description: 'Visible only to family tree administrators',
    },
    {
      value: 'PRIVATE' as PhotoPrivacy,
      label: 'Private',
      description: 'Hidden from everyone except the person and admins',
    },
    {
      value: 'NONE' as PhotoPrivacy,
      label: 'Completely Hidden',
      description: 'Photo is marked for removal and hidden from all views',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Photo Privacy Settings</h4>

        {isMinor && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
            <p className="text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Minor Protection:</strong> This photo is of a minor. We recommend using "Direct Relatives Only" or more restrictive privacy settings.
              </span>
            </p>
          </div>
        )}

        <div className="space-y-3">
          {privacyOptions.map((option) => (
            <div key={option.value} className="flex items-start gap-3">
              <input
                type="radio"
                id={`photo-privacy-${option.value}`}
                name="photo-privacy"
                value={option.value}
                checked={photo.privacy === option.value}
                onChange={() => handlePrivacyChange(option.value)}
                disabled={updating}
                className="mt-1"
              />
              <label
                htmlFor={`photo-privacy-${option.value}`}
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className={getPrivacyColor(option.value)}>
                    {getPrivacyIcon(option.value)}
                  </span>
                  <span className="font-medium text-sm text-gray-900">
                    {option.label}
                    {option.recommended && (
                      <span className="ml-2 text-xs text-blue-600 font-normal">
                        (Recommended)
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
              </label>
            </div>
          ))}
        </div>

        {updating && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Updating privacy settings...</span>
          </div>
        )}
      </div>

      {/* Photo Removal Request */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Photo Removal</h4>
        <p className="text-xs text-gray-600 mb-3">
          Request permanent removal of this photo. The photo will be hidden immediately and permanently deleted after 90 days if the request is approved.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRequestRemoval}
          disabled={requestingRemoval || updating}
          className="text-red-600 border-red-300 hover:bg-red-50 w-full"
        >
          {requestingRemoval ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Requesting Removal...
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Request Photo Removal
            </>
          )}
        </Button>
      </div>

      {/* Privacy Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Photo privacy settings are separate from profile privacy. You can control who sees each photo individually.
          {isMinor && ' Photos of minors may require administrator approval before changes take effect.'}
        </p>
      </div>
    </div>
  );
}
