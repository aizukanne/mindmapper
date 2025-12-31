# MindMapper

A powerful, collaborative web-based mind mapping application with real-time multi-user editing, built with React, TypeScript, and Yjs CRDT.

![MindMapper](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)

## Features

### Core Features
- **Interactive Canvas**: Drag-and-drop mind map editing with React Flow
- **Real-time Collaboration**: Multiple users can edit simultaneously using Yjs CRDT
- **Offline Support**: Works offline with IndexedDB persistence and automatic sync
- **Rich Node Styling**: Customize colors, shapes, fonts, and borders
- **Hierarchical Layouts**: Automatic layout with Dagre algorithm

### Collaboration
- **Live Cursors**: See other users' cursors in real-time
- **Presence Indicators**: Know who's viewing and editing
- **Selection Indicators**: See which nodes others are working on
- **Comments System**: Add comments to maps and nodes with threading support
- **Version History**: Track changes with diff visualization and restore capability

### Organization
- **Folders**: Organize maps in nested folder structures
- **Favorites**: Star important maps for quick access
- **Templates**: Start from pre-built templates (Brainstorming, SWOT, Project Plan, etc.)
- **Global Search**: Search across all maps and nodes with Ctrl+K

### Export & Import
- **Export Formats**: JSON, Markdown, SVG, PNG, PDF, Plain Text
- **Import Formats**: MindMapper JSON, FreeMind XML (.mm), Simple JSON

### Mobile Support
- **Touch Gestures**: Pinch-to-zoom, two-finger pan, double-tap zoom
- **Mobile Toolbar**: Bottom sheet with common actions
- **Responsive UI**: Optimized for tablets and phones
- **Offline Indicator**: Know when you're working offline

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Canvas** | React Flow (@xyflow/react) |
| **State** | Zustand + Yjs CRDT |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Real-time** | Yjs + WebSocket + Redis |
| **Auth** | Clerk (optional) |

## Getting Started

### Prerequisites

- Node.js 18+ (20+ recommended)
- pnpm 8+ (package manager)
- Docker & Docker Compose (for PostgreSQL and Redis)
- Git

### Installing pnpm

If you don't have pnpm installed, you can install it using one of these methods:

**Using npm (comes with Node.js):**
```bash
npm install -g pnpm
```

**Using Homebrew (macOS):**
```bash
brew install pnpm
```

**Using the standalone script (Linux/macOS):**
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

**Using PowerShell (Windows):**
```powershell
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

**Using Corepack (Node.js 16.13+):**
```bash
corepack enable
corepack prepare pnpm@latest --activate
```

Verify installation:
```bash
pnpm --version
```

### Installation from GitHub

1. **Clone the repository**
   ```bash
   git clone https://github.com/aizukanne/mindmapper.git
   cd mindmapper
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration (see [Environment Variables](#environment-variables) below).

4. **Start Docker services (PostgreSQL + Redis)**
   ```bash
   cd docker && docker compose up -d && cd ..
   ```

5. **Generate Prisma client**
   ```bash
   pnpm --filter @mindmapper/db db:generate
   ```

6. **Push database schema**
   ```bash
   pnpm --filter @mindmapper/db db:push
   ```

7. **Seed templates (optional but recommended)**
   ```bash
   pnpm --filter @mindmapper/db db:seed
   ```

8. **Start development servers**
   ```bash
   pnpm dev
   ```

### Development URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001 |
| Yjs WebSocket | ws://localhost:3001/yjs |
| Health Check | http://localhost:3001/health |

## Project Structure

```
mindmapper/
├── apps/
│   ├── web/                      # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/       # UI components
│   │   │   │   ├── canvas/       # React Flow components
│   │   │   │   ├── collaboration/# Cursors, presence
│   │   │   │   ├── comments/     # Comment system
│   │   │   │   ├── export/       # Export modal
│   │   │   │   ├── help/         # Keyboard shortcuts modal
│   │   │   │   ├── history/      # Version history
│   │   │   │   ├── import/       # Import modal
│   │   │   │   ├── mobile/       # Mobile toolbar, offline indicator
│   │   │   │   ├── search/       # Global search
│   │   │   │   ├── sharing/      # Share modal
│   │   │   │   ├── sidebar/      # Folder tree
│   │   │   │   ├── templates/    # Template gallery
│   │   │   │   ├── toolbar/      # Editing toolbar
│   │   │   │   └── ui/           # shadcn components
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── stores/           # Zustand stores
│   │   │   ├── pages/            # Route pages
│   │   │   └── lib/              # Utilities
│   │   └── package.json
│   │
│   └── api/                      # Express backend
│       ├── src/
│       │   ├── routes/           # API endpoints
│       │   ├── middleware/       # Auth, error handling
│       │   ├── yjs/              # WebSocket server & persistence
│       │   └── lib/              # Prisma, Redis clients
│       └── package.json
│
├── packages/
│   ├── db/                       # Prisma schema & migrations
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Database schema
│   │   │   └── seed.ts           # Template seeding
│   │   └── package.json
│   │
│   └── types/                    # Shared TypeScript types
│       └── package.json
│
├── docker/
│   └── docker-compose.yml        # PostgreSQL + Redis
├── turbo.json                    # Turborepo config
├── pnpm-workspace.yaml           # pnpm workspace
└── package.json                  # Root package
```

## Keyboard Shortcuts

### Node Operations
| Shortcut | Action |
|----------|--------|
| `Tab` | Add child node |
| `Enter` | Add sibling node |
| `Delete` / `Backspace` | Delete selected node |
| `Ctrl+D` | Duplicate node (with subtree) |
| Double-click | Edit node text |

### Navigation & View
| Shortcut | Action |
|----------|--------|
| `Space` (hold) | Pan mode |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `Ctrl+0` | Fit view |

### Edit History
| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |

### Application
| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open global search |
| `Shift+?` | Show keyboard shortcuts |
| `Esc` | Close modal / Cancel |

## API Endpoints

### Maps
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/maps` | List user's maps |
| POST | `/api/maps` | Create new map |
| GET | `/api/maps/:id` | Get map with nodes |
| PUT | `/api/maps/:id` | Update map metadata |
| DELETE | `/api/maps/:id` | Delete map |

### Nodes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/maps/:id/nodes` | Create node |
| PUT | `/api/maps/:id/nodes/:nodeId` | Update node |
| DELETE | `/api/maps/:id/nodes/:nodeId` | Delete node |
| POST | `/api/maps/:id/nodes/batch` | Batch operations |

### Export & Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/maps/:id/export/:format` | Export (json, markdown, svg, png, pdf, text) |
| POST | `/api/maps/import` | Import from file |
| POST | `/api/maps/import/detect` | Detect file format |

### Collaboration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/maps/:id/shares` | List shares |
| POST | `/api/maps/:id/shares` | Create share link |
| DELETE | `/api/maps/:id/shares/:shareId` | Revoke share |
| GET | `/api/maps/:id/comments` | List comments |
| POST | `/api/maps/:id/comments` | Add comment |
| GET | `/api/maps/:id/history` | Version history |

### Organization
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/folders` | List folders |
| POST | `/api/folders` | Create folder |
| GET | `/api/templates` | List templates |
| POST | `/api/maps/from-template/:id` | Create from template |
| GET | `/api/search` | Global search |

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://mindmapper:mindmapper_dev@localhost:5432/mindmapper"

# Redis
REDIS_URL="redis://localhost:6379"

# API
API_PORT=3001

# Clerk Authentication (optional - app works without it in dev mode)
CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Frontend
VITE_API_URL="http://localhost:3001"
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."

# CORS (for production)
CORS_ORIGIN="http://localhost:5173"
```

## Docker Services

The `docker/docker-compose.yml` provides:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: mindmapper
      POSTGRES_PASSWORD: mindmapper_dev
      POSTGRES_DB: mindmapper

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

### Docker Commands

```bash
# Start services
cd docker && docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Reset database
docker compose down -v && docker compose up -d
```

## Scripts

### Root
```bash
pnpm dev          # Start all development servers
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm typecheck    # Type check all packages
```

### Database (packages/db)
```bash
pnpm --filter @mindmapper/db db:generate  # Generate Prisma client
pnpm --filter @mindmapper/db db:push      # Push schema to database
pnpm --filter @mindmapper/db db:seed      # Seed templates
pnpm --filter @mindmapper/db db:studio    # Open Prisma Studio
```

### API (apps/api)
```bash
pnpm --filter api dev     # Start API server
pnpm --filter api build   # Build API
```

### Web (apps/web)
```bash
pnpm --filter @mindmapper/web dev    # Start web dev server
pnpm --filter @mindmapper/web build  # Build for production
```

## Deployment

### Production Build

```bash
# Build all packages
pnpm build

# The built files will be in:
# - apps/web/dist (frontend)
# - apps/api/dist (backend)
```

### Environment Variables for Production

Set these in your deployment environment:

```bash
NODE_ENV=production
DATABASE_URL=<your-production-postgres-url>
REDIS_URL=<your-production-redis-url>
CLERK_SECRET_KEY=<your-clerk-secret>
CORS_ORIGIN=<your-frontend-domain>
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React Flow](https://reactflow.dev/) - Interactive node-based canvas
- [Yjs](https://yjs.dev/) - CRDT for real-time collaboration
- [Prisma](https://www.prisma.io/) - Database ORM
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Clerk](https://clerk.com/) - Authentication

---

**Repository**: [https://github.com/aizukanne/mindmapper](https://github.com/aizukanne/mindmapper)
