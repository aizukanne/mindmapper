import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import { errorHandler } from './middleware/errorHandler.js';
import { clerkMiddleware, syncUser } from './middleware/auth.js';
import { mapsRouter } from './routes/maps.js';
import { nodesRouter } from './routes/nodes.js';
import { sharesRouter } from './routes/shares.js';
import { commentsRouter } from './routes/comments.js';
import { historyRouter } from './routes/history.js';
import { templatesRouter } from './routes/templates.js';
import { foldersRouter } from './routes/folders.js';
import { searchRouter } from './routes/search.js';
import { exportRouter } from './routes/export.js';
import { importRouter } from './routes/import.js';
import { setupYjsServer } from './yjs/server.js';
import { connectRedis, disconnectRedis } from './lib/redis.js';
import { flushAllPending } from './yjs/persistence.js';

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(express.json());

// Clerk authentication (optional - works without in dev mode)
if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
  app.use(syncUser);
  console.log('[Auth] Clerk middleware enabled');
} else {
  console.warn('[Auth] CLERK_SECRET_KEY not set - auth disabled');
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/maps', mapsRouter);
app.use('/api/maps', nodesRouter);
app.use('/api', sharesRouter);
app.use('/api', commentsRouter);
app.use('/api', historyRouter);
app.use('/api', templatesRouter);
app.use('/api', foldersRouter);
app.use('/api/search', searchRouter);
app.use('/api/maps', exportRouter);
app.use('/api/maps', importRouter);

// Error handler
app.use(errorHandler);

// Setup WebSocket server for Yjs
const wss = new WebSocketServer({ server, path: '/yjs' });
setupYjsServer(wss);

// Start server
const PORT = process.env.API_PORT || 3001;

async function start() {
  // Connect to Redis (optional - app works without it in dev)
  await connectRedis();

  server.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server running on ws://localhost:${PORT}/yjs`);
  });
}

start().catch(console.error);

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down gracefully...');

  // Flush any pending Yjs document changes
  await flushAllPending();

  // Close server
  server.close(() => {
    console.log('Server closed');
  });

  // Disconnect Redis
  await disconnectRedis();

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
