import { useState } from 'react';
import { X, UserPlus, Mail, Trash2, Loader2, Shield, Users as UsersIcon, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TreeRole } from '@mindmapper/types';
import { getRoleName, getRoleDescription } from '@/lib/permissions';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Member {
  id: string;
  role: TreeRole;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

interface MemberManagementModalProps {
  treeId: string;
  treeName: string;
  members: Member[];
  currentUserId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export function MemberManagementModal({
  treeId,
  treeName,
  members,
  currentUserId,
  onClose,
  onRefresh,
}: MemberManagementModalProps) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TreeRole>('VIEWER');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setInviting(true);
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          role,
          expiresInDays,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const invitation = data.data;

        // Generate invitation URL
        const inviteUrl = `${window.location.origin}/invitations/${invitation.id}?token=${invitation.inviteCode}`;

        alert(`Invitation sent! Share this link with ${email}:\n\n${inviteUrl}`);

        setEmail('');
        setRole('VIEWER');
        setExpiresInDays(7);
        setShowInviteForm(false);
        onRefresh();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      alert('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: TreeRole, memberName: string) => {
    if (!confirm(`Change ${memberName}'s role to ${getRoleName(newRole)}?`)) return;

    setChangingRoleId(memberId);
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        onRefresh();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to change role');
      }
    } catch (error) {
      console.error('Failed to change role:', error);
      alert('Failed to change role');
    } finally {
      setChangingRoleId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the family tree?')) return;

    setRemovingId(memberId);
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        onRefresh();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  const getRoleIcon = (role: TreeRole) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-red-600" />;
      case 'MEMBER':
        return <UsersIcon className="w-4 h-4 text-blue-600" />;
      case 'VIEWER':
        return <Eye className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: TreeRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'MEMBER':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Members</h2>
            <p className="text-sm text-gray-600 mt-1">{treeName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Invite Section */}
          {!showInviteForm ? (
            <div className="mb-6">
              <Button
                onClick={() => setShowInviteForm(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Invite Member
              </Button>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Invite New Member</h3>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="member@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as TreeRole)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="VIEWER">Viewer - Can view the tree</option>
                    <option value="MEMBER">Member - Can add and edit</option>
                    <option value="ADMIN">Administrator - Full access</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {getRoleDescription(role)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invitation Expires In
                  </label>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 day</option>
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={inviting || !email.trim()}>
                    {inviting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowInviteForm(false);
                      setEmail('');
                      setRole('VIEWER');
                    }}
                    disabled={inviting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Members List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Current Members ({members.length})
            </h3>
            <div className="space-y-2">
              {members.map((member) => {
                const isCurrentUser = member.userId === currentUserId;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                        {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {member.user.name || member.user.email}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-gray-500">(You)</span>
                            )}
                          </p>
                        </div>
                        {member.user.name && (
                          <p className="text-xs text-gray-500">{member.user.email}</p>
                        )}
                      </div>

                      {/* Role Selector or Badge */}
                      {!isCurrentUser ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleChangeRole(
                                member.id,
                                e.target.value as TreeRole,
                                member.user.name || member.user.email
                              )
                            }
                            disabled={changingRoleId === member.id}
                            className={`px-3 py-1 rounded-full border text-xs font-medium cursor-pointer ${getRoleBadgeColor(
                              member.role
                            )}`}
                          >
                            <option value="ADMIN">Administrator</option>
                            <option value="MEMBER">Member</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                          {changingRoleId === member.id && (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                          )}
                        </div>
                      ) : (
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getRoleBadgeColor(member.role)}`}>
                          {getRoleIcon(member.role)}
                          <span className="text-xs font-medium">{getRoleName(member.role)}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {!isCurrentUser && (
                      <div className="ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removingId === member.id || changingRoleId === member.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {removingId === member.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
