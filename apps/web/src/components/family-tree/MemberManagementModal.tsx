import { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Trash2, Loader2, Shield, Users as UsersIcon, Eye, Clock, CheckCircle, XCircle, AlertCircle, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TreeRole } from '@mindmapper/types';
import { getRoleName, getRoleDescription } from '@/lib/permissions';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

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

interface Invitation {
  id: string;
  email: string;
  role: TreeRole;
  status: InvitationStatus;
  inviteCode: string;
  expiresAt: string | null;
  createdAt: string;
  acceptedAt: string | null;
  inviter: {
    id: string;
    name: string | null;
    email: string;
  };
  acceptor?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
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
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TreeRole>('VIEWER');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  // Invitations state
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Fetch invitations on mount and when refreshing
  useEffect(() => {
    fetchInvitations();
  }, [treeId]);

  const fetchInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/invitations`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  };

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

        // Copy to clipboard
        try {
          await navigator.clipboard.writeText(inviteUrl);
          alert(`Invitation created and link copied to clipboard!\n\nShare this link with ${email}:\n${inviteUrl}`);
        } catch {
          alert(`Invitation sent! Share this link with ${email}:\n\n${inviteUrl}`);
        }

        setEmail('');
        setRole('VIEWER');
        setExpiresInDays(7);
        setShowInviteForm(false);
        fetchInvitations();
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

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Cancel the invitation to ${email}?`)) return;

    setCancellingId(invitationId);
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/invitations/${invitationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchInvitations();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to cancel invitation');
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      alert('Failed to cancel invitation');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCopyInviteLink = async (invitation: Invitation) => {
    const inviteUrl = `${window.location.origin}/invitations/${invitation.id}?token=${invitation.inviteCode}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert('Invitation link copied to clipboard!');
    } catch {
      alert(`Invitation link:\n${inviteUrl}`);
    }
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    // Create a new invitation with the same details
    setInviting(true);
    try {
      // First cancel the old one
      await fetch(`${API_URL}/api/family-trees/${treeId}/invitations/${invitation.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      // Then create a new one
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: invitation.email,
          role: invitation.role,
          expiresInDays: 7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newInvitation = data.data;
        const inviteUrl = `${window.location.origin}/invitations/${newInvitation.id}?token=${newInvitation.inviteCode}`;

        try {
          await navigator.clipboard.writeText(inviteUrl);
          alert(`New invitation created and link copied to clipboard!\n\nShare this link with ${invitation.email}:\n${inviteUrl}`);
        } catch {
          alert(`New invitation created! Share this link with ${invitation.email}:\n\n${inviteUrl}`);
        }

        fetchInvitations();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      alert('Failed to resend invitation');
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

  const getStatusIcon = (status: InvitationStatus) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'ACCEPTED':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'DECLINED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'EXPIRED':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadgeColor = (status: InvitationStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'DECLINED':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getStatusLabel = (status: InvitationStatus) => {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'ACCEPTED':
        return 'Accepted';
      case 'DECLINED':
        return 'Declined';
      case 'EXPIRED':
        return 'Expired';
    }
  };

  const isExpired = (invitation: Invitation) => {
    if (!invitation.expiresAt) return false;
    return new Date(invitation.expiresAt) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  const pendingInvitations = invitations.filter(inv => inv.status === 'PENDING' && !isExpired(inv));
  const otherInvitations = invitations.filter(inv => inv.status !== 'PENDING' || isExpired(inv));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manage Members</h2>
              <p className="text-sm text-gray-600 mt-1">{treeName}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'members'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'invitations'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Invitations
              {pendingInvitations.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                  {pendingInvitations.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'members' ? (
            <>
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
                        data-testid={`member-${member.id}`}
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
                                data-testid={`role-select-${member.id}`}
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
                              data-testid={`remove-member-${member.id}`}
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
            </>
          ) : (
            /* Invitations Tab */
            <div>
              {loadingInvitations ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                  <span className="ml-2 text-gray-500">Loading invitations...</span>
                </div>
              ) : (
                <>
                  {/* Pending Invitations */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Pending Invitations ({pendingInvitations.length})
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchInvitations}
                        className="text-gray-500"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>

                    {pendingInvitations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                        <Mail className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>No pending invitations</p>
                        <p className="text-sm mt-1">Invite someone to collaborate on this tree</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingInvitations.map((invitation) => (
                          <div
                            key={invitation.id}
                            className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200"
                            data-testid={`invitation-${invitation.id}`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {/* Email Icon */}
                              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-yellow-600" />
                              </div>

                              {/* Invitation Info */}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {invitation.email}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${getRoleBadgeColor(invitation.role)}`}>
                                    {getRoleIcon(invitation.role)}
                                    {getRoleName(invitation.role)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Sent {formatTimeAgo(invitation.createdAt)}
                                  </span>
                                  {invitation.expiresAt && (
                                    <span className="text-xs text-gray-500">
                                      · Expires {formatDate(invitation.expiresAt)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getStatusBadgeColor('PENDING')}`}>
                                {getStatusIcon('PENDING')}
                                {getStatusLabel('PENDING')}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="ml-4 flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyInviteLink(invitation)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Copy invite link"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                                disabled={cancellingId === invitation.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Cancel invitation"
                                data-testid={`cancel-invitation-${invitation.id}`}
                              >
                                {cancellingId === invitation.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Past Invitations */}
                  {otherInvitations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        Past Invitations ({otherInvitations.length})
                      </h3>
                      <div className="space-y-2">
                        {otherInvitations.map((invitation) => {
                          const expired = isExpired(invitation);
                          const effectiveStatus = expired && invitation.status === 'PENDING' ? 'EXPIRED' : invitation.status;

                          return (
                            <div
                              key={invitation.id}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                              data-testid={`past-invitation-${invitation.id}`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                {/* Email Icon */}
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                  <Mail className="w-5 h-5 text-gray-500" />
                                </div>

                                {/* Invitation Info */}
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {invitation.email}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${getRoleBadgeColor(invitation.role)}`}>
                                      {getRoleIcon(invitation.role)}
                                      {getRoleName(invitation.role)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      Sent {formatTimeAgo(invitation.createdAt)}
                                    </span>
                                    {invitation.acceptedAt && (
                                      <span className="text-xs text-gray-500">
                                        · Accepted {formatDate(invitation.acceptedAt)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Status Badge */}
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getStatusBadgeColor(effectiveStatus)}`}>
                                  {getStatusIcon(effectiveStatus)}
                                  {getStatusLabel(effectiveStatus)}
                                </div>
                              </div>

                              {/* Actions for expired invitations */}
                              {effectiveStatus === 'EXPIRED' && (
                                <div className="ml-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResendInvitation(invitation)}
                                    disabled={inviting}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    title="Resend invitation"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
