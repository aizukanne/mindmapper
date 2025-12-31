# MindMapper

A collaborative web-based mind mapping application with real-time multi-user editing.

## Features

- **Real-time Collaboration**: Multiple users can edit the same mind map simultaneously using Yjs CRDT
- **Interactive Canvas**: Drag-and-drop nodes with React Flow
- **Rich Node Styling**: Customize colors, shapes, fonts, and icons
- **Hierarchical Layouts**: Automatic layout algorithms (Dagre)
- **Offline Support**: Works offline with IndexedDB persistence
- **Keyboard Shortcuts**: Efficient editing with keyboard navigation
- **Sharing**: Share maps with specific users or via public links

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Canvas**: React Flow (@xyflow/react)
- **State Management**: Zustand + Yjs CRDT
- **Styling**: Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma
- **Real-time**: Yjs + WebSocket
- **Auth**: Clerk (optional)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL and Redis)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start PostgreSQL and Redis
cd docker && docker-compose up -d

# Generate Prisma client
cd packages/db && npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development servers
pnpm dev
```

### Development URLs

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001
- **Yjs WebSocket**: ws://localhost:3001/yjs

## Project Structure

```
mindmapper/
├── apps/
│   ├── web/           # React frontend
│   └── api/           # Express backend
├── packages/
│   ├── db/            # Prisma schema and client
│   └── types/         # Shared TypeScript types
├── docker/            # Docker Compose config
└── turbo.json         # Turborepo config
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Add child node |
| Enter | Add sibling node |
| Delete | Delete selected node |
| Double-click | Edit node text |
| Ctrl+0 | Fit view |
| Ctrl++ | Zoom in |
| Ctrl+- | Zoom out |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `CLERK_PUBLISHABLE_KEY` | Clerk public key (optional) |
| `CLERK_SECRET_KEY` | Clerk secret key (optional) |
| `VITE_API_URL` | API URL for frontend |
| `VITE_YJS_WEBSOCKET_URL` | WebSocket URL for Yjs |

## License

MIT
