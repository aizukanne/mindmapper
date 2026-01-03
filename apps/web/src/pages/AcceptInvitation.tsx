import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Loader2, Users, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  invitedBy: string;
  tree: {
    id: string;
    name: string;
    description: string | null;
  };
  inviter: {
    name: string | null;
    email: string;
  };
}

export default function AcceptInvitation() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoaded } = CLERK_ENABLED ? useAuth() : { isLoaded: true };

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (isLoaded && invitationId && token) {
      fetchInvitation();
    }
  }, [isLoaded, invitationId, token]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/family-trees/invitations/${invitationId}?token=${token}`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setInvitation(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load invitation');
      }
    } catch (err) {
      console.error('Failed to fetch invitation:', err);
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!invitationId || !token) return;

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/family-trees/invitations/${invitationId}/accept`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
        }
      );

      if (response.ok) {
        await response.json();
        setSuccess(true);
        // Redirect to the family tree after 2 seconds
        setTimeout(() => {
          navigate(`/family-tree/${invitation?.tree.id}`);
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to accept invitation');
      }
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      setError('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!invitationId || !token) return;

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/family-trees/invitations/${invitationId}/decline`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
        }
      );

      if (response.ok) {
        // Redirect to family trees dashboard
        setTimeout(() => {
          navigate('/family-trees');
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to decline invitation');
      }
    } catch (err) {
      console.error('Failed to decline invitation:', err);
      setError('Failed to decline invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate('/family-trees')} variant="outline">
              Go to Family Trees
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Accepted!</h1>
            <p className="text-gray-600 mb-2">
              You've successfully joined {invitation?.tree.name}
            </p>
            <p className="text-sm text-gray-500 mb-6">Redirecting to the family tree...</p>
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-gray-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Not Found</h1>
            <p className="text-gray-600 mb-6">This invitation may have expired or been revoked.</p>
            <Button onClick={() => navigate('/family-trees')} variant="outline">
              Go to Family Trees
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Family Tree Invitation</h1>
          <p className="text-gray-600">
            {invitation.inviter.name || invitation.inviter.email} has invited you to join
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{invitation.tree.name}</h2>
          {invitation.tree.description && (
            <p className="text-gray-600 mb-4">{invitation.tree.description}</p>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              {invitation.role === 'ADMIN'
                ? 'Administrator'
                : invitation.role === 'MEMBER'
                ? 'Member'
                : 'Viewer'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="font-medium text-blue-900 mb-1">As a {invitation.role.toLowerCase()}, you will be able to:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              {invitation.role === 'ADMIN' && (
                <>
                  <li>View, add, and edit all family members</li>
                  <li>Manage relationships and tree settings</li>
                  <li>Invite and manage other members</li>
                </>
              )}
              {invitation.role === 'MEMBER' && (
                <>
                  <li>View all family members</li>
                  <li>Add and edit people and relationships</li>
                  <li>Contribute to the family tree</li>
                </>
              )}
              {invitation.role === 'VIEWER' && (
                <>
                  <li>View the family tree</li>
                  <li>See family member details</li>
                  <li>Browse relationships</li>
                </>
              )}
            </ul>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Accepting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
            <Button
              onClick={handleDecline}
              disabled={accepting}
              variant="outline"
              className="flex-1"
            >
              Decline
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            This invitation was sent to {invitation.email}
          </p>
        </div>
      </div>
    </div>
  );
}
