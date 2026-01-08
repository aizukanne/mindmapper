
🔧 Tool: Task
Input: {
  "description": "Explore codebase structure",
  "prompt": "I need to implement a \"shareable links\" feature that generates unique shareable URLs with optional password protection and expiration, plus a public access endpoint with validation.\n\nPlease explore the codebase thoroughly to understand:\n1. The overall project structure (what framework is used - Express, Next.js, etc.)\n2. How the database is set up (what ORM, existing models/schemas)\n3. Existing authentication patterns\n4. API route patterns and conventions\n5. Any existing sharing or link-related functionality\n\nProvide a detailed summary of what you find, including file paths and patterns I should follow.",
  "subagent_type": "Explore"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper -type f -name \"package.json\" | head -20",
  "description": "Find package.json files to understand project structure"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/package.json"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/",
  "description": "List main project directory structure"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/",
  "description": "List apps directory structure"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/package.json"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/db/prisma/schema.prisma"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/api/src/",
  "description": "List API source directory structure"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/index.ts"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/api/src/routes/",
  "description": "List API routes directory"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/routes/shares.ts"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/api/src/middleware/",
  "description": "List middleware directory"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/middleware/auth.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/middleware/errorHandler.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/middleware/validate.ts"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/api/src/lib/",
  "description": "List lib directory structure"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/api/src/lib/validation/",
  "description": "List validation directory"
}

🔧 Tool: Grep
Input: {
  "pattern": "TreeInvitation|inviteCode",
  "path": "/projects/mindmapper/apps/api/src/routes/familyTrees.ts",
  "output_mode": "content",
  "head_limit": 50
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/lib/validation/schemas.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/package.json"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/types/src/index.ts",
  "limit": 100
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/routes/maps.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/middleware/permissionCheck.ts",
  "limit": 150
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/middleware/permissionCheck.ts",
  "offset": 150
}

🔧 Tool: Bash
Input: {
  "command": "grep -n \"accept.*invite\\|inviteCode\" /projects/mindmapper/apps/api/src/routes/familyTrees.ts | head -40",
  "description": "Find invite code acceptance patterns in family trees"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/",
  "description": "List web source directory structure"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/App.tsx"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/pages/",
  "description": "List web pages directory"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/AcceptInvitation.tsx",
  "limit": 80
}
Now I have a comprehensive understanding of the codebase. Let me read the key files I need to understand the existing patterns more closely before implementing the feature.

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/db/prisma/schema.prisma"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/routes/shares.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/lib/validation/schemas.ts"
}
Now let me also check the frontend structure and routing to understand how to add the public share view:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/App.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/index.ts"
}
Now I have a good understanding of the codebase. Let me create a todo list and start implementing the shareable links feature:

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Update Prisma schema to add ShareableLink model with unique token, password, expiration, and access count fields",
      "status": "in_progress",
      "activeForm": "Updating Prisma schema for ShareableLink model"
    },
    {
      "content": "Run Prisma migration to apply schema changes",
      "status": "pending",
      "activeForm": "Running Prisma migration"
    },
    {
      "content": "Add shareable link API endpoints (create, get, verify password, public access)",
      "status": "pending",
      "activeForm": "Adding shareable link API endpoints"
    },
    {
      "content": "Create public share view page on frontend",
      "status": "pending",
      "activeForm": "Creating public share view page"
    },
    {
      "content": "Add route for public share access in frontend routing",
      "status": "pending",
      "activeForm": "Adding frontend routing for public share"
    },
    {
      "content": "Verify implementation with Playwright test",
      "status": "pending",
      "activeForm": "Verifying implementation with Playwright test"
    }
  ]
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/db/prisma/schema.prisma",
  "offset": 180,
  "limit": 50
}
I see that the Share model already exists. I'll extend it to support shareable links with access tracking. Let me update the schema:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/packages/db/prisma/schema.prisma",
  "old_string": "model Share {\n  id         String     @id @default(cuid())\n  mindMapId  String\n  userId     String?\n  shareToken String?    @unique\n  permission Permission @default(VIEWER)\n  password   String?\n  expiresAt  DateTime?\n  createdAt  DateTime   @default(now())\n  updatedAt  DateTime   @updatedAt\n\n  // Relations\n  mindMap MindMap @relation(fields: [mindMapId], references: [id], onDelete: Cascade)\n\n  @@index([mindMapId])\n  @@index([userId])\n  @@index([shareToken])\n}",
  "new_string": "model Share {\n  id         String     @id @default(cuid())\n  mindMapId  String\n  userId     String?\n  shareToken String?    @unique\n  permission Permission @default(VIEWER)\n  password   String?\n  expiresAt  DateTime?\n  createdAt  DateTime   @default(now())\n  updatedAt  DateTime   @updatedAt\n\n  // Relations\n  mindMap MindMap @relation(fields: [mindMapId], references: [id], onDelete: Cascade)\n\n  @@index([mindMapId])\n  @@index([userId])\n  @@index([shareToken])\n}\n\n// Shareable Links - public URL sharing with optional password and expiration\nmodel ShareableLink {\n  id          String     @id @default(cuid())\n  mindMapId   String\n  token       String     @unique @default(cuid()) // Unique token for the shareable URL\n  title       String?    // Optional custom title for the link\n  permission  Permission @default(VIEWER)\n  password    String?    // Optional password protection (hashed)\n  expiresAt   DateTime?  // Optional expiration date\n  maxAccess   Int?       // Optional maximum access count\n  accessCount Int        @default(0) // Number of times the link has been accessed\n  isActive    Boolean    @default(true) // Whether the link is currently active\n  createdBy   String     // User who created the link\n  createdAt   DateTime   @default(now())\n  updatedAt   DateTime   @updatedAt\n\n  // Relations\n  mindMap MindMap @relation(fields: [mindMapId], references: [id], onDelete: Cascade)\n\n  @@index([mindMapId])\n  @@index([token])\n  @@index([createdBy])\n  @@index([isActive])\n}"
}
Now I need to update the MindMap model to include the shareableLinks relation:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/db/prisma/schema.prisma",
  "offset": 75,
  "limit": 40
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/packages/db/prisma/schema.prisma",
  "old_string": "  // Relations\n  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)\n  folder      Folder?      @relation(fields: [folderId], references: [id], onDelete: SetNull)\n  nodes       Node[]\n  connections Connection[]\n  events      MapEvent[]\n  shares      Share[]\n  comments    Comment[]\n\n  @@index([userId])",
  "new_string": "  // Relations\n  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)\n  folder         Folder?         @relation(fields: [folderId], references: [id], onDelete: SetNull)\n  nodes          Node[]\n  connections    Connection[]\n  events         MapEvent[]\n  shares         Share[]\n  comments       Comment[]\n  shareableLinks ShareableLink[]\n\n  @@index([userId])"
}
Now let's run the Prisma migration:

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Update Prisma schema to add ShareableLink model with unique token, password, expiration, and access count fields",
      "status": "completed",
      "activeForm": "Updating Prisma schema for ShareableLink model"
    },
    {
      "content": "Run Prisma migration to apply schema changes",
      "status": "in_progress",
      "activeForm": "Running Prisma migration"
    },
    {
      "content": "Add shareable link API endpoints (create, get, verify password, public access)",
      "status": "pending",
      "activeForm": "Adding shareable link API endpoints"
    },
    {
      "content": "Create public share view page on frontend",
      "status": "pending",
      "activeForm": "Creating public share view page"
    },
    {
      "content": "Add route for public share access in frontend routing",
      "status": "pending",
      "activeForm": "Adding frontend routing for public share"
    },
    {
      "content": "Verify implementation with Playwright test",
      "status": "pending",
      "activeForm": "Verifying implementation with Playwright test"
    }
  ]
}

🔧 Tool: Bash
Input: {
  "command": "npx prisma migrate dev --name add_shareable_links 2>&1",
  "description": "Run Prisma migration for ShareableLink model",
  "timeout": 120000
}

🔧 Tool: Bash
Input: {
  "command": "pnpm --filter @mindmapper/db prisma migrate dev --name add_shareable_links 2>&1",
  "description": "Run Prisma migration from project root",
  "timeout": 120000
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/db/package.json"
}

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/packages/db && pnpm db:migrate --name add_shareable_links 2>&1",
  "description": "Run Prisma migration from packages/db directory",
  "timeout": 120000
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/.env"
}

🔧 Tool: Bash
Input: {
  "command": "source .env && cd packages/db && DATABASE_URL=\"postgresql://mindmapper:mindmapper_dev@localhost:5432/mindmapper\" pnpm db:migrate --name add_shareable_links 2>&1",
  "description": "Run Prisma migration with DATABASE_URL set",
  "timeout": 120000
}
The database is not running. Let me use `prisma db push` which allows us to work without a running database for development purposes, or generate the client:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/packages/db && DATABASE_URL=\"postgresql://mindmapper:mindmapper_dev@localhost:5432/mindmapper\" pnpm db:generate 2>&1",
  "description": "Generate Prisma client",
  "timeout": 120000
}
Good, the Prisma client is generated. Now let's create a SQL migration file manually since we can't connect to the database right now:

🔧 Tool: Bash
Input: {
  "command": "mkdir -p /projects/mindmapper/packages/db/prisma/migrations/20250107000001_add_shareable_links",
  "description": "Create migration directory"
}

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/packages/db/prisma/migrations/20250107000001_add_shareable_links/migration.sql",
  "content": "-- CreateTable\nCREATE TABLE \"ShareableLink\" (\n    \"id\" TEXT NOT NULL,\n    \"mindMapId\" TEXT NOT NULL,\n    \"token\" TEXT NOT NULL,\n    \"title\" TEXT,\n    \"permission\" \"Permission\" NOT NULL DEFAULT 'VIEWER',\n    \"password\" TEXT,\n    \"expiresAt\" TIMESTAMP(3),\n    \"maxAccess\" INTEGER,\n    \"accessCount\" INTEGER NOT NULL DEFAULT 0,\n    \"isActive\" BOOLEAN NOT NULL DEFAULT true,\n    \"createdBy\" TEXT NOT NULL,\n    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    \"updatedAt\" TIMESTAMP(3) NOT NULL,\n\n    CONSTRAINT \"ShareableLink_pkey\" PRIMARY KEY (\"id\")\n);\n\n-- CreateIndex\nCREATE UNIQUE INDEX \"ShareableLink_token_key\" ON \"ShareableLink\"(\"token\");\n\n-- CreateIndex\nCREATE INDEX \"ShareableLink_mindMapId_idx\" ON \"ShareableLink\"(\"mindMapId\");\n\n-- CreateIndex\nCREATE INDEX \"ShareableLink_token_idx\" ON \"ShareableLink\"(\"token\");\n\n-- CreateIndex\nCREATE INDEX \"ShareableLink_createdBy_idx\" ON \"ShareableLink\"(\"createdBy\");\n\n-- CreateIndex\nCREATE INDEX \"ShareableLink_isActive_idx\" ON \"ShareableLink\"(\"isActive\");\n\n-- AddForeignKey\nALTER TABLE \"ShareableLink\" ADD CONSTRAINT \"ShareableLink_mindMapId_fkey\" FOREIGN KEY (\"mindMapId\") REFERENCES \"MindMap\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE;\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Update Prisma schema to add ShareableLink model with unique token, password, expiration, and access count fields",
      "status": "completed",
      "activeForm": "Updating Prisma schema for ShareableLink model"
    },
    {
      "content": "Run Prisma migration to apply schema changes",
      "status": "completed",
      "activeForm": "Running Prisma migration"
    },
    {
      "content": "Add shareable link API endpoints (create, get, verify password, public access)",
      "status": "in_progress",
      "activeForm": "Adding shareable link API endpoints"
    },
    {
      "content": "Create public share view page on frontend",
      "status": "pending",
      "activeForm": "Creating public share view page"
    },
    {
      "content": "Add route for public share access in frontend routing",
      "status": "pending",
      "activeForm": "Adding frontend routing for public share"
    },
    {
      "content": "Verify implementation with Playwright test",
      "status": "pending",
      "activeForm": "Verifying implementation with Playwright test"
    }
  ]
}
Now let's create the shareable links API router. First, let me check the error handler to understand the error patterns:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/middleware/errorHandler.ts"
}
Now let me check the validate middleware:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/middleware/validate.ts"
}
Now let me create the shareable links router:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/routes/shareableLinks.ts",
  "content": "import { Router, type Request } from 'express';\nimport { z } from 'zod';\nimport { randomBytes, createHash } from 'crypto';\nimport { prisma } from '../lib/prisma.js';\nimport { Errors, asyncHandler } from '../middleware/errorHandler.js';\nimport { validate, validateParams, type ValidatedRequest } from '../middleware/validate.js';\nimport { cuidSchema } from '../lib/validation/schemas.js';\n\nexport const shareableLinksRouter = Router();\n\n// Fallback user ID for development when auth is disabled\nconst DEV_USER_ID = 'dev-user-id';\n\n// Helper to get user ID from request (with fallback for dev)\nfunction getUserId(req: Request): string {\n  return req.userId || DEV_USER_ID;\n}\n\n// Permission levels for validation\nconst VALID_PERMISSIONS = ['VIEWER', 'COMMENTER', 'EDITOR'] as const;\ntype LinkPermission = (typeof VALID_PERMISSIONS)[number];\n\n// Simple password hashing (in production, use bcrypt)\nfunction hashPassword(password: string): string {\n  return createHash('sha256').update(password).digest('hex');\n}\n\nfunction verifyPassword(password: string, hashedPassword: string): boolean {\n  return hashPassword(password) === hashedPassword;\n}\n\n// Generate a unique token for the shareable link\nfunction generateToken(): string {\n  return randomBytes(16).toString('hex');\n}\n\n// Validation schemas\nconst createShareableLinkSchema = z.object({\n  mindMapId: cuidSchema,\n  title: z.string().max(255).optional(),\n  permission: z.enum(VALID_PERMISSIONS).default('VIEWER'),\n  password: z.string().min(4).max(50).optional(),\n  expiresAt: z\n    .string()\n    .datetime()\n    .optional()\n    .refine((val) => !val || new Date(val) > new Date(), {\n      message: 'Expiration date must be in the future',\n    }),\n  maxAccess: z.number().int().positive().optional(),\n});\n\nconst updateShareableLinkSchema = z.object({\n  title: z.string().max(255).optional().nullable(),\n  permission: z.enum(VALID_PERMISSIONS).optional(),\n  password: z.string().min(4).max(50).optional().nullable(),\n  expiresAt: z\n    .string()\n    .datetime()\n    .optional()\n    .nullable()\n    .refine((val) => val === null || !val || new Date(val) > new Date(), {\n      message: 'Expiration date must be in the future',\n    }),\n  maxAccess: z.number().int().positive().optional().nullable(),\n  isActive: z.boolean().optional(),\n});\n\nconst linkIdParamsSchema = z.object({\n  linkId: cuidSchema,\n});\n\nconst tokenParamsSchema = z.object({\n  token: z.string().min(1),\n});\n\nconst verifyPasswordSchema = z.object({\n  password: z.string().min(1, 'Password is required'),\n});\n\n// Helper to verify map ownership\nasync function verifyMapOwnership(\n  mapId: string,\n  userId: string\n): Promise<{ id: string; userId: string; title: string }> {\n  const map = await prisma.mindMap.findFirst({\n    where: { id: mapId, userId },\n    select: { id: true, userId: true, title: true },\n  });\n\n  if (!map) {\n    throw Errors.notFound('Mind map');\n  }\n\n  return map;\n}\n\n// Helper to verify link ownership\nasync function verifyLinkOwnership(linkId: string, userId: string) {\n  const link = await prisma.shareableLink.findFirst({\n    where: { id: linkId, createdBy: userId },\n  });\n\n  if (!link) {\n    throw Errors.notFound('Shareable link');\n  }\n\n  return link;\n}\n\n// ==========================================\n// Authenticated Routes (require user auth)\n// ==========================================\n\n// POST /api/shareable-links - Create a new shareable link\nshareableLinksRouter.post(\n  '/',\n  validate({\n    body: createShareableLinkSchema,\n  }),\n  asyncHandler(async (req, res) => {\n    const data = (req as ValidatedRequest).validatedBody as z.infer<typeof createShareableLinkSchema>;\n    const userId = getUserId(req);\n\n    // Verify user owns the map\n    await verifyMapOwnership(data.mindMapId, userId);\n\n    // Generate unique token\n    const token = generateToken();\n\n    // Hash password if provided\n    const hashedPassword = data.password ? hashPassword(data.password) : null;\n\n    const shareableLink = await prisma.shareableLink.create({\n      data: {\n        mindMapId: data.mindMapId,\n        token,\n        title: data.title,\n        permission: data.permission,\n        password: hashedPassword,\n        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,\n        maxAccess: data.maxAccess,\n        createdBy: userId,\n      },\n    });\n\n    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${shareableLink.token}`;\n\n    res.status(201).json({\n      success: true,\n      data: {\n        id: shareableLink.id,\n        token: shareableLink.token,\n        shareUrl,\n        title: shareableLink.title,\n        permission: shareableLink.permission,\n        hasPassword: !!shareableLink.password,\n        expiresAt: shareableLink.expiresAt,\n        maxAccess: shareableLink.maxAccess,\n        accessCount: shareableLink.accessCount,\n        isActive: shareableLink.isActive,\n        createdAt: shareableLink.createdAt,\n      },\n    });\n  })\n);\n\n// GET /api/shareable-links/map/:mapId - List all shareable links for a map\nshareableLinksRouter.get(\n  '/map/:mapId',\n  validateParams(z.object({ mapId: cuidSchema })),\n  asyncHandler(async (req, res) => {\n    const { mapId } = (req as ValidatedRequest).validatedParams as { mapId: string };\n    const userId = getUserId(req);\n\n    // Verify user owns the map\n    await verifyMapOwnership(mapId, userId);\n\n    const links = await prisma.shareableLink.findMany({\n      where: { mindMapId: mapId },\n      orderBy: { createdAt: 'desc' },\n    });\n\n    res.json({\n      success: true,\n      data: links.map((link) => ({\n        id: link.id,\n        token: link.token,\n        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${link.token}`,\n        title: link.title,\n        permission: link.permission,\n        hasPassword: !!link.password,\n        expiresAt: link.expiresAt,\n        maxAccess: link.maxAccess,\n        accessCount: link.accessCount,\n        isActive: link.isActive,\n        createdAt: link.createdAt,\n        updatedAt: link.updatedAt,\n      })),\n    });\n  })\n);\n\n// GET /api/shareable-links/:linkId - Get a specific shareable link (owner only)\nshareableLinksRouter.get(\n  '/:linkId',\n  validateParams(linkIdParamsSchema),\n  asyncHandler(async (req, res) => {\n    const { linkId } = (req as ValidatedRequest).validatedParams as { linkId: string };\n    const userId = getUserId(req);\n\n    const link = await verifyLinkOwnership(linkId, userId);\n\n    res.json({\n      success: true,\n      data: {\n        id: link.id,\n        token: link.token,\n        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${link.token}`,\n        title: link.title,\n        permission: link.permission,\n        hasPassword: !!link.password,\n        expiresAt: link.expiresAt,\n        maxAccess: link.maxAccess,\n        accessCount: link.accessCount,\n        isActive: link.isActive,\n        createdAt: link.createdAt,\n        updatedAt: link.updatedAt,\n      },\n    });\n  })\n);\n\n// PATCH /api/shareable-links/:linkId - Update a shareable link\nshareableLinksRouter.patch(\n  '/:linkId',\n  validate({\n    params: linkIdParamsSchema,\n    body: updateShareableLinkSchema,\n  }),\n  asyncHandler(async (req, res) => {\n    const { linkId } = (req as ValidatedRequest).validatedParams as { linkId: string };\n    const data = (req as ValidatedRequest).validatedBody as z.infer<typeof updateShareableLinkSchema>;\n    const userId = getUserId(req);\n\n    // Verify user owns the link\n    await verifyLinkOwnership(linkId, userId);\n\n    // Build update data\n    const updateData: {\n      title?: string | null;\n      permission?: LinkPermission;\n      password?: string | null;\n      expiresAt?: Date | null;\n      maxAccess?: number | null;\n      isActive?: boolean;\n    } = {};\n\n    if (data.title !== undefined) {\n      updateData.title = data.title;\n    }\n\n    if (data.permission !== undefined) {\n      updateData.permission = data.permission;\n    }\n\n    if (data.password !== undefined) {\n      updateData.password = data.password ? hashPassword(data.password) : null;\n    }\n\n    if (data.expiresAt !== undefined) {\n      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;\n    }\n\n    if (data.maxAccess !== undefined) {\n      updateData.maxAccess = data.maxAccess;\n    }\n\n    if (data.isActive !== undefined) {\n      updateData.isActive = data.isActive;\n    }\n\n    if (Object.keys(updateData).length === 0) {\n      throw Errors.badRequest('No valid fields provided for update');\n    }\n\n    const updatedLink = await prisma.shareableLink.update({\n      where: { id: linkId },\n      data: updateData,\n    });\n\n    res.json({\n      success: true,\n      data: {\n        id: updatedLink.id,\n        token: updatedLink.token,\n        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${updatedLink.token}`,\n        title: updatedLink.title,\n        permission: updatedLink.permission,\n        hasPassword: !!updatedLink.password,\n        expiresAt: updatedLink.expiresAt,\n        maxAccess: updatedLink.maxAccess,\n        accessCount: updatedLink.accessCount,\n        isActive: updatedLink.isActive,\n        createdAt: updatedLink.createdAt,\n        updatedAt: updatedLink.updatedAt,\n      },\n    });\n  })\n);\n\n// DELETE /api/shareable-links/:linkId - Delete a shareable link\nshareableLinksRouter.delete(\n  '/:linkId',\n  validateParams(linkIdParamsSchema),\n  asyncHandler(async (req, res) => {\n    const { linkId } = (req as ValidatedRequest).validatedParams as { linkId: string };\n    const userId = getUserId(req);\n\n    // Verify user owns the link\n    await verifyLinkOwnership(linkId, userId);\n\n    await prisma.shareableLink.delete({\n      where: { id: linkId },\n    });\n\n    res.json({\n      success: true,\n      message: 'Shareable link deleted successfully',\n    });\n  })\n);\n\n// ==========================================\n// Public Routes (no authentication required)\n// ==========================================\n\n// GET /api/public/share/:token - Get shared map info (public, no auth)\nshareableLinksRouter.get(\n  '/public/:token',\n  validateParams(tokenParamsSchema),\n  asyncHandler(async (req, res) => {\n    const { token } = (req as ValidatedRequest).validatedParams as { token: string };\n\n    const link = await prisma.shareableLink.findFirst({\n      where: {\n        token,\n        isActive: true,\n        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],\n      },\n      include: {\n        mindMap: {\n          select: {\n            id: true,\n            title: true,\n            description: true,\n            thumbnail: true,\n          },\n        },\n      },\n    });\n\n    if (!link) {\n      throw Errors.notFound('Share link not found, expired, or inactive');\n    }\n\n    // Check if max access count exceeded\n    if (link.maxAccess !== null && link.accessCount >= link.maxAccess) {\n      throw Errors.forbidden('This share link has reached its maximum access limit');\n    }\n\n    // Return info - password check happens in separate verify endpoint\n    res.json({\n      success: true,\n      data: {\n        id: link.id,\n        title: link.title || link.mindMap.title,\n        mapTitle: link.mindMap.title,\n        mapDescription: link.mindMap.description,\n        mapThumbnail: link.mindMap.thumbnail,\n        permission: link.permission,\n        requiresPassword: !!link.password,\n        expiresAt: link.expiresAt,\n      },\n    });\n  })\n);\n\n// POST /api/public/share/:token/verify - Verify password and get access token\nshareableLinksRouter.post(\n  '/public/:token/verify',\n  validate({\n    params: tokenParamsSchema,\n    body: verifyPasswordSchema,\n  }),\n  asyncHandler(async (req, res) => {\n    const { token } = (req as ValidatedRequest).validatedParams as { token: string };\n    const { password } = (req as ValidatedRequest).validatedBody as z.infer<typeof verifyPasswordSchema>;\n\n    const link = await prisma.shareableLink.findFirst({\n      where: {\n        token,\n        isActive: true,\n        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],\n      },\n    });\n\n    if (!link) {\n      throw Errors.notFound('Share link not found, expired, or inactive');\n    }\n\n    if (!link.password) {\n      // No password required\n      res.json({\n        success: true,\n        message: 'No password required',\n        verified: true,\n      });\n      return;\n    }\n\n    if (!verifyPassword(password, link.password)) {\n      throw Errors.unauthorized('Invalid password');\n    }\n\n    res.json({\n      success: true,\n      message: 'Password verified',\n      verified: true,\n    });\n  })\n);\n\n// GET /api/public/share/:token/content - Get the shared map content\nshareableLinksRouter.get(\n  '/public/:token/content',\n  validateParams(tokenParamsSchema),\n  asyncHandler(async (req, res) => {\n    const { token } = (req as ValidatedRequest).validatedParams as { token: string };\n    const providedPassword = req.headers['x-share-password'] as string | undefined;\n\n    const link = await prisma.shareableLink.findFirst({\n      where: {\n        token,\n        isActive: true,\n        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],\n      },\n      include: {\n        mindMap: {\n          include: {\n            nodes: { orderBy: { sortOrder: 'asc' } },\n            connections: true,\n          },\n        },\n      },\n    });\n\n    if (!link) {\n      throw Errors.notFound('Share link not found, expired, or inactive');\n    }\n\n    // Check if max access count exceeded\n    if (link.maxAccess !== null && link.accessCount >= link.maxAccess) {\n      throw Errors.forbidden('This share link has reached its maximum access limit');\n    }\n\n    // Check password if required\n    if (link.password) {\n      if (!providedPassword) {\n        res.status(401).json({\n          success: false,\n          error: 'Password required',\n          requiresPassword: true,\n        });\n        return;\n      }\n\n      if (!verifyPassword(providedPassword, link.password)) {\n        throw Errors.unauthorized('Invalid password');\n      }\n    }\n\n    // Increment access count\n    await prisma.shareableLink.update({\n      where: { id: link.id },\n      data: { accessCount: { increment: 1 } },\n    });\n\n    res.json({\n      success: true,\n      data: {\n        permission: link.permission,\n        title: link.title || link.mindMap.title,\n        mindMap: {\n          id: link.mindMap.id,\n          title: link.mindMap.title,\n          description: link.mindMap.description,\n          nodes: link.mindMap.nodes,\n          connections: link.mindMap.connections,\n        },\n      },\n    });\n  })\n);\n"
}
Now I need to register the router in the main API index:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/index.ts",
  "old_string": "import { familyTreesRouter } from './routes/familyTrees.js';\nimport { peopleRouter } from './routes/people.js';\nimport { relationshipsRouter } from './routes/relationships.js';\nimport { storageRouter } from './routes/storage.js';\nimport { photosRouter } from './routes/photos.js';\nimport { setupYjsServer } from './yjs/server.js';",
  "new_string": "import { familyTreesRouter } from './routes/familyTrees.js';\nimport { peopleRouter } from './routes/people.js';\nimport { relationshipsRouter } from './routes/relationships.js';\nimport { storageRouter } from './routes/storage.js';\nimport { photosRouter } from './routes/photos.js';\nimport { shareableLinksRouter } from './routes/shareableLinks.js';\nimport { setupYjsServer } from './yjs/server.js';"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/index.ts"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/index.ts",
  "old_string": "import { storageRouter } from './routes/storage.js';\nimport { photosRouter } from './routes/photos.js';\nimport { usersRouter } from './routes/users.js';\nimport { setupYjsServer } from './yjs/server.js';",
  "new_string": "import { storageRouter } from './routes/storage.js';\nimport { photosRouter } from './routes/photos.js';\nimport { usersRouter } from './routes/users.js';\nimport { shareableLinksRouter } from './routes/shareableLinks.js';\nimport { setupYjsServer } from './yjs/server.js';"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/index.ts",
  "old_string": "app.use('/api/photos', photosRouter);\napp.use('/api/users', usersRouter);\n\n// 404 handler for unmatched routes (must be before error handler)",
  "new_string": "app.use('/api/photos', photosRouter);\napp.use('/api/users', usersRouter);\napp.use('/api/shareable-links', shareableLinksRouter);\n\n// 404 handler for unmatched routes (must be before error handler)"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Update Prisma schema to add ShareableLink model with unique token, password, expiration, and access count fields",
      "status": "completed",
      "activeForm": "Updating Prisma schema for ShareableLink model"
    },
    {
      "content": "Run Prisma migration to apply schema changes",
      "status": "completed",
      "activeForm": "Running Prisma migration"
    },
    {
      "content": "Add shareable link API endpoints (create, get, verify password, public access)",
      "status": "completed",
      "activeForm": "Adding shareable link API endpoints"
    },
    {
      "content": "Create public share view page on frontend",
      "status": "in_progress",
      "activeForm": "Creating public share view page"
    },
    {
      "content": "Add route for public share access in frontend routing",
      "status": "pending",
      "activeForm": "Adding frontend routing for public share"
    },
    {
      "content": "Verify implementation with Playwright test",
      "status": "pending",
      "activeForm": "Verifying implementation with Playwright test"
    }
  ]
}
Now let's create the public share view page on the frontend. First, let me check an existing page to understand the pattern:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/AcceptInvitation.tsx"
}
Now let me check the MapEditor to see how the mind map is rendered:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/MapEditor.tsx",
  "limit": 100
}
Let me look at the Canvas component to understand how to render a read-only view:

🔧 Tool: Glob
Input: {
  "pattern": "**/Canvas.tsx",
  "path": "/projects/mindmapper/apps/web/src"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/Canvas.tsx",
  "limit": 60
}
Now let me create a simplified public share view page:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/PublicShareView.tsx",
  "content": "import { useState, useEffect, useCallback } from 'react';\nimport { useParams } from 'react-router-dom';\nimport {\n  ReactFlow,\n  Background,\n  MiniMap,\n  Controls,\n  type Node,\n  type Edge,\n  BackgroundVariant,\n  ReactFlowProvider,\n} from '@xyflow/react';\nimport '@xyflow/react/dist/style.css';\nimport { Loader2, Lock, Eye, XCircle, Share2 } from 'lucide-react';\nimport { Button } from '@/components/ui/button';\nimport { Input } from '@/components/ui/input';\nimport { MindMapNode } from '@/components/canvas/MindMapNode';\n\nconst API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';\n\ninterface ShareInfo {\n  id: string;\n  title: string;\n  mapTitle: string;\n  mapDescription: string | null;\n  mapThumbnail: string | null;\n  permission: 'VIEWER' | 'COMMENTER' | 'EDITOR';\n  requiresPassword: boolean;\n  expiresAt: string | null;\n}\n\ninterface MindMapData {\n  id: string;\n  title: string;\n  description: string | null;\n  nodes: Array<{\n    id: string;\n    text: string;\n    positionX: number;\n    positionY: number;\n    width: number;\n    height: number;\n    style: Record<string, unknown>;\n    parentId: string | null;\n    type: string;\n  }>;\n  connections: Array<{\n    id: string;\n    sourceNodeId: string;\n    targetNodeId: string;\n    label: string | null;\n    style: Record<string, unknown>;\n  }>;\n}\n\ninterface ContentResponse {\n  permission: string;\n  title: string;\n  mindMap: MindMapData;\n}\n\nconst nodeTypes = { mindmap: MindMapNode };\n\nfunction PublicShareViewContent() {\n  const { token } = useParams<{ token: string }>();\n\n  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);\n  const [content, setContent] = useState<ContentResponse | null>(null);\n  const [password, setPassword] = useState('');\n  const [loading, setLoading] = useState(true);\n  const [verifying, setVerifying] = useState(false);\n  const [error, setError] = useState<string | null>(null);\n  const [passwordError, setPasswordError] = useState<string | null>(null);\n  const [isPasswordVerified, setIsPasswordVerified] = useState(false);\n\n  // Fetch share info on mount\n  useEffect(() => {\n    if (token) {\n      fetchShareInfo();\n    }\n  }, [token]);\n\n  const fetchShareInfo = async () => {\n    try {\n      const response = await fetch(`${API_URL}/api/shareable-links/public/${token}`);\n\n      if (response.ok) {\n        const data = await response.json();\n        setShareInfo(data.data);\n\n        // If no password required, fetch content immediately\n        if (!data.data.requiresPassword) {\n          setIsPasswordVerified(true);\n          await fetchContent();\n        }\n      } else {\n        const errorData = await response.json();\n        setError(errorData.error?.message || 'Failed to load shared content');\n      }\n    } catch (err) {\n      console.error('Failed to fetch share info:', err);\n      setError('Failed to load shared content');\n    } finally {\n      setLoading(false);\n    }\n  };\n\n  const fetchContent = async (providedPassword?: string) => {\n    try {\n      const headers: Record<string, string> = {};\n      if (providedPassword) {\n        headers['x-share-password'] = providedPassword;\n      }\n\n      const response = await fetch(`${API_URL}/api/shareable-links/public/${token}/content`, {\n        headers,\n      });\n\n      if (response.ok) {\n        const data = await response.json();\n        setContent(data.data);\n        setIsPasswordVerified(true);\n        setPasswordError(null);\n        return true;\n      } else {\n        const errorData = await response.json();\n        if (errorData.requiresPassword) {\n          // Password needed but not provided or invalid\n          setPasswordError('Password is required');\n        } else if (response.status === 401) {\n          setPasswordError('Invalid password');\n        } else {\n          setError(errorData.error?.message || 'Failed to load content');\n        }\n        return false;\n      }\n    } catch (err) {\n      console.error('Failed to fetch content:', err);\n      setError('Failed to load content');\n      return false;\n    }\n  };\n\n  const handlePasswordSubmit = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!password.trim()) {\n      setPasswordError('Please enter a password');\n      return;\n    }\n\n    setVerifying(true);\n    setPasswordError(null);\n\n    const success = await fetchContent(password);\n    if (!success) {\n      setVerifying(false);\n    }\n  };\n\n  // Convert API data to ReactFlow format\n  const { nodes, edges } = useCallback(() => {\n    if (!content?.mindMap) {\n      return { nodes: [], edges: [] };\n    }\n\n    const flowNodes: Node[] = content.mindMap.nodes.map((node) => ({\n      id: node.id,\n      type: 'mindmap',\n      position: { x: node.positionX, y: node.positionY },\n      data: {\n        label: node.text,\n        style: node.style,\n        width: node.width,\n        height: node.height,\n        nodeType: node.type,\n        parentId: node.parentId,\n      },\n    }));\n\n    const flowEdges: Edge[] = content.mindMap.connections.map((conn) => ({\n      id: conn.id,\n      source: conn.sourceNodeId,\n      target: conn.targetNodeId,\n      label: conn.label || undefined,\n      type: 'smoothstep',\n      style: { stroke: '#94a3b8' },\n    }));\n\n    return { nodes: flowNodes, edges: flowEdges };\n  }, [content])();\n\n  // Loading state\n  if (loading) {\n    return (\n      <div className=\"h-screen w-screen flex items-center justify-center bg-gray-50\">\n        <div className=\"flex flex-col items-center gap-4\">\n          <Loader2 className=\"w-12 h-12 animate-spin text-blue-600\" />\n          <p className=\"text-gray-600\">Loading shared mind map...</p>\n        </div>\n      </div>\n    );\n  }\n\n  // Error state\n  if (error) {\n    return (\n      <div className=\"h-screen w-screen flex items-center justify-center bg-gray-50\">\n        <div className=\"bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4\">\n          <div className=\"flex flex-col items-center text-center\">\n            <div className=\"w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4\">\n              <XCircle className=\"w-10 h-10 text-red-600\" />\n            </div>\n            <h1 className=\"text-2xl font-bold text-gray-900 mb-2\">Share Link Invalid</h1>\n            <p className=\"text-gray-600 mb-6\">{error}</p>\n            <p className=\"text-sm text-gray-500\">\n              This link may have expired, been revoked, or reached its access limit.\n            </p>\n          </div>\n        </div>\n      </div>\n    );\n  }\n\n  // Password entry state\n  if (shareInfo?.requiresPassword && !isPasswordVerified) {\n    return (\n      <div className=\"h-screen w-screen flex items-center justify-center bg-gray-50\">\n        <div className=\"bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4\">\n          <div className=\"flex flex-col items-center text-center mb-6\">\n            <div className=\"w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4\">\n              <Lock className=\"w-10 h-10 text-blue-600\" />\n            </div>\n            <h1 className=\"text-2xl font-bold text-gray-900 mb-2\">Password Protected</h1>\n            <p className=\"text-gray-600\">\n              This mind map is password protected. Please enter the password to view it.\n            </p>\n          </div>\n\n          <div className=\"bg-gray-50 rounded-lg p-4 mb-6\">\n            <h2 className=\"font-semibold text-gray-900 mb-1\">{shareInfo.title || shareInfo.mapTitle}</h2>\n            {shareInfo.mapDescription && (\n              <p className=\"text-sm text-gray-600\">{shareInfo.mapDescription}</p>\n            )}\n          </div>\n\n          <form onSubmit={handlePasswordSubmit} className=\"space-y-4\">\n            <div>\n              <Input\n                type=\"password\"\n                placeholder=\"Enter password\"\n                value={password}\n                onChange={(e) => setPassword(e.target.value)}\n                className={passwordError ? 'border-red-500' : ''}\n                autoFocus\n              />\n              {passwordError && (\n                <p className=\"text-sm text-red-500 mt-1\">{passwordError}</p>\n              )}\n            </div>\n            <Button type=\"submit\" className=\"w-full\" disabled={verifying}>\n              {verifying ? (\n                <>\n                  <Loader2 className=\"w-4 h-4 animate-spin mr-2\" />\n                  Verifying...\n                </>\n              ) : (\n                <>\n                  <Eye className=\"w-4 h-4 mr-2\" />\n                  View Mind Map\n                </>\n              )}\n            </Button>\n          </form>\n        </div>\n      </div>\n    );\n  }\n\n  // Main content view\n  return (\n    <div className=\"h-screen w-screen flex flex-col bg-gray-100\">\n      {/* Header */}\n      <div className=\"bg-white border-b px-4 py-3 flex items-center justify-between shrink-0\">\n        <div className=\"flex items-center gap-3\">\n          <Share2 className=\"w-6 h-6 text-blue-600\" />\n          <div>\n            <h1 className=\"font-semibold text-gray-900\">\n              {content?.title || shareInfo?.mapTitle || 'Shared Mind Map'}\n            </h1>\n            {content?.mindMap?.description && (\n              <p className=\"text-sm text-gray-500\">{content.mindMap.description}</p>\n            )}\n          </div>\n        </div>\n        <div className=\"flex items-center gap-2\">\n          <span className=\"px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium\">\n            <Eye className=\"w-4 h-4 inline mr-1\" />\n            {shareInfo?.permission || 'VIEWER'}\n          </span>\n        </div>\n      </div>\n\n      {/* Canvas */}\n      <div className=\"flex-1\">\n        <ReactFlow\n          nodes={nodes}\n          edges={edges}\n          nodeTypes={nodeTypes}\n          nodesDraggable={false}\n          nodesConnectable={false}\n          elementsSelectable={false}\n          panOnDrag\n          zoomOnScroll\n          fitView\n          fitViewOptions={{ padding: 0.2 }}\n          proOptions={{ hideAttribution: true }}\n        >\n          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />\n          <Controls showInteractive={false} />\n          <MiniMap\n            nodeColor=\"#3b82f6\"\n            maskColor=\"rgba(0, 0, 0, 0.1)\"\n            style={{ width: 150, height: 100 }}\n          />\n        </ReactFlow>\n      </div>\n\n      {/* Footer */}\n      <div className=\"bg-white border-t px-4 py-2 text-center text-sm text-gray-500 shrink-0\">\n        Shared with MindMapper\n        {shareInfo?.expiresAt && (\n          <span className=\"ml-2\">\n            | Expires: {new Date(shareInfo.expiresAt).toLocaleDateString()}\n          </span>\n        )}\n      </div>\n    </div>\n  );\n}\n\nexport default function PublicShareView() {\n  return (\n    <ReactFlowProvider>\n      <PublicShareViewContent />\n    </ReactFlowProvider>\n  );\n}\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Update Prisma schema to add ShareableLink model with unique token, password, expiration, and access count fields",
      "status": "completed",
      "activeForm": "Updating Prisma schema for ShareableLink model"
    },
    {
      "content": "Run Prisma migration to apply schema changes",
      "status": "completed",
      "activeForm": "Running Prisma migration"
    },
    {
      "content": "Add shareable link API endpoints (create, get, verify password, public access)",
      "status": "completed",
      "activeForm": "Adding shareable link API endpoints"
    },
    {
      "content": "Create public share view page on frontend",
      "status": "completed",
      "activeForm": "Creating public share view page"
    },
    {
      "content": "Add route for public share access in frontend routing",
      "status": "in_progress",
      "activeForm": "Adding frontend routing for public share"
    },
    {
      "content": "Verify implementation with Playwright test",
      "status": "pending",
      "activeForm": "Verifying implementation with Playwright test"
    }
  ]
}
Now let's add the route in App.tsx:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/App.tsx"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/App.tsx",
  "old_string": "import AcceptInvitation from './pages/AcceptInvitation';\nimport NotFound from './pages/NotFound';",
  "new_string": "import AcceptInvitation from './pages/AcceptInvitation';\nimport PublicShareView from './pages/PublicShareView';\nimport NotFound from './pages/NotFound';"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/App.tsx",
  "old_string": "        {/* Public invitation route */}\n        <Route path=\"/invitations/:invitationId\" element={<AcceptInvitation />} />\n\n        {/* UI Showcase - public route for testing */}\n        <Route path=\"/ui-showcase\" element={<UIShowcase />} />\n\n        {/* Protected routes */}",
  "new_string": "        {/* Public invitation route */}\n        <Route path=\"/invitations/:invitationId\" element={<AcceptInvitation />} />\n\n        {/* Public share route */}\n        <Route path=\"/share/:token\" element={<PublicShareView />} />\n\n        {/* UI Showcase - public route for testing */}\n        <Route path=\"/ui-showcase\" element={<UIShowcase />} />\n\n        {/* Protected routes */}"
}
Now let me also add the route for the non-auth version:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/App.tsx",
  "old_string": "      <Routes>\n        {/* Public invitation route */}\n        <Route path=\"/invitations/:invitationId\" element={<AcceptInvitation />} />\n\n        {/* UI Showcase - public route for testing */}\n        <Route path=\"/ui-showcase\" element={<UIShowcase />} />\n\n        {/* Direct access to all routes when auth is disabled */}\n        <Route path=\"/\" element={<Dashboard />} />",
  "new_string": "      <Routes>\n        {/* Public invitation route */}\n        <Route path=\"/invitations/:invitationId\" element={<AcceptInvitation />} />\n\n        {/* Public share route */}\n        <Route path=\"/share/:token\" element={<PublicShareView />} />\n\n        {/* UI Showcase - public route for testing */}\n        <Route path=\"/ui-showcase\" element={<UIShowcase />} />\n\n        {/* Direct access to all routes when auth is disabled */}\n        <Route path=\"/\" element={<Dashboard />} />"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Update Prisma schema to add ShareableLink model with unique token, password, expiration, and access count fields",
      "status": "completed",
      "activeForm": "Updating Prisma schema for ShareableLink model"
    },
    {
      "content": "Run Prisma migration to apply schema changes",
      "status": "completed",
      "activeForm": "Running Prisma migration"
    },
    {
      "content": "Add shareable link API endpoints (create, get, verify password, public access)",
      "status": "completed",
      "activeForm": "Adding shareable link API endpoints"
    },
    {
      "content": "Create public share view page on frontend",
      "status": "completed",
      "activeForm": "Creating public share view page"
    },
    {
      "content": "Add route for public share access in frontend routing",
      "status": "completed",
      "activeForm": "Adding frontend routing for public share"
    },
    {
      "content": "Verify implementation with Playwright test",
      "status": "in_progress",
      "activeForm": "Verifying implementation with Playwright test"
    }
  ]
}
Now let me check if Playwright is set up in this project and run the verification:

🔧 Tool: Glob
Input: {
  "pattern": "**/playwright.config.*",
  "path": "/projects/mindmapper"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/playwright.config.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/package.json"
}
Let me check existing tests to understand the pattern:

🔧 Tool: Glob
Input: {
  "pattern": "**/tests/*.spec.ts",
  "path": "/projects/mindmapper/apps/web"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/share-modal-verification.spec.ts"
}
Now let me create a verification test for the shareable links feature:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/shareable-links-verification.spec.ts",
  "content": "import { test, expect } from '@playwright/test';\n\ntest.describe('Shareable Links Feature Verification', () => {\n  test('should render PublicShareView page for invalid token with error state', async ({\n    page,\n  }) => {\n    // Navigate to a public share route with an invalid token\n    await page.goto('/share/invalid-token-12345');\n    await page.waitForLoadState('networkidle');\n\n    // Should show loading first, then error\n    // Wait for the error state to appear (the API should return 404)\n    await expect(page.getByText('Share Link Invalid')).toBeVisible({\n      timeout: 10000,\n    });\n\n    // Verify error message is displayed\n    await expect(\n      page.getByText(/expired|revoked|access limit/i)\n    ).toBeVisible();\n  });\n\n  test('should render PublicShareView page with loading state', async ({\n    page,\n  }) => {\n    // Navigate to a public share route\n    await page.goto('/share/test-token');\n\n    // Should show loading state initially\n    await expect(page.getByText('Loading shared mind map...')).toBeVisible({\n      timeout: 5000,\n    });\n  });\n\n  test('should render password entry form for password-protected shares', async ({\n    page,\n  }) => {\n    // Mock the API response for a password-protected share\n    await page.route('**/api/shareable-links/public/protected-token', (route) => {\n      route.fulfill({\n        status: 200,\n        contentType: 'application/json',\n        body: JSON.stringify({\n          success: true,\n          data: {\n            id: 'link-123',\n            title: 'Protected Mind Map',\n            mapTitle: 'My Mind Map',\n            mapDescription: 'A test mind map',\n            mapThumbnail: null,\n            permission: 'VIEWER',\n            requiresPassword: true,\n            expiresAt: null,\n          },\n        }),\n      });\n    });\n\n    // Navigate to protected share\n    await page.goto('/share/protected-token');\n    await page.waitForLoadState('networkidle');\n\n    // Should show password entry form\n    await expect(page.getByText('Password Protected')).toBeVisible({\n      timeout: 10000,\n    });\n    await expect(\n      page.getByPlaceholder('Enter password')\n    ).toBeVisible();\n    await expect(page.getByRole('button', { name: /View Mind Map/i })).toBeVisible();\n  });\n\n  test('should show error when password verification fails', async ({\n    page,\n  }) => {\n    // Mock the API responses\n    await page.route('**/api/shareable-links/public/protected-token', (route) => {\n      route.fulfill({\n        status: 200,\n        contentType: 'application/json',\n        body: JSON.stringify({\n          success: true,\n          data: {\n            id: 'link-123',\n            title: 'Protected Mind Map',\n            mapTitle: 'My Mind Map',\n            mapDescription: null,\n            mapThumbnail: null,\n            permission: 'VIEWER',\n            requiresPassword: true,\n            expiresAt: null,\n          },\n        }),\n      });\n    });\n\n    await page.route('**/api/shareable-links/public/protected-token/content', (route) => {\n      route.fulfill({\n        status: 401,\n        contentType: 'application/json',\n        body: JSON.stringify({\n          success: false,\n          error: { message: 'Invalid password' },\n        }),\n      });\n    });\n\n    // Navigate to protected share\n    await page.goto('/share/protected-token');\n    await page.waitForLoadState('networkidle');\n\n    // Wait for password form\n    await expect(page.getByText('Password Protected')).toBeVisible({\n      timeout: 10000,\n    });\n\n    // Enter wrong password\n    await page.getByPlaceholder('Enter password').fill('wrongpassword');\n    await page.getByRole('button', { name: /View Mind Map/i }).click();\n\n    // Should show error\n    await expect(page.getByText('Invalid password')).toBeVisible({\n      timeout: 5000,\n    });\n  });\n\n  test('should display mind map content when share is accessible', async ({\n    page,\n  }) => {\n    // Mock the API responses for an accessible share without password\n    await page.route('**/api/shareable-links/public/accessible-token', (route) => {\n      route.fulfill({\n        status: 200,\n        contentType: 'application/json',\n        body: JSON.stringify({\n          success: true,\n          data: {\n            id: 'link-123',\n            title: 'Shared Mind Map',\n            mapTitle: 'My Mind Map',\n            mapDescription: 'This is a shared mind map',\n            mapThumbnail: null,\n            permission: 'VIEWER',\n            requiresPassword: false,\n            expiresAt: null,\n          },\n        }),\n      });\n    });\n\n    await page.route('**/api/shareable-links/public/accessible-token/content', (route) => {\n      route.fulfill({\n        status: 200,\n        contentType: 'application/json',\n        body: JSON.stringify({\n          success: true,\n          data: {\n            permission: 'VIEWER',\n            title: 'Shared Mind Map',\n            mindMap: {\n              id: 'map-123',\n              title: 'My Mind Map',\n              description: 'This is a shared mind map',\n              nodes: [\n                {\n                  id: 'node-1',\n                  text: 'Central Node',\n                  positionX: 400,\n                  positionY: 300,\n                  width: 150,\n                  height: 50,\n                  style: {},\n                  parentId: null,\n                  type: 'ROOT',\n                },\n              ],\n              connections: [],\n            },\n          },\n        }),\n      });\n    });\n\n    // Navigate to accessible share\n    await page.goto('/share/accessible-token');\n    await page.waitForLoadState('networkidle');\n\n    // Should show the mind map viewer\n    await expect(page.getByText('Shared Mind Map')).toBeVisible({\n      timeout: 10000,\n    });\n\n    // Should show VIEWER permission badge\n    await expect(page.getByText('VIEWER')).toBeVisible();\n\n    // Should show footer\n    await expect(page.getByText('Shared with MindMapper')).toBeVisible();\n  });\n\n  test('should display expiration date when present', async ({ page }) => {\n    const futureDate = new Date();\n    futureDate.setDate(futureDate.getDate() + 7);\n\n    // Mock the API responses with expiration\n    await page.route('**/api/shareable-links/public/expiring-token', (route) => {\n      route.fulfill({\n        status: 200,\n        contentType: 'application/json',\n        body: JSON.stringify({\n          success: true,\n          data: {\n            id: 'link-123',\n            title: 'Expiring Share',\n            mapTitle: 'My Mind Map',\n            mapDescription: null,\n            mapThumbnail: null,\n            permission: 'VIEWER',\n            requiresPassword: false,\n            expiresAt: futureDate.toISOString(),\n          },\n        }),\n      });\n    });\n\n    await page.route('**/api/shareable-links/public/expiring-token/content', (route) => {\n      route.fulfill({\n        status: 200,\n        contentType: 'application/json',\n        body: JSON.stringify({\n          success: true,\n          data: {\n            permission: 'VIEWER',\n            title: 'Expiring Share',\n            mindMap: {\n              id: 'map-123',\n              title: 'My Mind Map',\n              description: null,\n              nodes: [],\n              connections: [],\n            },\n          },\n        }),\n      });\n    });\n\n    // Navigate to expiring share\n    await page.goto('/share/expiring-token');\n    await page.waitForLoadState('networkidle');\n\n    // Should show expiration info\n    await expect(page.getByText(/Expires:/)).toBeVisible({\n      timeout: 10000,\n    });\n  });\n});\n"
}
Now let's run the Playwright test:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && pnpm exec playwright test shareable-links-verification.spec.ts --reporter=list 2>&1 | head -100",
  "description": "Run Playwright tests for shareable links",
  "timeout": 180000
}
The Playwright tests cannot run because Chromium is missing system dependencies. Let me verify the implementation by checking TypeScript compilation and running a basic check:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper && pnpm exec tsc --noEmit -p apps/api/tsconfig.json 2>&1 | head -50",
  "description": "Check API TypeScript compilation",
  "timeout": 60000
}

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/api && npx tsc --noEmit 2>&1 | head -50",
  "description": "Check API TypeScript compilation",
  "timeout": 60000
}

🔧 Tool: Bash
Input: {
  "command": "pnpm tsc --noEmit 2>&1 | head -50",
  "description": "Check API TypeScript compilation",
  "timeout": 60000
}
TypeScript compilation passes. Let me also verify the frontend compiles:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && pnpm tsc --noEmit 2>&1 | head -50",
  "description": "Check web TypeScript compilation",
  "timeout": 60000
}
All TypeScript checks pass. Since Playwright cannot run in this environment due to missing system dependencies, let me delete the test file as it was meant to be temporary:

🔧 Tool: Bash
Input: {
  "command": "rm /projects/mindmapper/apps/web/tests/shareable-links-verification.spec.ts",
  "description": "Delete temporary verification test"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Update Prisma schema to add ShareableLink model with unique token, password, expiration, and access count fields",
      "status": "completed",
      "activeForm": "Updating Prisma schema for ShareableLink model"
    },
    {
      "content": "Run Prisma migration to apply schema changes",
      "status": "completed",
      "activeForm": "Running Prisma migration"
    },
    {
      "content": "Add shareable link API endpoints (create, get, verify password, public access)",
      "status": "completed",
      "activeForm": "Adding shareable link API endpoints"
    },
    {
      "content": "Create public share view page on frontend",
      "status": "completed",
      "activeForm": "Creating public share view page"
    },
    {
      "content": "Add route for public share access in frontend routing",
      "status": "completed",
      "activeForm": "Adding frontend routing for public share"
    },
    {
      "content": "Verify implementation with Playwright test",
      "status": "completed",
      "activeForm": "Verifying implementation with Playwright test"
    }
  ]
}
Let me also verify the API builds correctly:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper && pnpm --filter @mindmapper/api build 2>&1",
  "description": "Build API package",
  "timeout": 120000
}

🔧 Tool: Bash
Input: {
  "command": "pnpm --filter @mindmapper/web build 2>&1 | tail -30",
  "description": "Build web package",
  "timeout": 120000
}
Excellent! Both the API and web packages build successfully. Let me verify the linting passes too:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/api && pnpm lint 2>&1 | head -30",
  "description": "Check API linting",
  "timeout": 60000
}
The linting configuration is missing but that's a separate issue not related to our feature. Let me verify the code is correct:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/routes/shareableLinks.ts",
  "limit": 50
}
The implementation is complete. Let me provide a summary of all the changes made:

<summary>
## Summary: Generate unique shareable URLs with optional password protection

### Changes Implemented
1. **Database Schema Update**: Added a new `ShareableLink` model in Prisma schema with:
   - Unique token for URL generation
   - Optional title for custom link names
   - Password protection (hashed with SHA-256)
   - Expiration date support
   - Maximum access count limit
   - Access count tracking
   - Active/inactive status
   - Permission levels (VIEWER, COMMENTER, EDITOR)

2. **API Endpoints** (new router at `/api/shareable-links`):
   - `POST /` - Create a new shareable link with optional password, expiration, and access limits
   - `GET /map/:mapId` - List all shareable links for a mind map
   - `GET /:linkId` - Get a specific shareable link details (owner only)
   - `PATCH /:linkId` - Update shareable link settings
   - `DELETE /:linkId` - Delete a shareable link
   - `GET /public/:token` - Public endpoint to get share info (no auth required)
   - `POST /public/:token/verify` - Verify password for protected shares
   - `GET /public/:token/content` - Get the shared mind map content (with password header if required)

3. **Frontend Components**:
   - Created `PublicShareView.tsx` page with:
     - Loading state during data fetch
     - Error state for invalid/expired links
     - Password entry form for protected shares
     - Read-only mind map viewer using ReactFlow
     - Header with permission badge
     - Footer with expiration info

4. **Frontend Routing**:
   - Added `/share/:token` route in App.tsx for both authenticated and unauthenticated modes

### Files Modified
- `/packages/db/prisma/schema.prisma` - Added ShareableLink model and updated MindMap relations
- `/packages/db/prisma/migrations/20250107000001_add_shareable_links/migration.sql` - SQL migration
- `/apps/api/src/routes/shareableLinks.ts` - New API router (created)
- `/apps/api/src/index.ts` - Registered new shareable links router
- `/apps/web/src/pages/PublicShareView.tsx` - New public share view page (created)
- `/apps/web/src/App.tsx` - Added public share route

### Verification Status
- TypeScript compilation: **Passed** for both API and Web packages
- Production build: **Passed** for both packages
- Playwright tests: Could not run due to missing Chromium dependencies in the environment (libglib-2.0.so.0), but the test file was created and then removed as per instructions

### Notes for Developer
- The password hashing uses SHA-256 for simplicity. For production, consider using bcrypt for better security.
- The public share view is read-only and doesn't allow editing, regardless of the permission level set.
- Access count is incremented when content is fetched successfully.
- The share URL format is: `{FRONTEND_URL}/share/{token}`
- Links can be deactivated by setting `isActive: false` rather than deleting them.
- The migration file was created manually since the database wasn't running. Apply it with `prisma migrate deploy` when the database is available.
</summary>