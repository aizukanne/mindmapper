import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Plus, Settings, User, LogOut, UserPlus } from 'lucide-react';
import { PersonEditDialog } from '@/components/tree/PersonEditDialog';
import { DiffViewer } from '@/components/history/DiffViewer';
import type { Person } from '@mindmapper/types';

// Sample data for DiffViewer demonstration
const previousNodeState = {
  id: 'node-1',
  text: 'Original Title',
  type: 'TOPIC',
  positionX: 100,
  positionY: 200,
  width: 150,
  height: 50,
  style: {
    backgroundColor: '#ffffff',
    borderColor: '#3b82f6',
    borderWidth: 2,
    borderRadius: 8,
    textColor: '#1f2937',
    fontSize: 14,
    fontWeight: 'normal',
    shape: 'rectangle',
  },
  isCollapsed: false,
};

const newNodeState = {
  id: 'node-1',
  text: 'Updated Title with More Content',
  type: 'TOPIC',
  positionX: 150,
  positionY: 250,
  width: 200,
  height: 60,
  style: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
    borderWidth: 3,
    borderRadius: 12,
    textColor: '#0c4a6e',
    fontSize: 16,
    fontWeight: 'bold',
    shape: 'rounded',
  },
  isCollapsed: true,
  metadata: { tags: ['important'] },
};

// Sample person data for editing test
const samplePerson: Person = {
  id: 'sample-person-1',
  treeId: 'sample-tree-1',
  firstName: 'John',
  middleName: 'William',
  lastName: 'Smith',
  maidenName: null,
  suffix: 'Jr.',
  nickname: 'Johnny',
  gender: 'MALE',
  birthDate: new Date('1985-06-15'),
  birthPlace: 'New York, NY, USA',
  deathDate: null,
  deathPlace: null,
  isLiving: true,
  biography: 'John is a dedicated software engineer with a passion for building family tree applications.',
  occupation: 'Software Engineer',
  education: 'MIT, Computer Science',
  privacy: 'FAMILY_ONLY',
  profilePhoto: null,
  positionX: 0,
  positionY: 0,
  generation: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export default function UIShowcase() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [personEditDialogOpen, setPersonEditDialogOpen] = React.useState(false);
  const [personEditMode, setPersonEditMode] = React.useState<'create' | 'edit'>('create');
  const [savedPerson, setSavedPerson] = React.useState<Person | null>(null);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">shadcn/ui Component Showcase</h1>
          <p className="text-muted-foreground">
            A demonstration of all installed shadcn/ui components with Radix UI primitives.
          </p>
        </div>

        {/* Button Section */}
        <section className="space-y-4" data-testid="button-section">
          <h2 className="text-xl font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button data-testid="btn-default">Default</Button>
            <Button variant="secondary" data-testid="btn-secondary">Secondary</Button>
            <Button variant="destructive" data-testid="btn-destructive">Destructive</Button>
            <Button variant="outline" data-testid="btn-outline">Outline</Button>
            <Button variant="ghost" data-testid="btn-ghost">Ghost</Button>
            <Button variant="link" data-testid="btn-link">Link</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button size="sm" data-testid="btn-sm">Small</Button>
            <Button size="default">Default Size</Button>
            <Button size="lg" data-testid="btn-lg">Large</Button>
            <Button size="icon" data-testid="btn-icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Card Section */}
        <section className="space-y-4" data-testid="card-section">
          <h2 className="text-xl font-semibold">Cards</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-basic">
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>This is the card content area.</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Action</Button>
              </CardFooter>
            </Card>
            <Card data-testid="card-form">
              <CardHeader>
                <CardTitle>Create Project</CardTitle>
                <CardDescription>Deploy your new project in one-click.</CardDescription>
              </CardHeader>
              <CardContent>
                <form>
                  <div className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Name of your project" />
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel</Button>
                <Button>Deploy</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Input Section */}
        <section className="space-y-4" data-testid="input-section">
          <h2 className="text-xl font-semibold">Inputs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                data-testid="input-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="controlled">Controlled Input</Label>
              <Input
                id="controlled"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type something..."
                data-testid="input-controlled"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disabled">Disabled Input</Label>
              <Input
                id="disabled"
                placeholder="Can't edit this"
                disabled
                data-testid="input-disabled"
              />
            </div>
          </div>
        </section>

        {/* Dialog Section */}
        <section className="space-y-4" data-testid="dialog-section">
          <h2 className="text-xl font-semibold">Dialogs</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="dialog-trigger">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-content">
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogDescription>
                  Make changes to your profile here. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dialog-name" className="text-right">
                    Name
                  </Label>
                  <Input id="dialog-name" placeholder="John Doe" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dialog-username" className="text-right">
                    Username
                  </Label>
                  <Input id="dialog-username" placeholder="@johndoe" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={() => setDialogOpen(false)} data-testid="dialog-save">
                  Save changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>

        {/* Dropdown Menu Section */}
        <section className="space-y-4" data-testid="dropdown-section">
          <h2 className="text-xl font-semibold">Dropdown Menus</h2>
          <div className="flex gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="dropdown-trigger">
                  Open Menu <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent data-testid="dropdown-content">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="dropdown-item-profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="dropdown-item-settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="dropdown-item-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>

        {/* DiffViewer Section */}
        <section className="space-y-4" data-testid="diff-viewer-section">
          <h2 className="text-xl font-semibold">Diff Viewer</h2>
          <p className="text-sm text-muted-foreground">
            A component for visualizing property changes with inline and side-by-side views.
            Supports nested object diffing, color swatches, and collapsible sections.
          </p>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Node Property Changes</CardTitle>
              <CardDescription>
                Toggle between inline and side-by-side view modes to compare changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DiffViewer
                previousState={previousNodeState}
                newState={newNodeState}
                entityType="NODE"
                showViewToggle={true}
              />
            </CardContent>
          </Card>
        </section>

        {/* Person Edit Dialog Section */}
        <section className="space-y-4" data-testid="person-edit-section">
          <h2 className="text-xl font-semibold">Person Edit Dialog</h2>
          <p className="text-sm text-muted-foreground">
            A comprehensive form for editing person details with validation and privacy settings.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => {
                setPersonEditMode('create');
                setPersonEditDialogOpen(true);
              }}
              data-testid="person-edit-create-trigger"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add New Person
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPersonEditMode('edit');
                setPersonEditDialogOpen(true);
              }}
              data-testid="person-edit-edit-trigger"
            >
              <User className="mr-2 h-4 w-4" />
              Edit Sample Person
            </Button>
          </div>
          {savedPerson && (
            <Card className="mt-4" data-testid="saved-person-card">
              <CardHeader>
                <CardTitle className="text-lg">Last Saved Person</CardTitle>
              </CardHeader>
              <CardContent>
                <p data-testid="saved-person-name">
                  <strong>Name:</strong> {savedPerson.firstName} {savedPerson.middleName || ''} {savedPerson.lastName}
                </p>
                <p data-testid="saved-person-gender">
                  <strong>Gender:</strong> {savedPerson.gender}
                </p>
                {savedPerson.birthDate && (
                  <p data-testid="saved-person-birthDate">
                    <strong>Birth Date:</strong> {new Date(savedPerson.birthDate).toLocaleDateString()}
                  </p>
                )}
                {savedPerson.occupation && (
                  <p data-testid="saved-person-occupation">
                    <strong>Occupation:</strong> {savedPerson.occupation}
                  </p>
                )}
                <p data-testid="saved-person-privacy">
                  <strong>Privacy:</strong> {savedPerson.privacy}
                </p>
              </CardContent>
            </Card>
          )}
          <PersonEditDialog
            person={personEditMode === 'edit' ? samplePerson : null}
            treeId="sample-tree-1"
            open={personEditDialogOpen}
            onClose={() => setPersonEditDialogOpen(false)}
            onSave={(person) => {
              setSavedPerson(person);
              setPersonEditDialogOpen(false);
            }}
            userRole="ADMIN"
          />
        </section>

        {/* All Components Summary */}
        <section className="space-y-4 pt-8 border-t" data-testid="summary-section">
          <h2 className="text-xl font-semibold">Components Summary</h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Button - All variants and sizes working</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Card - Header, Content, Footer components working</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Dialog - Modal with Radix UI primitives working</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Input - Form inputs with labels working</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Dropdown Menu - With Radix UI primitives working</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Person Edit Dialog - Comprehensive form with validation and privacy settings</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Diff Viewer - Inline and side-by-side property diff visualization</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
