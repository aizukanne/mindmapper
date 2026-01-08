-- CreateTable
CREATE TABLE "ShareableLink" (
    "id" TEXT NOT NULL,
    "mindMapId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT,
    "permission" "Permission" NOT NULL DEFAULT 'VIEWER',
    "password" TEXT,
    "expiresAt" TIMESTAMP(3),
    "maxAccess" INTEGER,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareableLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShareableLink_token_key" ON "ShareableLink"("token");

-- CreateIndex
CREATE INDEX "ShareableLink_mindMapId_idx" ON "ShareableLink"("mindMapId");

-- CreateIndex
CREATE INDEX "ShareableLink_token_idx" ON "ShareableLink"("token");

-- CreateIndex
CREATE INDEX "ShareableLink_createdBy_idx" ON "ShareableLink"("createdBy");

-- CreateIndex
CREATE INDEX "ShareableLink_isActive_idx" ON "ShareableLink"("isActive");

-- AddForeignKey
ALTER TABLE "ShareableLink" ADD CONSTRAINT "ShareableLink_mindMapId_fkey" FOREIGN KEY ("mindMapId") REFERENCES "MindMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
