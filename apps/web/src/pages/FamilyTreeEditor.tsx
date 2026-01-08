import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Settings, Loader2, UserPlus, Link as LinkIcon, X, Heart, User, Baby, Home, Shield, Lock, Eye, Download, Trash2, UserX, Image, Upload, Edit2, LayoutGrid, GitBranch, ImageIcon, Wrench, AlertTriangle, Search } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { useTreePermissions } from '@/hooks/useTreePermissions';
import { MemberManagementModal } from '@/components/family-tree/MemberManagementModal';
import { PhotoPrivacySettings } from '@/components/tree/PhotoPrivacySettings';
import { FamilyTreeCanvas } from '@/components/tree/FamilyTreeCanvas';
import { PhotoGallery } from '@/components/tree/PhotoGallery';
import { HowAreWeRelatedModal } from '@/components/family-tree/HowAreWeRelatedModal';
import { RelationshipSearchModal } from '@/components/family-tree/RelationshipSearchModal';
import { calculateAge } from '@/lib/dateUtils';
import type { FamilyTree, Person, Relationship, RelationshipType, TreeRole, TreePhoto } from '@mindmapper/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface PersonWithRelationships extends Person {
  relationshipsFrom?: Array<Relationship & { personTo: Person }>;
  relationshipsTo?: Array<Relationship & { personFrom: Person }>;
}

interface FamilyTreeWithData extends FamilyTree {
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  people: PersonWithRelationships[];
  relationships: Relationship[];
  marriages?: Array<{
    id: string;
    marriageDate?: Date | null;
    marriagePlace?: string | null;
    divorceDate?: Date | null;
    divorcePlace?: string | null;
    notes?: string | null;
    createdAt: Date;
    updatedAt: Date;
    spouses?: Array<{ id: string; firstName: string; lastName: string }>;
  }>;
  members: Array<{
    id: string;
    role: TreeRole;
    userId: string;
  }>;
  _currentUser?: {
    userId: string;
    isCreator: boolean;
    role: TreeRole | null;
    memberId: string | null;
  };
}

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export default function FamilyTreeEditor() {
  const { treeId } = useParams<{ treeId: string }>();
  const navigate = useNavigate();
  const { userId } = CLERK_ENABLED ? useAuth() : { userId: 'dev-user-id' };
  const [tree, setTree] = useState<FamilyTreeWithData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonWithRelationships | null>(null);
  const [isAddRelationshipModalOpen, setIsAddRelationshipModalOpen] = useState(false);
  const [isMemberManagementOpen, setIsMemberManagementOpen] = useState(false);
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);
  const [isAddSpouseModalOpen, setIsAddSpouseModalOpen] = useState(false);
  const [isAddSiblingModalOpen, setIsAddSiblingModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'grid' | 'photos'>('canvas');
  const [isMissingParentsModalOpen, setIsMissingParentsModalOpen] = useState(false);
  const [isHowRelatedModalOpen, setIsHowRelatedModalOpen] = useState(false);
  const [isRelationshipSearchModalOpen, setIsRelationshipSearchModalOpen] = useState(false);

  // Get user's role in this tree (use server-computed values if available)
  const userRole = tree?._currentUser?.role || null;
  const isCreator = tree?._currentUser?.isCreator ?? false;

  // Get permissions
  const permissions = useTreePermissions({
    userId: userId || null,
    treeCreatorId: tree?.createdBy || '',
    userRole,
    isCreator,
  });

  useEffect(() => {
    if (treeId) {
      fetchTree();
    }
  }, [treeId]);

  const fetchTree = async () => {
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTree(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch family tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPerson = async (personData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(personData),
      });
      if (response.ok) {
        fetchTree();
        setIsAddPersonModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to add person:', error);
    }
  };

  const handleExportFullTree = () => {
    if (!tree) return;

    try {
      // Create comprehensive export data
      const exportData = {
        exportDate: new Date().toISOString(),
        exportType: 'FULL_TREE',
        tree: {
          id: tree.id,
          name: tree.name,
          description: tree.description,
          privacy: tree.privacy,
          createdAt: tree.createdAt,
          updatedAt: tree.updatedAt,
        },
        people: tree.people.map(person => ({
          id: person.id,
          firstName: person.firstName,
          middleName: person.middleName,
          lastName: person.lastName,
          maidenName: person.maidenName,
          suffix: person.suffix,
          nickname: person.nickname,
          gender: person.gender,
          birthDate: person.birthDate,
          birthPlace: person.birthPlace,
          deathDate: person.deathDate,
          deathPlace: person.deathPlace,
          isLiving: person.isLiving,
          biography: person.biography,
          occupation: person.occupation,
          education: person.education,
          privacy: person.privacy,
          generation: person.generation,
          positionX: person.positionX,
          positionY: person.positionY,
          createdAt: person.createdAt,
          updatedAt: person.updatedAt,
        })),
        relationships: tree.relationships.map(rel => ({
          id: rel.id,
          personFromId: rel.personFromId,
          personToId: rel.personToId,
          relationshipType: rel.relationshipType,
          notes: rel.notes,
          birthOrder: (rel as any).birthOrder,
          createdAt: rel.createdAt,
          updatedAt: rel.updatedAt,
        })),
        marriages: tree.marriages?.map(marriage => ({
          id: marriage.id,
          marriageDate: marriage.marriageDate,
          marriagePlace: marriage.marriagePlace,
          divorceDate: marriage.divorceDate,
          divorcePlace: marriage.divorcePlace,
          notes: marriage.notes,
          createdAt: marriage.createdAt,
          updatedAt: marriage.updatedAt,
        })) || [],
        statistics: {
          totalPeople: tree.people.length,
          totalRelationships: tree.relationships.length,
          livingPeople: tree.people.filter(p => p.isLiving).length,
          generations: Math.max(...tree.people.map(p => p.generation), 0),
        },
      };

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tree.name.replace(/[^a-z0-9]/gi, '_')}_full_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export tree:', error);
      alert('Failed to export family tree data');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isRepairingSiblings, setIsRepairingSiblings] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRepairSiblings = async () => {
    if (!tree) return;

    const confirmRepair = window.confirm(
      'This will comprehensively repair sibling and parent relationships:\n\n' +
      'Phase 1: Transitive Sibling Linking\n' +
      '• If A is a full sibling of B, and B is a full sibling of C, then A should also be linked to C\n\n' +
      'Phase 2: Copy Parents from Full Siblings\n' +
      '• If someone has a full sibling who has parents, copy those parents to them\n\n' +
      'Phase 3: Create Missing Sibling Links\n' +
      '• Create sibling relationships for people who share parents but aren\'t linked\n\n' +
      'This is useful if:\n' +
      '• Some siblings are only linked to one sibling, not all\n' +
      '• Some people are missing parent connections\n' +
      '• Sibling relationships are incomplete\n\n' +
      'Continue?'
    );

    if (!confirmRepair) return;

    setIsRepairingSiblings(true);
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/repair-siblings`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to repair relationships');
      }

      const result = await response.json();

      const { parentsAdded, siblingsCreated, duplicatesRemoved, parentRelationships, siblingRelationships } = result.data;

      if (parentsAdded > 0 || siblingsCreated > 0 || duplicatesRemoved > 0) {
        let message = `Successfully repaired relationships:\n\n`;

        if (duplicatesRemoved > 0) {
          message += `Duplicate relationships removed: ${duplicatesRemoved}\n\n`;
        }

        if (parentsAdded > 0) {
          message += `Parent links added (${parentsAdded}):\n`;
          message += parentRelationships.map((r: { person: string; parent: string }) =>
            `• ${r.person} → ${r.parent}`
          ).join('\n');
          message += '\n\n';
        }

        if (siblingsCreated > 0) {
          message += `Sibling links created (${siblingsCreated}):\n`;
          message += siblingRelationships.map((r: { from: string; to: string; type: string }) =>
            `• ${r.from} ↔ ${r.to} (${r.type})`
          ).join('\n');
        }

        alert(message);
        // Refresh the tree to show the new relationships
        fetchTree();
      } else {
        alert('No issues found. All relationships are properly linked with no duplicates.');
      }
    } catch (error) {
      console.error('Failed to repair relationships:', error);
      alert(error instanceof Error ? error.message : 'Failed to repair relationships');
    } finally {
      setIsRepairingSiblings(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Family tree not found</h2>
          <Button onClick={() => navigate('/family-trees')}>Back to Family Trees</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/family-trees')}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tree.name}</h1>
            {tree.description && (
              <p className="text-sm text-gray-600">{tree.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'canvas' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('canvas')}
              className="flex items-center gap-1.5"
              title="Tree View"
            >
              <GitBranch className="w-4 h-4" />
              Tree
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-1.5"
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'photos' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('photos')}
              className="flex items-center gap-1.5"
              title="Photo Gallery"
              data-testid="photos-view-button"
            >
              <ImageIcon className="w-4 h-4" />
              Photos
            </Button>
          </div>
          {/* Relationship Search Tools */}
          {tree.people.length >= 2 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRelationshipSearchModalOpen(true)}
                className="flex items-center gap-1.5"
                title="Find relatives by relationship type"
              >
                <Search className="w-4 h-4" />
                Find Relatives
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHowRelatedModalOpen(true)}
                className="flex items-center gap-1.5"
                title="See how two people are related"
              >
                <GitBranch className="w-4 h-4" />
                How Related?
              </Button>
            </>
          )}
          {permissions.canAddPeople && (
            <Button
              onClick={() => setIsAddPersonModalOpen(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Person
            </Button>
          )}
          {permissions.isAdmin && (
            <Button
              variant="outline"
              onClick={handleExportFullTree}
              className="flex items-center gap-2"
              title="Export entire family tree (Admin only)"
            >
              <Download className="w-4 h-4" />
              Export Tree
            </Button>
          )}
          {permissions.isAdmin && (
            <Button
              variant="outline"
              onClick={handleRepairSiblings}
              disabled={isRepairingSiblings}
              className="flex items-center gap-2"
              title="Repair missing parent links and sibling relationships"
            >
              {isRepairingSiblings ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wrench className="w-4 h-4" />
              )}
              {isRepairingSiblings ? 'Repairing...' : 'Repair Relationships'}
            </Button>
          )}
          {permissions.isAdmin && (
            <Button
              variant="outline"
              onClick={() => setIsMissingParentsModalOpen(true)}
              className="flex items-center gap-2"
              title="View and fix people missing parent relationships"
            >
              <AlertTriangle className="w-4 h-4" />
              Missing Parents
            </Button>
          )}
          {permissions.canManageMembers && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsMemberManagementOpen(true)}
              title="Manage Members"
              data-testid="manage-members-button"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {tree.people.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <Users className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No people in this tree yet</h2>
            <p className="text-gray-500 mb-6">
              {permissions.canAddPeople
                ? 'Add your first family member to get started'
                : 'This tree has no people yet'}
            </p>
            {permissions.canAddPeople && (
              <Button
                onClick={() => setIsAddPersonModalOpen(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Person
              </Button>
            )}
          </div>
        ) : viewMode === 'canvas' ? (
          /* Canvas/Tree View */
          <FamilyTreeCanvas
            treeId={tree.id}
            people={tree.people}
            relationships={tree.relationships}
            selectedPersonId={selectedPerson?.id}
            onPersonClick={(person) => setSelectedPerson(person as PersonWithRelationships)}
            onBackgroundClick={() => setSelectedPerson(null)}
            className="w-full h-full"
          />
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="max-w-6xl mx-auto p-6 overflow-auto h-full">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Family Members</h2>
                <span className="text-sm text-gray-600">{tree.people.length} people</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tree.people.map((person) => (
                  <div
                    key={person.id}
                    onClick={() => setSelectedPerson(person)}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold text-gray-700">
                        {person.firstName.charAt(0)}{person.lastName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {person.firstName} {person.middleName ? `${person.middleName} ` : ''}{person.lastName}
                          {person.suffix ? ` ${person.suffix}` : ''}
                        </h3>
                        {person.nickname && (
                          <p className="text-sm text-gray-600">"{person.nickname}"</p>
                        )}
                        {person.birthDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Born: {new Date(person.birthDate).toLocaleDateString()}
                            {person.birthPlace && ` in ${person.birthPlace}`}
                          </p>
                        )}
                        {!person.isLiving && person.deathDate && (
                          <p className="text-xs text-gray-500">
                            Died: {new Date(person.deathDate).toLocaleDateString()}
                            {person.deathPlace && ` in ${person.deathPlace}`}
                          </p>
                        )}
                        {person.birthDate && (
                          <p className="text-xs text-gray-600 mt-1 font-medium">
                            {calculateAge(person.birthDate, person.isLiving ? null : person.deathDate)}
                          </p>
                        )}
                        {person.occupation && (
                          <p className="text-xs text-gray-600 mt-1">{person.occupation}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            person.gender === 'MALE' ? 'bg-blue-100 text-blue-700' :
                            person.gender === 'FEMALE' ? 'bg-pink-100 text-pink-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {person.gender === 'MALE' ? 'Male' :
                             person.gender === 'FEMALE' ? 'Female' :
                             person.gender === 'OTHER' ? 'Other' : 'Unknown'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            Gen {person.generation}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : viewMode === 'photos' ? (
          /* Photos View */
          <div className="max-w-7xl mx-auto p-6 overflow-auto h-full" data-testid="photo-gallery-view">
            <PhotoGallery
              treeId={tree.id}
              people={tree.people}
              onPersonClick={(personId) => {
                const person = tree.people.find(p => p.id === personId);
                if (person) setSelectedPerson(person);
              }}
              isAdmin={permissions.isAdmin}
            />
          </div>
        ) : null}
      </main>

      {/* Add Person Modal */}
      {isAddPersonModalOpen && (
        <AddPersonModal
          onClose={() => setIsAddPersonModalOpen(false)}
          onSubmit={handleAddPerson}
        />
      )}

      {/* Person Detail Modal */}
      {selectedPerson && tree && (
        <PersonDetailModal
          person={selectedPerson}
          tree={tree}
          onClose={() => setSelectedPerson(null)}
          onAddRelationship={() => {
            setIsAddRelationshipModalOpen(true);
          }}
          onAddChild={() => {
            setIsAddChildModalOpen(true);
          }}
          onAddSpouse={() => {
            setIsAddSpouseModalOpen(true);
          }}
          onAddSibling={() => {
            setIsAddSiblingModalOpen(true);
          }}
          onRefresh={fetchTree}
          canAddRelationships={permissions.canAddRelationships}
          canAddAncestors={permissions.canAddAncestors}
          canAddDescendants={permissions.canAddDescendants}
          canEditPeople={permissions.canEditPeople}
          canDeleteRelationships={permissions.canDeleteRelationships}
        />
      )}

      {/* Add Relationship Modal */}
      {isAddRelationshipModalOpen && selectedPerson && tree && (
        <AddRelationshipModal
          person={selectedPerson}
          allPeople={tree.people}
          treeId={treeId!}
          onClose={() => setIsAddRelationshipModalOpen(false)}
          onSuccess={() => {
            setIsAddRelationshipModalOpen(false);
            fetchTree();
          }}
        />
      )}

      {/* Add Child Modal */}
      {isAddChildModalOpen && selectedPerson && tree && (
        <AddChildModal
          parentPerson={selectedPerson}
          treeId={treeId!}
          allPeople={tree.people}
          relationships={tree.relationships}
          onClose={() => setIsAddChildModalOpen(false)}
          onSuccess={() => {
            setIsAddChildModalOpen(false);
            fetchTree();
          }}
        />
      )}

      {/* Add Spouse Modal */}
      {isAddSpouseModalOpen && selectedPerson && tree && (
        <AddSpouseModal
          person={selectedPerson}
          treeId={treeId!}
          relationships={tree.relationships}
          marriages={tree.marriages}
          onClose={() => setIsAddSpouseModalOpen(false)}
          onSuccess={() => {
            setIsAddSpouseModalOpen(false);
            fetchTree();
          }}
        />
      )}

      {/* Add Sibling Modal */}
      {isAddSiblingModalOpen && selectedPerson && tree && (
        <AddSiblingModal
          person={selectedPerson}
          treeId={treeId!}
          allPeople={tree.people}
          relationships={tree.relationships}
          onClose={() => setIsAddSiblingModalOpen(false)}
          onSuccess={() => {
            setIsAddSiblingModalOpen(false);
            fetchTree();
          }}
        />
      )}

      {/* Member Management Modal */}
      {isMemberManagementOpen && tree && (
        <MemberManagementModal
          treeId={tree.id}
          treeName={tree.name}
          members={tree.members as any}
          currentUserId={userId || ''}
          onClose={() => setIsMemberManagementOpen(false)}
          onRefresh={fetchTree}
        />
      )}

      {/* Missing Parents Modal */}
      {isMissingParentsModalOpen && tree && (
        <MissingParentsModal
          treeId={tree.id}
          onClose={() => setIsMissingParentsModalOpen(false)}
          onSelectPerson={(personId) => {
            // Find the person and open their detail modal
            const person = tree.people.find(p => p.id === personId);
            if (person) {
              setSelectedPerson(person);
            }
          }}
        />
      )}

      {/* How Are We Related Modal */}
      {isHowRelatedModalOpen && tree && (
        <HowAreWeRelatedModal
          treeId={tree.id}
          people={tree.people}
          initialPersonA={selectedPerson || undefined}
          onClose={() => setIsHowRelatedModalOpen(false)}
        />
      )}

      {/* Relationship Search Modal */}
      {isRelationshipSearchModalOpen && tree && (
        <RelationshipSearchModal
          treeId={tree.id}
          people={tree.people}
          initialPerson={selectedPerson || undefined}
          onClose={() => setIsRelationshipSearchModalOpen(false)}
          onPersonSelect={(person) => {
            // Find the full person data and open their detail modal
            const fullPerson = tree.people.find(p => p.id === person.id);
            if (fullPerson) {
              setSelectedPerson(fullPerson);
              setIsRelationshipSearchModalOpen(false);
            }
          }}
        />
      )}
    </div>
  );
}

interface AddPersonModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

function AddPersonModal({ onClose, onSubmit }: AddPersonModalProps) {
  const [formData, setFormData] = useState({
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
    privacy: 'PUBLIC',
    generation: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      gender: formData.gender,
      isLiving: formData.isLiving,
      privacy: formData.privacy,
      generation: formData.generation,
    };

    if (formData.middleName) data.middleName = formData.middleName;
    if (formData.maidenName) data.maidenName = formData.maidenName;
    if (formData.suffix) data.suffix = formData.suffix;
    if (formData.nickname) data.nickname = formData.nickname;
    if (formData.birthDate) data.birthDate = new Date(formData.birthDate).toISOString();
    if (formData.birthPlace) data.birthPlace = formData.birthPlace;
    if (formData.deathDate) data.deathDate = new Date(formData.deathDate).toISOString();
    if (formData.deathPlace) data.deathPlace = formData.deathPlace;
    if (formData.biography) data.biography = formData.biography;
    if (formData.occupation) data.occupation = formData.occupation;
    if (formData.education) data.education = formData.education;

    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Add Family Member</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maiden Name
                </label>
                <input
                  type="text"
                  value={formData.maidenName}
                  onChange={(e) => setFormData({ ...formData, maidenName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suffix
                </label>
                <input
                  type="text"
                  value={formData.suffix}
                  onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jr., Sr., III"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nickname
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UNKNOWN">Unknown</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Generation
                </label>
                <input
                  type="number"
                  value={formData.generation}
                  onChange={(e) => setFormData({ ...formData, generation: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Life Events */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Life Events</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isLiving"
                  checked={formData.isLiving}
                  onChange={(e) => setFormData({ ...formData, isLiving: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isLiving" className="text-sm font-medium text-gray-700">
                  Currently Living
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birth Place
                  </label>
                  <input
                    type="text"
                    value={formData.birthPlace}
                    onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {!formData.isLiving && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Death Date
                      </label>
                      <input
                        type="date"
                        value={formData.deathDate}
                        onChange={(e) => setFormData({ ...formData, deathDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Death Place
                      </label>
                      <input
                        type="text"
                        value={formData.deathPlace}
                        onChange={(e) => setFormData({ ...formData, deathPlace: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Additional Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occupation
                </label>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Education
                </label>
                <input
                  type="text"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Biography
                </label>
                <textarea
                  value={formData.biography}
                  onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Add Person
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface PersonDetailModalProps {
  person: PersonWithRelationships;
  tree: FamilyTreeWithData;
  onClose: () => void;
  onAddRelationship: () => void;
  onAddChild: () => void;
  onAddSpouse: () => void;
  onAddSibling: () => void;
  onRefresh: () => void;
  canAddRelationships: boolean;
  canAddAncestors: boolean;
  canAddDescendants: boolean;
  canEditPeople: boolean;
  canDeleteRelationships: boolean;
}

function PersonDetailModal({ person, tree, onClose, onAddRelationship, onAddChild, onAddSpouse, onAddSibling, onRefresh, canAddRelationships, canAddAncestors, canAddDescendants, canEditPeople, canDeleteRelationships }: PersonDetailModalProps) {
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingRelationship, setDeletingRelationship] = useState<string | null>(null);
  const [editingRelationship, setEditingRelationship] = useState<Relationship | null>(null);
  const [photos, setPhotos] = useState<TreePhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<TreePhoto | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if person has an active (non-divorced) spouse
  const existingSpouseIds = tree.relationships
    .filter(r => r.relationshipType === 'SPOUSE' && (r.personFromId === person.id || r.personToId === person.id))
    .map(r => r.personFromId === person.id ? r.personToId : r.personFromId);

  const hasActiveSpouse = existingSpouseIds.some(spouseId => {
    // Find marriage record between this person and the spouse
    const marriageRecord = tree.marriages?.find(m => {
      const spouseIdsInMarriage = m.spouses?.map(s => s.id) || [];
      return spouseIdsInMarriage.includes(person.id) && spouseIdsInMarriage.includes(spouseId);
    });

    // If there's no marriage record, the spouse relationship is still active
    if (!marriageRecord) return true;

    // If marriage record exists but no divorce date, spouse is still active
    return !marriageRecord.divorceDate;
  });

  const [editFormData, setEditFormData] = useState({
    firstName: person.firstName,
    middleName: person.middleName || '',
    lastName: person.lastName,
    maidenName: person.maidenName || '',
    suffix: person.suffix || '',
    nickname: person.nickname || '',
    gender: person.gender,
    birthDate: person.birthDate ? new Date(person.birthDate).toISOString().split('T')[0] : '',
    birthPlace: person.birthPlace || '',
    deathDate: person.deathDate ? new Date(person.deathDate).toISOString().split('T')[0] : '',
    deathPlace: person.deathPlace || '',
    isLiving: person.isLiving,
    biography: person.biography || '',
    occupation: person.occupation || '',
    education: person.education || '',
    privacy: person.privacy,
    generation: person.generation,
  });

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        gender: editFormData.gender,
        isLiving: editFormData.isLiving,
        privacy: editFormData.privacy,
        generation: editFormData.generation,
      };

      if (editFormData.middleName) data.middleName = editFormData.middleName;
      if (editFormData.maidenName) data.maidenName = editFormData.maidenName;
      if (editFormData.suffix) data.suffix = editFormData.suffix;
      if (editFormData.nickname) data.nickname = editFormData.nickname;
      if (editFormData.birthDate) data.birthDate = editFormData.birthDate;
      if (editFormData.birthPlace) data.birthPlace = editFormData.birthPlace;
      if (editFormData.deathDate) data.deathDate = editFormData.deathDate;
      if (editFormData.deathPlace) data.deathPlace = editFormData.deathPlace;
      if (editFormData.biography) data.biography = editFormData.biography;
      if (editFormData.occupation) data.occupation = editFormData.occupation;
      if (editFormData.education) data.education = editFormData.education;

      const response = await fetch(`${API_URL}/api/family-trees/${tree.id}/people/${person.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setIsEditing(false);
        onRefresh();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Failed to save person:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePrivacyChange = async (newPrivacy: 'PUBLIC' | 'FAMILY_ONLY' | 'PRIVATE') => {
    setUpdatingPrivacy(true);
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${tree.id}/people/${person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ privacy: newPrivacy }),
      });

      if (response.ok) {
        onRefresh();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update privacy settings');
      }
    } catch (error) {
      console.error('Failed to update privacy:', error);
      alert('Failed to update privacy settings');
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      // Get all relationships for this person
      const personRelationships = tree.relationships.filter(
        (rel) => rel.personFromId === person.id || rel.personToId === person.id
      );

      // Get all related people
      const relatedPeopleIds = new Set<string>();
      personRelationships.forEach(rel => {
        relatedPeopleIds.add(rel.personFromId);
        relatedPeopleIds.add(rel.personToId);
      });
      const relatedPeople = tree.people.filter(p => relatedPeopleIds.has(p.id));

      // Create export data
      const exportData = {
        exportDate: new Date().toISOString(),
        person: {
          id: person.id,
          firstName: person.firstName,
          middleName: person.middleName,
          lastName: person.lastName,
          maidenName: person.maidenName,
          suffix: person.suffix,
          nickname: person.nickname,
          gender: person.gender,
          birthDate: person.birthDate,
          birthPlace: person.birthPlace,
          deathDate: person.deathDate,
          deathPlace: person.deathPlace,
          isLiving: person.isLiving,
          biography: person.biography,
          occupation: person.occupation,
          education: person.education,
          privacy: person.privacy,
          generation: person.generation,
          createdAt: person.createdAt,
          updatedAt: person.updatedAt,
        },
        relationships: personRelationships.map(rel => ({
          id: rel.id,
          relationshipType: rel.relationshipType,
          notes: rel.notes,
          birthOrder: (rel as any).birthOrder,
          personFromId: rel.personFromId,
          personToId: rel.personToId,
          createdAt: rel.createdAt,
        })),
        relatedPeople: relatedPeople.map(p => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          relationship: personRelationships.find(rel =>
            rel.personFromId === p.id || rel.personToId === p.id
          )?.relationshipType,
        })),
      };

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${person.firstName}_${person.lastName}_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleGDPRDelete = async () => {
    const confirmed = window.confirm(
      `This will permanently delete all personal information for ${person.firstName} ${person.lastName}.\n\n` +
      `The person will be converted to a "Removed Member" placeholder to preserve family tree structure.\n\n` +
      `This action cannot be undone. Continue?`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${tree.id}/people/${person.id}/gdpr-delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        alert('Person data has been scheduled for deletion. The person will be converted to an anonymous placeholder.');
        onClose();
        onRefresh();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete person data');
      }
    } catch (error) {
      console.error('Failed to delete person:', error);
      alert('Failed to delete person data');
    } finally {
      setDeleting(false);
    }
  };

  const handleRemovePerson = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${person.firstName} ${person.lastName} from the family tree?\n\n` +
      `This will PERMANENTLY DELETE this person and ALL their relationships.\n\n` +
      `Unlike GDPR deletion, this completely removes the person from the tree. ` +
      `You can add them again later, but you'll need to recreate all their relationships.\n\n` +
      `This action cannot be undone. Continue?`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${tree.id}/people/${person.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        alert('Person has been removed from the family tree.');
        onClose();
        onRefresh();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to remove person');
      }
    } catch (error) {
      console.error('Failed to remove person:', error);
      alert('Failed to remove person');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteRelationship = async (relationshipId: string, relatedPersonName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove the relationship with ${relatedPersonName}?\n\n` +
      `This will delete both directions of this relationship.\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingRelationship(relationshipId);
    try {
      const response = await fetch(`${API_URL}/api/relationships/${relationshipId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        onRefresh();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete relationship');
      }
    } catch (error) {
      console.error('Failed to delete relationship:', error);
      alert('Failed to delete relationship');
    } finally {
      setDeletingRelationship(null);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('personId', person.id);

      const response = await fetch(`${API_URL}/api/family-trees/${tree.id}/photos`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setPhotos([...photos, data.data]);
        alert('Photo uploaded successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Failed to upload photo:', error);
      alert('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const fetchPhotos = async () => {
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${tree.id}/people/${person.id}/photos`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // API returns { data: { photos: [...], total, limit, offset } }
        setPhotos(data.data?.photos || []);
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    }
  };

  // Fetch photos when modal opens
  useEffect(() => {
    fetchPhotos();
  }, [person.id]);

  const getRelationships = () => {
    // Get all relationships involving this person
    const allRels = tree.relationships.filter(
      (rel) => rel.personFromId === person.id || rel.personToId === person.id
    );

    // Deduplicate by related person to avoid showing the same person twice
    // For bidirectional relationships (like siblings), both A→B and B→A exist
    // We only want to show each related person once
    const seenRelatedPersons = new Map<string, Relationship>();

    for (const rel of allRels) {
      const relatedPersonId = rel.personFromId === person.id ? rel.personToId : rel.personFromId;

      // If we haven't seen this related person, or if this is the "outgoing" direction
      // (where current person is personFromId), prefer it
      if (!seenRelatedPersons.has(relatedPersonId) || rel.personFromId === person.id) {
        seenRelatedPersons.set(relatedPersonId, rel);
      }
    }

    return Array.from(seenRelatedPersons.values());
  };

  const getRelatedPerson = (relationship: Relationship) => {
    const otherPersonId = relationship.personFromId === person.id
      ? relationship.personToId
      : relationship.personFromId;
    return tree.people.find(p => p.id === otherPersonId);
  };

  const getRelationshipLabel = (relationship: Relationship) => {
    const relatedPerson = getRelatedPerson(relationship);
    const relatedGender = relatedPerson?.gender || 'UNKNOWN';

    // Helper to get gender-specific parent label
    const getParentLabel = (prefix: string = '') => {
      if (relatedGender === 'MALE') return prefix ? `${prefix} Father` : 'Father';
      if (relatedGender === 'FEMALE') return prefix ? `${prefix} Mother` : 'Mother';
      return prefix ? `${prefix} Parent` : 'Parent';
    };

    if (relationship.personFromId === person.id) {
      // Outgoing relationship - this person is the "from"
      const type = relationship.relationshipType;
      // For CHILD-type relationships, this person is the parent of the related person
      // For PARENT-type relationships, this person is the child of the related person
      if (type === 'CHILD') return 'Child';
      if (type === 'PARENT') return getParentLabel();
      if (type === 'ADOPTIVE_CHILD') return 'Adoptive Child';
      if (type === 'ADOPTIVE_PARENT') return getParentLabel('Adoptive');
      if (type === 'STEP_CHILD') return 'Step Child';
      if (type === 'STEP_PARENT') return getParentLabel('Step');
      if (type === 'FOSTER_CHILD') return 'Foster Child';
      if (type === 'FOSTER_PARENT') return getParentLabel('Foster');
      if (type === 'GUARDIAN') return 'Guardian';
      if (type === 'WARD') return 'Ward';
      return type.replace('_', ' ');
    } else {
      // Reverse relationship - this person is the "to"
      const type = relationship.relationshipType;
      // For CHILD-type relationships, this person is the child, related person is parent
      // For PARENT-type relationships, this person is the parent, related person is child
      if (type === 'PARENT') return 'Child';
      if (type === 'CHILD') return getParentLabel();
      if (type === 'ADOPTIVE_PARENT') return 'Adoptive Child';
      if (type === 'ADOPTIVE_CHILD') return getParentLabel('Adoptive');
      if (type === 'STEP_PARENT') return 'Step Child';
      if (type === 'STEP_CHILD') return getParentLabel('Step');
      if (type === 'FOSTER_PARENT') return 'Foster Child';
      if (type === 'FOSTER_CHILD') return getParentLabel('Foster');
      if (type === 'GUARDIAN') return 'Ward';
      if (type === 'WARD') return 'Guardian';
      return type.replace('_', ' ');
    }
  };

  const getRelationshipIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('spouse')) return <Heart className="w-4 h-4 text-red-500" />;
    if (lowerType.includes('child') || lowerType === 'ward') return <Baby className="w-4 h-4 text-blue-500" />;
    if (lowerType.includes('parent') || lowerType.includes('father') || lowerType.includes('mother') || lowerType === 'guardian') return <User className="w-4 h-4 text-green-500" />;
    if (lowerType.includes('sibling')) return <Users className="w-4 h-4 text-purple-500" />;
    return <Home className="w-4 h-4 text-gray-500" />;
  };

  const getRelationshipBadgeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('spouse')) return 'bg-red-100 text-red-700 border-red-200';
    if (lowerType.includes('child') || lowerType === 'ward') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (lowerType.includes('father')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (lowerType.includes('mother')) return 'bg-pink-100 text-pink-700 border-pink-200';
    if (lowerType.includes('parent') || lowerType === 'guardian') return 'bg-green-100 text-green-700 border-green-200';
    if (lowerType.includes('sibling')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (lowerType.includes('adoptive')) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (lowerType.includes('step')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (lowerType.includes('foster')) return 'bg-teal-100 text-teal-700 border-teal-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const relationships = getRelationships();

  // Check if person already has parents (father, mother, or generic parent)
  const hasParents = relationships.some(rel => {
    const label = getRelationshipLabel(rel).toLowerCase();
    return label.includes('parent') || label.includes('father') || label.includes('mother');
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Person' : 'Person Details'}
            </h2>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <>
                  {canEditPeople && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      title="Edit this person's details"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                  {canAddAncestors && !hasParents && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAddRelationship}
                      title="Add a parent to this person (Admin only)"
                    >
                      <User className="w-3 h-3 mr-1" />
                      Add Parent
                    </Button>
                  )}
                  {!canAddAncestors && !hasParents && (
                    <div className="text-xs text-gray-500 italic" title="Only administrators can add parent relationships">
                      Contact admin to add parents
                    </div>
                  )}
                  {canAddDescendants && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAddChild}
                      title="Add a child to this person"
                    >
                      <Baby className="w-3 h-3 mr-1" />
                      Add Child
                    </Button>
                  )}
                  {canAddRelationships && !hasActiveSpouse && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAddSpouse}
                      title="Add a spouse/partner to this person"
                    >
                      <Heart className="w-3 h-3 mr-1" />
                      Add Spouse
                    </Button>
                  )}
                  {canAddRelationships && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAddSibling}
                      title="Add a sibling to this person"
                    >
                      <Users className="w-3 h-3 mr-1" />
                      Add Sibling
                    </Button>
                  )}
                </>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {isEditing ? (
          /* Edit Form */
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={editFormData.middleName}
                    onChange={(e) => setEditFormData({ ...editFormData, middleName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maiden Name</label>
                  <input
                    type="text"
                    value={editFormData.maidenName}
                    onChange={(e) => setEditFormData({ ...editFormData, maidenName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suffix</label>
                  <input
                    type="text"
                    value={editFormData.suffix}
                    onChange={(e) => setEditFormData({ ...editFormData, suffix: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Jr., Sr., III"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
                  <input
                    type="text"
                    value={editFormData.nickname}
                    onChange={(e) => setEditFormData({ ...editFormData, nickname: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value as 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="UNKNOWN">Unknown</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Generation</label>
                  <input
                    type="number"
                    value={editFormData.generation}
                    onChange={(e) => setEditFormData({ ...editFormData, generation: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Life Events */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Life Events</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
                  <input
                    type="date"
                    value={editFormData.birthDate}
                    onChange={(e) => setEditFormData({ ...editFormData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birth Place</label>
                  <input
                    type="text"
                    value={editFormData.birthPlace}
                    onChange={(e) => setEditFormData({ ...editFormData, birthPlace: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isLiving"
                    checked={editFormData.isLiving}
                    onChange={(e) => setEditFormData({ ...editFormData, isLiving: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isLiving" className="text-sm font-medium text-gray-700">Currently Living</label>
                </div>
                {!editFormData.isLiving && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Death Date</label>
                      <input
                        type="date"
                        value={editFormData.deathDate}
                        onChange={(e) => setEditFormData({ ...editFormData, deathDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Death Place</label>
                      <input
                        type="text"
                        value={editFormData.deathPlace}
                        onChange={(e) => setEditFormData({ ...editFormData, deathPlace: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                  <input
                    type="text"
                    value={editFormData.occupation}
                    onChange={(e) => setEditFormData({ ...editFormData, occupation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
                  <input
                    type="text"
                    value={editFormData.education}
                    onChange={(e) => setEditFormData({ ...editFormData, education: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biography</label>
                  <textarea
                    value={editFormData.biography}
                    onChange={(e) => setEditFormData({ ...editFormData, biography: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Write a brief biography..."
                  />
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Privacy Settings</h3>
              <select
                value={editFormData.privacy}
                onChange={(e) => setEditFormData({ ...editFormData, privacy: e.target.value as 'PUBLIC' | 'FAMILY_ONLY' | 'PRIVATE' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PUBLIC">Public - Visible to everyone</option>
                <option value="FAMILY_ONLY">Family Only - Visible to tree members</option>
                <option value="PRIVATE">Private - Visible only to admins</option>
              </select>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div>
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-semibold text-gray-700">
                  {person.firstName.charAt(0)}{person.lastName.charAt(0)}
                </div>
                <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900">
                  {person.firstName} {person.middleName ? `${person.middleName} ` : ''}{person.lastName}
                  {person.suffix ? ` ${person.suffix}` : ''}
                </h3>
                {person.nickname && (
                  <p className="text-lg text-gray-600 mt-1">"{person.nickname}"</p>
                )}
                {person.maidenName && (
                  <p className="text-sm text-gray-500 mt-1">Maiden name: {person.maidenName}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded ${
                    person.gender === 'MALE' ? 'bg-blue-100 text-blue-700' :
                    person.gender === 'FEMALE' ? 'bg-pink-100 text-pink-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {person.gender === 'MALE' ? 'Male' :
                     person.gender === 'FEMALE' ? 'Female' :
                     person.gender === 'OTHER' ? 'Other' : 'Unknown'}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                    Generation {person.generation}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    person.isLiving ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {person.isLiving ? 'Living' : 'Deceased'}
                  </span>
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                    person.privacy === 'PUBLIC' ? 'bg-emerald-100 text-emerald-700' :
                    person.privacy === 'FAMILY_ONLY' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {person.privacy === 'PUBLIC' ? <Eye className="w-3 h-3" /> :
                     person.privacy === 'FAMILY_ONLY' ? <Shield className="w-3 h-3" /> :
                     <Lock className="w-3 h-3" />}
                    {person.privacy === 'PUBLIC' ? 'Public' :
                     person.privacy === 'FAMILY_ONLY' ? 'Family Only' :
                     'Private'}
                  </span>
                </div>
                </div>
              </div>
            </div>

            {/* Life Events */}
            {(person.birthDate || person.deathDate) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Life Events</h4>
                <div className="space-y-2">
                  {person.birthDate && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Born:</span>{' '}
                      <span className="text-gray-600">
                        {new Date(person.birthDate).toLocaleDateString()}
                        {person.birthPlace && ` in ${person.birthPlace}`}
                      </span>
                    </div>
                  )}
                  {!person.isLiving && person.deathDate && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Died:</span>{' '}
                      <span className="text-gray-600">
                        {new Date(person.deathDate).toLocaleDateString()}
                        {person.deathPlace && ` in ${person.deathPlace}`}
                      </span>
                    </div>
                  )}
                  {person.birthDate && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Age:</span>{' '}
                      <span className="text-gray-600">
                        {calculateAge(person.birthDate, person.isLiving ? null : person.deathDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Professional Info */}
            {(person.occupation || person.education) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Professional</h4>
                <div className="space-y-2">
                  {person.occupation && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Occupation:</span>{' '}
                      <span className="text-gray-600">{person.occupation}</span>
                    </div>
                  )}
                  {person.education && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Education:</span>{' '}
                      <span className="text-gray-600">{person.education}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Biography */}
            {person.biography && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Biography</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{person.biography}</p>
              </div>
            )}

            {/* Photos */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Photos</h4>
                <div>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                  <label htmlFor="photo-upload">
                    <span className="inline-block">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={uploadingPhoto}
                        type="button"
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                      </Button>
                    </span>
                  </label>
                </div>
              </div>

              {photos.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Image className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No photos yet</p>
                  <p className="text-xs text-gray-400 mt-1">Upload photos to create memories</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors"
                        onClick={() => setSelectedPhoto(photo)}
                      >
                        <div className="aspect-square bg-gray-100 flex items-center justify-center">
                          <img
                            src={photo.url}
                            alt={photo.caption || 'Family photo'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {photo.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 truncate">
                            {photo.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Photo Privacy Settings Modal */}
                  {selectedPhoto && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Photo Details</h3>
                            <button
                              onClick={() => setSelectedPhoto(null)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Photo Preview */}
                            <div>
                              <img
                                src={selectedPhoto.url}
                                alt={selectedPhoto.caption || 'Family photo'}
                                className="w-full rounded-lg border border-gray-200"
                              />
                              {selectedPhoto.caption && (
                                <p className="text-sm text-gray-700 mt-2">{selectedPhoto.caption}</p>
                              )}
                              {selectedPhoto.dateTaken && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Taken: {new Date(selectedPhoto.dateTaken).toLocaleDateString()}
                                </p>
                              )}
                              {selectedPhoto.location && (
                                <p className="text-xs text-gray-500">Location: {selectedPhoto.location}</p>
                              )}
                            </div>

                            {/* Privacy Settings */}
                            <div>
                              <PhotoPrivacySettings
                                photo={selectedPhoto!}
                                treeId={tree.id}
                                isMinor={(() => {
                                  if (!person.isLiving || !person.birthDate) return false;
                                  const ageStr = calculateAge(person.birthDate, null);
                                  if (!ageStr || !ageStr.includes('years')) return false;
                                  const age = parseInt(ageStr);
                                  return !isNaN(age) && age < 18;
                                })()}
                                onUpdate={() => {
                                  fetchPhotos();
                                  setSelectedPhoto(null);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Privacy Settings */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Privacy Settings</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="privacy-public"
                    name="privacy"
                    value="PUBLIC"
                    checked={person.privacy === 'PUBLIC'}
                    onChange={() => handlePrivacyChange('PUBLIC')}
                    disabled={updatingPrivacy}
                    className="mt-1"
                  />
                  <label htmlFor="privacy-public" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-sm text-gray-900">Public</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      All information visible to everyone
                    </p>
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="privacy-family"
                    name="privacy"
                    value="FAMILY_ONLY"
                    checked={person.privacy === 'FAMILY_ONLY'}
                    onChange={() => handlePrivacyChange('FAMILY_ONLY')}
                    disabled={updatingPrivacy}
                    className="mt-1"
                  />
                  <label htmlFor="privacy-family" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-sm text-gray-900">Family Only</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Name, photo, and relationships visible to family members only
                    </p>
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="privacy-private"
                    name="privacy"
                    value="PRIVATE"
                    checked={person.privacy === 'PRIVATE'}
                    onChange={() => handlePrivacyChange('PRIVATE')}
                    disabled={updatingPrivacy}
                    className="mt-1"
                  />
                  <label htmlFor="privacy-private" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-red-600" />
                      <span className="font-medium text-sm text-gray-900">Private</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Only name and relationships visible to admins
                    </p>
                  </label>
                </div>

                {person.isLiving && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                    <p className="text-xs text-blue-800 flex items-start gap-2">
                      <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Living Person Protection:</strong> For living individuals, we recommend using "Family Only" or "Private" settings to protect personal information.
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Data & Privacy Actions */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Data & Privacy Actions</h4>
              <div className="space-y-3">
                {/* Export Data */}
                <div className="flex items-start gap-3">
                  <Button
                    onClick={handleExportData}
                    disabled={exporting}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {exporting ? 'Exporting...' : 'Export My Data'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 -mt-2">
                  Download all personal information and relationships for this person in JSON format
                </p>

                {/* GDPR Delete */}
                <div className="flex items-start gap-3">
                  <Button
                    onClick={handleGDPRDelete}
                    disabled={deleting}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleting ? 'Deleting...' : 'Delete Personal Data (GDPR)'}
                  </Button>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 -mt-2">
                  <p className="text-xs text-amber-800">
                    <strong>Anonymize Only:</strong> This will permanently delete all personal information for this person.
                    The person will be converted to a "Removed Member" placeholder to preserve family tree structure.
                    Relationships will be maintained but all personal details will be anonymized.
                  </p>
                </div>

                {/* Remove Person from Tree */}
                <div className="flex items-start gap-3 mt-4">
                  <Button
                    onClick={handleRemovePerson}
                    disabled={deleting}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    {deleting ? 'Removing...' : 'Remove Person from Tree'}
                  </Button>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 -mt-2">
                  <p className="text-xs text-red-800">
                    <strong>Complete Removal:</strong> This will permanently delete this person AND all their relationships from the tree.
                    Use this if you want to completely remove someone and potentially add them again later.
                    All connections to other family members will be deleted.
                  </p>
                </div>
              </div>
            </div>

            {/* Relationships */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Relationships</h4>
                {canAddRelationships && (
                  <Button
                    onClick={onAddRelationship}
                    size="sm"
                    variant="outline"
                  >
                    <LinkIcon className="w-3 h-3 mr-1" />
                    Add Relationship
                  </Button>
                )}
              </div>

              {relationships.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No relationships defined yet</p>
              ) : (
                <div className="space-y-4">
                  {/* Group relationships by type */}
                  {(() => {
                    const grouped = relationships.reduce((acc, rel) => {
                      const relatedPerson = getRelatedPerson(rel);
                      if (!relatedPerson) return acc;
                      const label = getRelationshipLabel(rel);
                      const lowerLabel = label.toLowerCase();
                      const category = (lowerLabel.includes('parent') || lowerLabel.includes('father') || lowerLabel.includes('mother')) ? 'Parents' :
                                      lowerLabel.includes('child') ? 'Children' :
                                      lowerLabel.includes('spouse') ? 'Spouses' :
                                      lowerLabel.includes('sibling') ? 'Siblings' :
                                      'Other';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push({ rel, relatedPerson, label });
                      return acc;
                    }, {} as Record<string, Array<{rel: Relationship, relatedPerson: Person, label: string}>>);

                    // Sort siblings by birth order if available
                    if (grouped['Siblings']) {
                      grouped['Siblings'].sort((a, b) => {
                        const orderA = (a.rel as any).birthOrder || 999;
                        const orderB = (b.rel as any).birthOrder || 999;
                        return orderA - orderB;
                      });
                    }

                    // Sort children by birth order if available
                    if (grouped['Children']) {
                      grouped['Children'].sort((a, b) => {
                        const orderA = (a.rel as any).birthOrder || 999;
                        const orderB = (b.rel as any).birthOrder || 999;
                        return orderA - orderB;
                      });
                    }

                    const categoryOrder = ['Parents', 'Spouses', 'Siblings', 'Children', 'Other'];
                    return categoryOrder.map(category => {
                      if (!grouped[category] || grouped[category].length === 0) return null;
                      return (
                        <div key={category}>
                          <h5 className="text-xs font-semibold text-gray-600 uppercase mb-2">{category}</h5>
                          <div className="space-y-2">
                            {grouped[category].map(({ rel, relatedPerson, label }) => (
                              <div
                                key={rel.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 group"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                                    {relatedPerson.firstName.charAt(0)}{relatedPerson.lastName.charAt(0)}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">
                                      {relatedPerson.firstName} {relatedPerson.lastName}
                                      {(rel as any).birthOrder && (
                                        <span className="ml-2 text-xs text-gray-500">
                                          #{(rel as any).birthOrder}
                                        </span>
                                      )}
                                    </p>
                                    <div className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full border text-xs font-medium ${getRelationshipBadgeColor(label)}`}>
                                      {getRelationshipIcon(label)}
                                      <span>{label}</span>
                                    </div>
                                  </div>
                                </div>
                                {(canAddRelationships || canDeleteRelationships) && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {canAddRelationships && (
                                      <button
                                        onClick={() => setEditingRelationship(rel)}
                                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                                        title="Edit relationship"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                    )}
                                    {canDeleteRelationships && (
                                      <button
                                        onClick={() => handleDeleteRelationship(rel.id, `${relatedPerson.firstName} ${relatedPerson.lastName}`)}
                                        disabled={deletingRelationship === rel.id}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                        title="Remove relationship"
                                      >
                                        {deletingRelationship === rel.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <X className="w-4 h-4" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Relationship Modal */}
      {editingRelationship && (
        <EditRelationshipModal
          relationship={editingRelationship}
          person={person}
          allPeople={tree.people}
          onClose={() => setEditingRelationship(null)}
          onSuccess={() => {
            setEditingRelationship(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

interface EditRelationshipModalProps {
  relationship: Relationship;
  person: Person;
  allPeople: Person[];
  onClose: () => void;
  onSuccess: () => void;
}

function EditRelationshipModal({ relationship, person, allPeople, onClose, onSuccess }: EditRelationshipModalProps) {
  const [relationshipType, setRelationshipType] = useState<RelationshipType>(relationship.relationshipType);
  const [notes, setNotes] = useState((relationship as any).notes || '');
  const [birthOrder, setBirthOrder] = useState<string>((relationship as any).birthOrder?.toString() || '');
  const [saving, setSaving] = useState(false);

  // Get the related person
  const relatedPerson = allPeople.find(p =>
    p.id === (relationship.personFromId === person.id ? relationship.personToId : relationship.personFromId)
  );

  const relationshipTypes: RelationshipType[] = [
    'PARENT', 'CHILD', 'SPOUSE', 'SIBLING',
    'ADOPTIVE_PARENT', 'ADOPTIVE_CHILD',
    'STEP_PARENT', 'STEP_CHILD',
    'FOSTER_PARENT', 'FOSTER_CHILD',
    'GUARDIAN', 'WARD'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/relationships/${relationship.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          relationshipType,
          notes: notes || undefined,
          birthOrder: birthOrder ? parseInt(birthOrder) : undefined,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update relationship');
      }
    } catch (error) {
      console.error('Failed to update relationship:', error);
      alert('Failed to update relationship');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit Relationship</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            Editing relationship between <strong>{person.firstName} {person.lastName}</strong> and <strong>{relatedPerson?.firstName} {relatedPerson?.lastName}</strong>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relationship Type
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {relationshipTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {(relationshipType === 'CHILD' || relationshipType === 'SIBLING') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Birth Order
              </label>
              <input
                type="number"
                min="1"
                value={birthOrder}
                onChange={(e) => setBirthOrder(e.target.value)}
                placeholder="e.g., 1 for first-born"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this relationship..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddRelationshipModalProps {
  person: Person;
  allPeople: Person[];
  treeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface AddChildModalProps {
  parentPerson: Person;
  treeId: string;
  allPeople: Person[];
  relationships: Relationship[];
  onClose: () => void;
  onSuccess: () => void;
}

interface AddSpouseModalProps {
  person: Person;
  treeId: string;
  relationships: Relationship[];
  marriages: FamilyTreeWithData['marriages'];
  onClose: () => void;
  onSuccess: () => void;
}

function AddChildModal({ parentPerson, treeId, allPeople, relationships, onClose, onSuccess }: AddChildModalProps) {
  const initialFormData = {
    firstName: '',
    middleName: '',
    lastName: parentPerson.lastName, // Default to parent's last name
    nickname: '',
    suffix: '',
    maidenName: '',
    gender: 'UNKNOWN' as 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN',
    birthDate: '',
    birthPlace: '',
    isLiving: true,
    isPlaceholder: false,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [childrenAdded, setChildrenAdded] = useState(0);
  const [secondParentId, setSecondParentId] = useState<string>('');
  const [childType, setChildType] = useState<'BIOLOGICAL' | 'ADOPTED' | 'STEP' | 'FOSTER'>('BIOLOGICAL');

  // Find spouses of the parent person
  const spouses = relationships
    .filter(r =>
      r.relationshipType === 'SPOUSE' &&
      (r.personFromId === parentPerson.id || r.personToId === parentPerson.id)
    )
    .map(r => {
      const spouseId = r.personFromId === parentPerson.id ? r.personToId : r.personFromId;
      return allPeople.find(p => p.id === spouseId);
    })
    .filter((p): p is Person => p !== undefined);

  // Find existing children of BOTH parents (to create sibling relationships)
  const getExistingSiblings = (secondParent: string | null) => {
    // Get children of primary parent
    const primaryParentChildren = relationships
      .filter(r => r.relationshipType === 'CHILD' && r.personFromId === parentPerson.id)
      .map(r => r.personToId);

    if (!secondParent) {
      // If no second parent, just return children of primary parent
      return primaryParentChildren;
    }

    // Get children of second parent
    const secondParentChildren = relationships
      .filter(r => r.relationshipType === 'CHILD' && r.personFromId === secondParent)
      .map(r => r.personToId);

    // Find children that have BOTH parents (full siblings)
    const fullSiblings = primaryParentChildren.filter(childId =>
      secondParentChildren.includes(childId)
    );

    return fullSiblings;
  };

  const handleSubmit = async (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault();
    if (!formData.firstName.trim()) return;

    setLoading(true);
    try {
      // Create the child person
      const personResponse = await fetch(`${API_URL}/api/family-trees/${treeId}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          generation: parentPerson.generation + 1,
          birthDate: formData.birthDate || undefined,
        }),
      });

      if (!personResponse.ok) {
        const error = await personResponse.json();
        alert(error.message || 'Failed to create child');
        setLoading(false);
        return;
      }

      const personData = await personResponse.json();
      const newChild = personData.data;

      // Determine relationship type based on child type
      const relationshipType = childType === 'BIOLOGICAL' ? 'CHILD' :
                               childType === 'ADOPTED' ? 'ADOPTIVE_CHILD' :
                               childType === 'STEP' ? 'STEP_CHILD' : 'FOSTER_CHILD';

      // Create relationship with primary parent
      const primaryRelResponse = await fetch(`${API_URL}/api/family-trees/${treeId}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          personFromId: parentPerson.id,
          personToId: newChild.id,
          relationshipType,
        }),
      });

      if (!primaryRelResponse.ok) {
        const error = await primaryRelResponse.json();
        alert(error.message || 'Child created but failed to establish relationship with first parent');
        setLoading(false);
        return;
      }

      // Create relationship with second parent if selected
      if (secondParentId) {
        const secondRelResponse = await fetch(`${API_URL}/api/family-trees/${treeId}/relationships`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            personFromId: secondParentId,
            personToId: newChild.id,
            relationshipType,
          }),
        });

        if (!secondRelResponse.ok) {
          console.error('Failed to create relationship with second parent');
          // Continue anyway - primary relationship was created
        }
      }

      // Create sibling relationships with existing children who share the same parents
      // Determine the sibling type based on how they're related
      const getSiblingNotes = (siblingId: string): string | undefined => {
        if (childType === 'STEP') return 'Step-sibling';
        if (childType === 'ADOPTED') return 'Adoptive sibling';
        if (childType === 'FOSTER') return 'Foster sibling';

        // For biological children, check if they share both parents (full) or one (half)
        if (secondParentId) {
          // Check if the sibling also has both parents
          const siblingHasPrimaryParent = relationships.some(r =>
            r.relationshipType === 'CHILD' && r.personFromId === parentPerson.id && r.personToId === siblingId
          );
          const siblingHasSecondParent = relationships.some(r =>
            r.relationshipType === 'CHILD' && r.personFromId === secondParentId && r.personToId === siblingId
          );

          if (siblingHasPrimaryParent && siblingHasSecondParent) {
            return 'Full sibling';
          } else {
            return 'Half-sibling';
          }
        }
        return 'Half-sibling'; // Only one parent specified, so it's a half-sibling
      };

      // Get all siblings - for biological children, get all children of the primary parent
      // Then create appropriate sibling relationships based on shared parentage
      const getAllPotentialSiblings = (): string[] => {
        const primaryParentChildren = relationships
          .filter(r => r.relationshipType === 'CHILD' && r.personFromId === parentPerson.id)
          .map(r => r.personToId);

        if (secondParentId) {
          // Also include children of second parent
          const secondParentChildren = relationships
            .filter(r => r.relationshipType === 'CHILD' && r.personFromId === secondParentId)
            .map(r => r.personToId);

          // Combine and dedupe
          return [...new Set([...primaryParentChildren, ...secondParentChildren])];
        }

        return primaryParentChildren;
      };

      const potentialSiblings = getAllPotentialSiblings();

      for (const siblingId of potentialSiblings) {
        if (siblingId === newChild.id) continue; // Skip self

        try {
          const siblingNotes = getSiblingNotes(siblingId);
          await fetch(`${API_URL}/api/family-trees/${treeId}/relationships`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              personFromId: newChild.id,
              personToId: siblingId,
              relationshipType: 'SIBLING', // Always use SIBLING - type is stored in notes
              notes: siblingNotes,
            }),
          });
        } catch (err) {
          console.error(`Failed to create sibling relationship with ${siblingId}:`, err);
          // Continue with other siblings
        }
      }

      setChildrenAdded(prev => prev + 1);

      if (addAnother) {
        setFormData({
          ...initialFormData,
          lastName: formData.lastName,
          isPlaceholder: formData.isPlaceholder,
        });
        setLoading(false);
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to add child:', error);
      alert('Failed to add child');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Add Child</h2>
          <p className="text-sm text-gray-600 mt-1">
            Add a child for {parentPerson.firstName} {parentPerson.lastName}
            {childrenAdded > 0 && (
              <span className="ml-2 text-green-600 font-medium">
                ({childrenAdded} child{childrenAdded !== 1 ? 'ren' : ''} added)
              </span>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Parents Selection */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Parents <span className="text-red-500">*</span>
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Both parents are required to properly establish family relationships and sibling connections.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Parent</label>
                <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                  {parentPerson.firstName} {parentPerson.lastName}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Second Parent <span className="text-red-500">*</span>
                </label>
                <select
                  value={secondParentId}
                  onChange={(e) => setSecondParentId(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !secondParentId && spouses.length > 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">-- Select second parent --</option>
                  {spouses.map((spouse) => (
                    <option key={spouse.id} value={spouse.id}>
                      {spouse.firstName} {spouse.lastName}
                    </option>
                  ))}
                  {/* Allow selecting any person from the tree as second parent */}
                  {allPeople
                    .filter(p => p.id !== parentPerson.id && !spouses.some(s => s.id === p.id))
                    .length > 0 && (
                    <optgroup label="Other people in tree">
                      {allPeople
                        .filter(p => p.id !== parentPerson.id && !spouses.some(s => s.id === p.id))
                        .map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.firstName} {person.lastName}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                {!secondParentId && (
                  <p className="text-xs text-amber-600 mt-1 bg-amber-50 p-2 rounded">
                    {spouses.length === 0
                      ? 'No spouses found. You may select any person from the tree or add a spouse first.'
                      : 'Please select a second parent to establish proper sibling relationships.'}
                  </p>
                )}
              </div>
            </div>
            {!secondParentId && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Why both parents?</strong> Having both parents specified allows the system to:
                </p>
                <ul className="text-xs text-blue-700 mt-1 list-disc list-inside space-y-0.5">
                  <li>Automatically link full siblings (same parents)</li>
                  <li>Distinguish half-siblings (one shared parent)</li>
                  <li>Display accurate family tree connections</li>
                </ul>
              </div>
            )}
          </div>

          {/* Child Type Selection */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Relationship Type</h3>
            <div className="grid grid-cols-4 gap-2">
              {(['BIOLOGICAL', 'ADOPTED', 'STEP', 'FOSTER'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setChildType(type)}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    childType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {type === 'BIOLOGICAL' ? 'Biological' :
                   type === 'ADOPTED' ? 'Adopted' :
                   type === 'STEP' ? 'Step' : 'Foster'}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nickname
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="UNKNOWN">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Birth Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Birth Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Date
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Place
                </label>
                <input
                  type="text"
                  value={formData.birthPlace}
                  onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Living Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isLiving"
              checked={formData.isLiving}
              onChange={(e) => setFormData({ ...formData, isLiving: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isLiving" className="text-sm font-medium text-gray-700">
              This person is living
            </label>
          </div>

          {/* Placeholder Option */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="isPlaceholder"
                checked={formData.isPlaceholder}
                onChange={(e) => setFormData({ ...formData, isPlaceholder: e.target.checked })}
                className="mt-1 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <label htmlFor="isPlaceholder" className="text-sm font-medium text-gray-700">
                  Create as placeholder
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Add this person to the tree without requiring them to have an account. They can claim their profile later.
                </p>
              </div>
            </div>
          </div>

          {/* Info about automatic sibling creation */}
          {secondParentId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Automatic Sibling Linking:</strong> This child will be automatically linked as a sibling to all existing children of either parent.
                {getExistingSiblings(secondParentId).length > 0 && (
                  <span>
                    {' '}This includes {getExistingSiblings(secondParentId).length} full sibling{getExistingSiblings(secondParentId).length !== 1 ? 's' : ''} (children of both parents).
                  </span>
                )}
              </p>
              <ul className="text-xs text-blue-700 mt-1 list-disc list-inside">
                <li>Children sharing both parents will be linked as <strong>full siblings</strong></li>
                <li>Children sharing one parent will be linked as <strong>half-siblings</strong></li>
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={childrenAdded > 0 ? onSuccess : onClose}
              disabled={loading}
            >
              {childrenAdded > 0 ? 'Done' : 'Cancel'}
            </Button>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => handleSubmit(e, true)}
                disabled={loading || !formData.firstName.trim() || !formData.lastName.trim() || !secondParentId}
                title={!secondParentId ? 'Please select a second parent' : undefined}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  'Add & Add Another'
                )}
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.firstName.trim() || !formData.lastName.trim() || !secondParentId}
                title={!secondParentId ? 'Please select a second parent' : undefined}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Adding Child...
                  </>
                ) : (
                  childrenAdded > 0 ? 'Add Child & Finish' : 'Add Child'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddSpouseModal({ person, treeId, relationships, marriages, onClose, onSuccess }: AddSpouseModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    nickname: '',
    suffix: '',
    maidenName: '',
    gender: 'UNKNOWN' as 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN',
    birthDate: '',
    birthPlace: '',
    isLiving: true,
    isPlaceholder: false,
  });
  const [marriageData, setMarriageData] = useState({
    marriageDate: '',
    marriagePlace: '',
    divorceDate: '',
    divorcePlace: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  // Find existing spouse relationships for this person
  const existingSpouseRelationships = relationships.filter(r =>
    r.relationshipType === 'SPOUSE' &&
    (r.personFromId === person.id || r.personToId === person.id)
  );

  // Get IDs of existing spouses
  const existingSpouseIds = existingSpouseRelationships.map(r =>
    r.personFromId === person.id ? r.personToId : r.personFromId
  );

  // Check if person has an active (non-divorced) spouse
  // For each spouse relationship, check if there's a marriage record with a divorce date
  const hasActiveSpouse = existingSpouseIds.some(spouseId => {
    // Find marriage record between this person and the spouse
    const marriageRecord = marriages?.find(m => {
      const spouseIdsInMarriage = m.spouses?.map(s => s.id) || [];
      return spouseIdsInMarriage.includes(person.id) && spouseIdsInMarriage.includes(spouseId);
    });

    // If there's no marriage record, the spouse relationship is still active
    // If there is a marriage record, check if it's divorced
    if (!marriageRecord) {
      return true; // Spouse relationship exists without marriage record = active
    }

    // If marriage record exists but no divorce date, spouse is still active
    return !marriageRecord.divorceDate;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim()) return;

    setLoading(true);
    try {
      // Create the spouse person
      const personResponse = await fetch(`${API_URL}/api/family-trees/${treeId}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          generation: person.generation, // Spouse is same generation
          birthDate: formData.birthDate || undefined,
        }),
      });

      if (!personResponse.ok) {
        const error = await personResponse.json();
        alert(error.message || 'Failed to create spouse');
        setLoading(false);
        return;
      }

      const personData = await personResponse.json();
      const newSpouse = personData.data;

      // Create the SPOUSE relationship
      const relationshipResponse = await fetch(`${API_URL}/api/family-trees/${treeId}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          personFromId: person.id,
          personToId: newSpouse.id,
          relationshipType: 'SPOUSE',
        }),
      });

      if (!relationshipResponse.ok) {
        const error = await relationshipResponse.json();
        alert(error.message || 'Spouse created but failed to establish relationship');
        setLoading(false);
        return;
      }

      // Create the marriage record if dates are provided
      if (marriageData.marriageDate || marriageData.marriagePlace) {
        await fetch(`${API_URL}/api/family-trees/${treeId}/marriages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            spouseIds: [person.id, newSpouse.id],
            marriageDate: marriageData.marriageDate || undefined,
            marriagePlace: marriageData.marriagePlace || undefined,
            divorceDate: marriageData.divorceDate || undefined,
            divorcePlace: marriageData.divorcePlace || undefined,
            notes: marriageData.notes || undefined,
          }),
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to add spouse:', error);
      alert('Failed to add spouse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Add Spouse/Partner</h2>
          <p className="text-sm text-gray-600 mt-1">
            Add a spouse or partner for {person.firstName} {person.lastName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Warning if person already has an active spouse */}
          {hasActiveSpouse && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> {person.firstName} {person.lastName} already has an active spouse/partner.
                Adding another spouse will create a concurrent marriage. If the previous relationship ended,
                please add a divorce date to that marriage record first.
              </p>
            </div>
          )}

          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maiden Name
                </label>
                <input
                  type="text"
                  value={formData.maidenName}
                  onChange={(e) => setFormData({ ...formData, maidenName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="UNKNOWN">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Birth Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Birth Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Date
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Place
                </label>
                <input
                  type="text"
                  value={formData.birthPlace}
                  onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Marriage Information */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Marriage Information (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marriage Date
                </label>
                <input
                  type="date"
                  value={marriageData.marriageDate}
                  onChange={(e) => setMarriageData({ ...marriageData, marriageDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marriage Place
                </label>
                <input
                  type="text"
                  value={marriageData.marriagePlace}
                  onChange={(e) => setMarriageData({ ...marriageData, marriagePlace: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City, State/Country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Divorce Date (if applicable)
                </label>
                <input
                  type="date"
                  value={marriageData.divorceDate}
                  onChange={(e) => setMarriageData({ ...marriageData, divorceDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Divorce Place (if applicable)
                </label>
                <input
                  type="text"
                  value={marriageData.divorcePlace}
                  onChange={(e) => setMarriageData({ ...marriageData, divorcePlace: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City, State/Country"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={marriageData.notes}
                  onChange={(e) => setMarriageData({ ...marriageData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="Additional information about the marriage"
                />
              </div>
            </div>
          </div>

          {/* Living Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isLiving"
              checked={formData.isLiving}
              onChange={(e) => setFormData({ ...formData, isLiving: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isLiving" className="text-sm font-medium text-gray-700">
              This person is living
            </label>
          </div>

          {/* Placeholder Option */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="isPlaceholder"
                checked={formData.isPlaceholder}
                onChange={(e) => setFormData({ ...formData, isPlaceholder: e.target.checked })}
                className="mt-1 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <label htmlFor="isPlaceholder" className="text-sm font-medium text-gray-700">
                  Create as placeholder
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Add this person to the tree without requiring them to have an account. They can claim their profile later.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.firstName.trim() || !formData.lastName.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Adding Spouse...
                </>
              ) : (
                'Add Spouse'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddSiblingModalProps {
  person: Person;
  treeId: string;
  allPeople: Person[];
  relationships: Relationship[];
  onClose: () => void;
  onSuccess: () => void;
}

function AddSiblingModal({ person, treeId, allPeople, relationships, onClose, onSuccess }: AddSiblingModalProps) {
  const initialFormData = {
    firstName: '',
    middleName: '',
    lastName: person.lastName,
    nickname: '',
    gender: 'UNKNOWN' as 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN',
    birthDate: '',
    birthPlace: '',
    isLiving: true,
    isPlaceholder: false,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [siblingType, setSiblingType] = useState<'FULL' | 'HALF' | 'STEP'>('FULL');
  const [birthOrder, setBirthOrder] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const [sharedParent, setSharedParent] = useState<string>('');

  // Get the reference person's parents
  const referencePersonParents = relationships
    .filter(r =>
      (r.relationshipType === 'CHILD' && r.personToId === person.id) ||
      (r.relationshipType === 'PARENT' && r.personFromId === person.id)
    )
    .map(r => r.relationshipType === 'CHILD' ? r.personFromId : r.personToId)
    .filter((id, index, arr) => arr.indexOf(id) === index); // Dedupe

  const parentPeople = referencePersonParents
    .map(id => allPeople.find(p => p.id === id))
    .filter((p): p is Person => p !== undefined);

  // Initialize selected parents when sibling type changes
  useEffect(() => {
    if (siblingType === 'FULL') {
      setSelectedParents(referencePersonParents);
    } else if (siblingType === 'HALF') {
      // Default to first parent for half-sibling
      setSharedParent(referencePersonParents[0] || '');
      setSelectedParents(referencePersonParents[0] ? [referencePersonParents[0]] : []);
    } else {
      // Step-sibling - no shared parents
      setSelectedParents([]);
      setSharedParent('');
    }
  }, [siblingType]);

  // Get existing siblings of the reference person (to link the new sibling to them too)
  const existingSiblings = relationships
    .filter(r =>
      r.relationshipType === 'SIBLING' &&
      (r.personFromId === person.id || r.personToId === person.id)
    )
    .map(r => r.personFromId === person.id ? r.personToId : r.personFromId)
    .filter((id, index, arr) => arr.indexOf(id) === index);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim()) return;

    // Validate parent selection based on sibling type
    if (siblingType === 'FULL' && selectedParents.length < 2 && parentPeople.length >= 2) {
      alert('For full siblings, both parents should be shared. Please ensure both parents are selected.');
      return;
    }
    if (siblingType === 'HALF' && !sharedParent) {
      alert('For half-siblings, please select the shared parent.');
      return;
    }

    setLoading(true);
    try {
      // Create the sibling person
      const personResponse = await fetch(`${API_URL}/api/family-trees/${treeId}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          generation: person.generation, // Sibling is same generation
          birthDate: formData.birthDate || undefined,
        }),
      });

      if (!personResponse.ok) {
        const error = await personResponse.json();
        alert(error.message || 'Failed to create sibling');
        setLoading(false);
        return;
      }

      const personData = await personResponse.json();
      const newSibling = personData.data;

      // Create the SIBLING relationship with reference person
      const siblingNotes = siblingType === 'FULL' ? 'Full sibling' :
                          siblingType === 'HALF' ? 'Half-sibling' : 'Step-sibling';

      const relationshipResponse = await fetch(`${API_URL}/api/family-trees/${treeId}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          personFromId: person.id,
          personToId: newSibling.id,
          relationshipType: 'SIBLING',
          notes: siblingNotes,
          birthOrder: birthOrder ? parseInt(birthOrder) : undefined,
        }),
      });

      if (!relationshipResponse.ok) {
        const error = await relationshipResponse.json();
        alert(error.message || 'Sibling created but failed to establish relationship');
        setLoading(false);
        return;
      }

      // Create parent-child relationships for the new sibling
      const parentsToLink = siblingType === 'FULL' ? selectedParents :
                           siblingType === 'HALF' ? [sharedParent] : [];

      for (const parentId of parentsToLink) {
        if (!parentId) continue;
        try {
          await fetch(`${API_URL}/api/family-trees/${treeId}/relationships`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              personFromId: parentId,
              personToId: newSibling.id,
              relationshipType: 'CHILD',
            }),
          });
        } catch (err) {
          console.error(`Failed to create parent relationship with ${parentId}:`, err);
        }
      }

      // Create sibling relationships with existing siblings
      // Determine sibling type for each existing sibling based on shared parents
      for (const existingSiblingId of existingSiblings) {
        try {
          // Check how many parents the new sibling shares with this existing sibling
          const existingSiblingParents = relationships
            .filter(r =>
              (r.relationshipType === 'CHILD' && r.personToId === existingSiblingId) ||
              (r.relationshipType === 'PARENT' && r.personFromId === existingSiblingId)
            )
            .map(r => r.relationshipType === 'CHILD' ? r.personFromId : r.personToId);

          const sharedParentsWithExisting = parentsToLink.filter(pid =>
            existingSiblingParents.includes(pid)
          );

          let existingSiblingNotes: string;
          if (sharedParentsWithExisting.length >= 2) {
            existingSiblingNotes = 'Full sibling';
          } else if (sharedParentsWithExisting.length === 1) {
            existingSiblingNotes = 'Half-sibling';
          } else {
            existingSiblingNotes = 'Step-sibling';
          }

          await fetch(`${API_URL}/api/family-trees/${treeId}/relationships`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              personFromId: newSibling.id,
              personToId: existingSiblingId,
              relationshipType: 'SIBLING',
              notes: existingSiblingNotes,
            }),
          });
        } catch (err) {
          console.error(`Failed to create sibling relationship with ${existingSiblingId}:`, err);
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to add sibling:', error);
      alert('Failed to add sibling');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Add Sibling</h2>
          <p className="text-sm text-gray-600 mt-1">
            Add a sibling for {person.firstName} {person.lastName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Sibling Type Selection */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Sibling Type</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSiblingType('FULL')}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  siblingType === 'FULL'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">Full Sibling</div>
                <div className="text-xs mt-1 opacity-75">Same parents</div>
              </button>
              <button
                type="button"
                onClick={() => setSiblingType('HALF')}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  siblingType === 'HALF'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">Half-Sibling</div>
                <div className="text-xs mt-1 opacity-75">One shared parent</div>
              </button>
              <button
                type="button"
                onClick={() => setSiblingType('STEP')}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  siblingType === 'STEP'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">Step-Sibling</div>
                <div className="text-xs mt-1 opacity-75">No shared parents</div>
              </button>
            </div>
          </div>

          {/* Parent Selection Section - Show based on sibling type */}
          {siblingType !== 'STEP' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Shared Parents
                {siblingType === 'FULL' && parentPeople.length < 2 && (
                  <span className="ml-2 text-amber-600 font-normal text-xs">
                    (Reference person has {parentPeople.length} parent{parentPeople.length !== 1 ? 's' : ''} in tree)
                  </span>
                )}
              </h3>

              {parentPeople.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> {person.firstName} doesn't have any parents defined in the tree.
                    The new sibling will be created without parent relationships.
                    You can add parent relationships later.
                  </p>
                </div>
              ) : siblingType === 'FULL' ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">
                    Full siblings share both parents. The new sibling will be linked to:
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {parentPeople.map(parent => (
                      <div key={parent.id} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-700">{parent.firstName} {parent.lastName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : siblingType === 'HALF' ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">
                    Half-siblings share exactly one parent. Select the shared parent:
                  </p>
                  <div className="space-y-2">
                    {parentPeople.map(parent => (
                      <label
                        key={parent.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          sharedParent === parent.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="sharedParent"
                          value={parent.id}
                          checked={sharedParent === parent.id}
                          onChange={(e) => {
                            setSharedParent(e.target.value);
                            setSelectedParents([e.target.value]);
                          }}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{parent.firstName} {parent.lastName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {siblingType === 'STEP' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                <strong>Step-siblings</strong> share no biological parents. They are related through their
                parents' marriage/partnership. The new sibling will not be linked to {person.firstName}'s parents.
              </p>
            </div>
          )}

          {/* Info about automatic sibling linking */}
          {existingSiblings.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> This sibling will also be automatically linked to {person.firstName}'s
                {existingSiblings.length === 1 ? ' existing sibling' : ` ${existingSiblings.length} existing siblings`}.
                The relationship type (full/half/step) will be determined based on shared parents.
              </p>
            </div>
          )}

          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nickname
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UNKNOWN">Unknown</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Birth Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Birth Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Date
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Place
                </label>
                <input
                  type="text"
                  value={formData.birthPlace}
                  onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City, State/Country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Order (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={birthOrder}
                  onChange={(e) => setBirthOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1 = oldest"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Specify birth order among siblings (1 = oldest child)
                </p>
              </div>
            </div>
          </div>

          {/* Living Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isLiving-sibling"
              checked={formData.isLiving}
              onChange={(e) => setFormData({ ...formData, isLiving: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isLiving-sibling" className="text-sm font-medium text-gray-700">
              This person is living
            </label>
          </div>

          {/* Placeholder Option */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="isPlaceholder-sibling"
                checked={formData.isPlaceholder}
                onChange={(e) => setFormData({ ...formData, isPlaceholder: e.target.checked })}
                className="mt-1 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <label htmlFor="isPlaceholder-sibling" className="text-sm font-medium text-gray-700">
                  Create as placeholder
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Add this person to the tree without requiring them to have an account. They can claim their profile later.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.firstName.trim() || !formData.lastName.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Adding Sibling...
                </>
              ) : (
                'Add Sibling'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddRelationshipModal({ person, allPeople, treeId, onClose, onSuccess }: AddRelationshipModalProps) {
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('PARENT');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const otherPeople = allPeople.filter(p => p.id !== person.id);

  const relationshipTypes: RelationshipType[] = [
    'PARENT',
    'CHILD',
    'SPOUSE',
    'SIBLING',
    'ADOPTIVE_PARENT',
    'ADOPTIVE_CHILD',
    'STEP_PARENT',
    'STEP_CHILD',
    'FOSTER_PARENT',
    'FOSTER_CHILD',
    'GUARDIAN',
    'WARD',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          personFromId: person.id,
          personToId: selectedPersonId,
          relationshipType,
          notes: notes || undefined,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create relationship');
      }
    } catch (error) {
      console.error('Failed to create relationship:', error);
      alert('Failed to create relationship');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Relationship</h2>
          <p className="text-sm text-gray-600 mt-1">
            Define a relationship for {person.firstName} {person.lastName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Person
            </label>
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a person...</option>
              {otherPeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                  {p.birthDate && ` (b. ${new Date(p.birthDate).getFullYear()})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relationship Type
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {relationshipTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {person.firstName} is {relationshipType.toLowerCase().replace(/_/g, ' ')} of the selected person
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Add any additional information about this relationship"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedPersonId}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Relationship'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Missing Parents Modal - shows people who don't have 2 parents and allows assigning parents
interface MissingParentsModalProps {
  treeId: string;
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
}

interface PersonMissingParents {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  parentCount: number;
  missing?: string[]; // ['Father'], ['Mother'], or ['Father', 'Mother']
  hasFather?: boolean;
  hasMother?: boolean;
  parents: Array<{ id: string; firstName: string; lastName: string }>;
  missingCount: number;
}

interface ParentNeedingGender {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
}

function MissingParentsModal({ treeId, onClose, onSelectPerson }: MissingParentsModalProps) {
  const [loading, setLoading] = useState(true);
  const [peopleMissingParents, setPeopleMissingParents] = useState<PersonMissingParents[]>([]);
  const [parentsNeedingGender, setParentsNeedingGender] = useState<ParentNeedingGender[]>([]);
  const [activeTab, setActiveTab] = useState<'missing' | 'unknown'>('missing');

  useEffect(() => {
    fetchMissingParents();
  }, []);

  const fetchMissingParents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/people-missing-parents`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPeopleMissingParents(data.data.people);
        setParentsNeedingGender(data.data.parentsNeedingGender || []);
      }
    } catch (error) {
      console.error('Failed to fetch people missing parents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePersonClick = (personId: string) => {
    onClose();
    onSelectPerson(personId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Parent Relationship Issues</h2>
            <p className="text-sm text-gray-600 mt-1">
              Fix missing or incomplete parent information
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('missing')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'missing'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Missing Parents
              {peopleMissingParents.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                  {peopleMissingParents.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('unknown')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'unknown'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Parents Need Gender
              {parentsNeedingGender.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
                  {parentsNeedingGender.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : activeTab === 'missing' ? (
            // Missing Parents Tab
            peopleMissingParents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>All people have both a father and mother assigned!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Click on a person to open their profile and add a parent relationship.
                </p>
                <div className="space-y-2">
                  {peopleMissingParents.map((person) => (
                    <div
                      key={person.id}
                      className="p-4 rounded-lg border cursor-pointer transition-colors border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                      onClick={() => handlePersonClick(person.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">
                            {person.firstName} {person.lastName}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {person.missing?.includes('Father') && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                              Missing Father
                            </span>
                          )}
                          {person.missing?.includes('Mother') && (
                            <span className="text-xs px-2 py-1 rounded bg-pink-100 text-pink-700">
                              Missing Mother
                            </span>
                          )}
                          {!person.missing?.length && person.parentCount < 2 && (
                            <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                              {person.parentCount === 0 ? 'No parents' : '1 parent'}
                            </span>
                          )}
                        </div>
                      </div>
                      {person.parents.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          Has: {person.parents.map((p: any) => `${p.firstName} ${p.lastName}${p.role ? ` (${p.role})` : ''}`).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            // Parents Need Gender Tab
            parentsNeedingGender.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>All parents have their gender specified!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  These people are parents but don't have their gender set. Click to edit and set as Male (Father) or Female (Mother).
                </p>
                <div className="space-y-2">
                  {parentsNeedingGender.map((person) => (
                    <div
                      key={person.id}
                      className="p-4 rounded-lg border cursor-pointer transition-colors border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                      onClick={() => handlePersonClick(person.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {person.firstName} {person.lastName}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                          Gender: {person.gender || 'Not set'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Set gender to Male or Female so they can be properly identified as Father or Mother
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
