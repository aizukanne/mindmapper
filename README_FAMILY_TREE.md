# MindMapper Family Tree Edition

A genealogy-focused extension of the MindMapper platform that transforms collaborative mind mapping into a comprehensive family tree builder with role-based access control, privacy settings, and specialized genealogical features.

![MindMapper Family Tree](https://img.shields.io/badge/version-1.0.0--familytree-purple.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)

## What's New in Family Tree Edition

### Genealogy-Specific Features

| Feature | Description |
|---------|-------------|
| **Vertical Hierarchy** | Ancestors at top, descendants at bottom (vs free-form canvas) |
| **Structured Person Data** | Birth/death dates, places, relationships, occupations |
| **Role-Based Permissions** | Admin, Member, Viewer roles with granular permissions |
| **Privacy Controls** | Per-person and per-tree privacy settings for living individuals |
| **GEDCOM Import** | Import from 23andMe, Ancestry, FamilyTreeDNA, and other providers |
| **DNA Integration** | Store haplogroup notes and test provider information |
| **Photo Gallery** | Upload, tag, and organize family photos with privacy controls |
| **Document Storage** | Attach birth certificates, marriage records, census data |
| **Family Stories** | Collaborative storytelling with comments and likes |
| **Activity Feed** | Track all changes to the family tree |
| **Completeness Tracking** | Profile completion scores and improvement suggestions |
| **Badges & Gamification** | Earn badges for building comprehensive family trees |
| **Mobile Support** | Touch-optimized navigation with pinch-to-zoom and gestures |

## Quick Start

### Prerequisites

- Node.js 18+ (20 LTS recommended)
- pnpm 8+
- Docker & Docker Compose

### Installation

```bash
# Clone the repository
git clone -b feature/family-tree https://github.com/aizukanne/mindmapper.git
cd mindmapper

# Install dependencies
pnpm install

# Start Docker services (PostgreSQL + Redis)
cd docker && docker compose up -d && cd ..

# Setup database
pnpm --filter @mindmapper/db db:generate
pnpm --filter @mindmapper/db db:push

# Start development servers
pnpm dev
```

### Access the Application

| Service | URL |
|---------|-----|
| Web App | http://localhost:5173 |
| API | http://localhost:3001 |
| Health Check | http://localhost:3001/health |

## Family Tree Features

### Epic 1: Authentication & Roles ✅

- **Tree Roles**: Admin, Member, Viewer with hierarchical permissions
- **Invitations**: Email-based invites with role assignment
- **Member Management**: Promote, demote, and remove members
- **Creator Protection**: Tree creator always has admin access

### Epic 2: Person Management ✅

- **Comprehensive Profiles**: Names, dates, places, biographies
- **Multiple Relationship Types**: Parent-child, spouse, sibling
- **Marriage Records**: Marriage/divorce dates, places, notes
- **Profile Photos**: Upload and manage person photos
- **Living Person Privacy**: Automatic protection for living individuals

### Epic 3: Privacy Controls ✅

- **Tree Privacy Levels**: Private, Family Only, Public
- **Person Privacy**: Individual privacy settings per person
- **Photo Privacy**: Control who sees each photo
- **Living Person Protection**: Automatic restrictions on living person data

### Epic 4: Navigation & Visualization ✅

- **Tree Canvas**: Interactive family tree visualization
- **Generation View**: See family members by generation
- **Timeline View**: Chronological view of family events
- **Search & Filter**: Find people by name, date, place
- **Breadcrumb Navigation**: Easy navigation through relationships

### Epic 5: Collaboration ✅

- **Suggested Edits**: Non-admins can suggest changes for review
- **Photo Gallery**: Shared photo collection with tagging
- **Document Attachments**: Store and share family documents
- **Family Stories**: Collaborative storytelling

### Epic 6: Data Quality ✅

- **Duplicate Detection**: Find and merge duplicate profiles
- **Tree Statistics**: Overview of tree composition
- **Activity Feed**: Track all changes
- **GEDCOM Import**: Import from genealogy software

### Epic 7: Mobile Experience ✅

- **Touch Navigation**: Pinch-to-zoom, pan, double-tap
- **Quick Add**: Simplified mobile form with camera
- **Bottom Sheet**: Mobile-optimized navigation
- **Voice Input**: Dictate biographies on mobile

### Epic 8: Gamification ✅

- **Completeness Scores**: Track profile completion
- **Badges**: Earn achievements for tree building
- **Suggestions**: Actionable improvement recommendations
- **DNA Notes**: Store haplogroup and test information

## API Reference

### Family Trees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/family-trees` | List user's trees |
| POST | `/api/family-trees` | Create new tree |
| GET | `/api/family-trees/:id` | Get tree with members |
| PUT | `/api/family-trees/:id` | Update tree |
| DELETE | `/api/family-trees/:id` | Delete tree |

### People

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/family-trees/:treeId/people` | List people |
| POST | `/api/family-trees/:treeId/people` | Add person |
| GET | `/api/family-trees/:treeId/people/:id` | Get person |
| PUT | `/api/family-trees/:treeId/people/:id` | Update person |
| DELETE | `/api/family-trees/:treeId/people/:id` | Delete person |

### Relationships

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/family-trees/:treeId/relationships` | Create relationship |
| DELETE | `/api/family-trees/:treeId/relationships/:id` | Delete relationship |
| POST | `/api/family-trees/:treeId/marriages` | Create marriage |

### Members & Invitations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/family-trees/:treeId/invitations` | Invite member |
| POST | `/api/family-trees/invitations/:id/accept` | Accept invitation |
| PATCH | `/api/family-trees/:treeId/members/:id/role` | Change role |
| DELETE | `/api/family-trees/:treeId/members/:id` | Remove member |

### Photos & Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/family-trees/:treeId/photos` | List photos |
| POST | `/api/family-trees/:treeId/photos/upload` | Upload photo |
| GET | `/api/family-trees/:treeId/documents` | List documents |
| POST | `/api/family-trees/:treeId/documents/upload` | Upload document |

### Stories & Activity

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/family-trees/:treeId/stories` | List stories |
| POST | `/api/family-trees/:treeId/stories` | Create story |
| GET | `/api/family-trees/:treeId/activity` | Activity feed |

### Import & Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/family-trees/import/gedcom/preview` | Preview GEDCOM |
| POST | `/api/family-trees/import/gedcom/confirm` | Confirm import |
| GET | `/api/family-trees/:treeId/statistics` | Tree statistics |
| GET | `/api/family-trees/:treeId/completeness` | Completeness data |
| GET | `/api/family-trees/:treeId/badges` | Badge progress |

## Project Structure

```
mindmapper/
├── apps/
│   ├── web/src/
│   │   ├── components/
│   │   │   ├── family-tree/          # Family tree specific components
│   │   │   │   └── MemberManagementModal.tsx
│   │   │   └── tree/                 # Tree visualization components
│   │   │       ├── FamilyTreeCanvas.tsx
│   │   │       ├── PersonCard.tsx
│   │   │       ├── PhotoGallery.tsx
│   │   │       ├── DocumentGallery.tsx
│   │   │       ├── StoryGallery.tsx
│   │   │       ├── ActivityFeed.tsx
│   │   │       ├── TimelineView.tsx
│   │   │       ├── TreeStatistics.tsx
│   │   │       ├── CompletenessWidget.tsx
│   │   │       ├── Badges.tsx
│   │   │       ├── GedcomImport.tsx
│   │   │       ├── DnaInfo.tsx
│   │   │       ├── MobileFamilyTree.tsx
│   │   │       ├── MobileQuickAdd.tsx
│   │   │       └── ...
│   │   ├── hooks/
│   │   │   ├── useTreePermissions.ts
│   │   │   ├── useActivity.ts
│   │   │   ├── useGedcomImport.ts
│   │   │   ├── useMobileTreeGestures.ts
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── FamilyTreeDashboard.tsx
│   │   │   ├── FamilyTreeEditor.tsx
│   │   │   └── AcceptInvitation.tsx
│   │   └── lib/
│   │       ├── permissions.ts
│   │       └── dateUtils.ts
│   │
│   └── api/src/
│       ├── routes/
│       │   └── familyTrees.ts        # All family tree API endpoints
│       └── lib/
│           ├── gedcom-parser.ts      # GEDCOM file parser
│           ├── storage.ts            # S3 storage utilities
│           └── email.ts              # Email notifications
│
├── packages/
│   ├── db/prisma/
│   │   └── schema.prisma             # Database schema with family tree models
│   └── types/src/
│       └── index.ts                  # Shared TypeScript types
│
├── FAMILY_TREE_STATUS.md             # Detailed implementation status
├── DEPLOYMENT_GUIDE.md               # Server deployment instructions
└── README_FAMILY_TREE.md             # This file
```

## Database Schema

### Core Models

```prisma
model FamilyTree {
  id          String       @id
  name        String
  description String?
  privacy     TreePrivacy  @default(PRIVATE)
  createdBy   String
  // ... relations
}

model Person {
  id            String
  firstName     String
  lastName      String
  birthDate     DateTime?
  birthPlace    String?
  deathDate     DateTime?
  deathPlace    String?
  isLiving      Boolean      @default(true)
  gender        Gender
  biography     String?
  privacy       PersonPrivacy
  // DNA fields
  dnaTestProvider   String?
  yDnaHaplogroup    String?
  mtDnaHaplogroup   String?
  // ... relations
}

model TreeMember {
  id     String
  treeId String
  userId String
  role   TreeRole  // ADMIN, MEMBER, VIEWER
}

model Relationship {
  personFromId String
  personToId   String
  type         RelationshipType
}
```

### Enums

```prisma
enum TreePrivacy    { PRIVATE, FAMILY_ONLY, PUBLIC }
enum PersonPrivacy  { PUBLIC, FAMILY_ONLY, PRIVATE }
enum TreeRole       { ADMIN, MEMBER, VIEWER }
enum Gender         { MALE, FEMALE, OTHER, UNKNOWN }
enum RelationshipType { PARENT_CHILD, SIBLING, ADOPTIVE, STEP }
```

## Environment Variables

```bash
# Required
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."

# Optional - Authentication
CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
VITE_CLERK_PUBLISHABLE_KEY="pk_..."

# Optional - S3 Storage
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
S3_BUCKET_NAME="..."

# Optional - Email
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@..."
```

## Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete server deployment instructions including:

- Server setup (Ubuntu)
- Docker configuration
- Nginx reverse proxy
- SSL/HTTPS setup
- PM2 process management
- Monitoring and maintenance

## Testing the Features

### 1. Create a Family Tree

```bash
# Navigate to Family Trees from the dashboard
# Click "Create New Tree"
# Set privacy level and create
```

### 2. Add Family Members

```bash
# Click "Add Person" in the tree editor
# Fill in name, dates, places
# Set relationships (parent, spouse, sibling)
```

### 3. Import from GEDCOM

```bash
# Click "Import" in tree settings
# Upload .ged file from Ancestry, 23andMe, etc.
# Preview and confirm import
```

### 4. Test Mobile Features

```bash
# Open DevTools → Toggle Device Toolbar
# Select a mobile device
# Test pinch-to-zoom, pan, Quick Add
```

### 5. Check Completeness

```bash
# Navigate to tree statistics
# View completeness score
# Follow suggestions to improve profiles
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Base MindMapper application
- [React Flow](https://reactflow.dev/) for canvas
- [Prisma](https://www.prisma.io/) for database
- [shadcn/ui](https://ui.shadcn.com/) for components

---

**Branch**: `feature/family-tree`
**Repository**: [https://github.com/aizukanne/mindmapper](https://github.com/aizukanne/mindmapper)
