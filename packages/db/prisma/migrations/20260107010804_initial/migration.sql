-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('ROOT', 'CHILD', 'FLOATING');

-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('HIERARCHICAL', 'CROSS_LINK');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('OWNER', 'EDITOR', 'COMMENTER', 'VIEWER');

-- CreateEnum
CREATE TYPE "TreePrivacy" AS ENUM ('PRIVATE', 'FAMILY_ONLY', 'PUBLIC');

-- CreateEnum
CREATE TYPE "TreeRole" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PersonPrivacy" AS ENUM ('PUBLIC', 'FAMILY_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "DnaPrivacy" AS ENUM ('PRIVATE', 'FAMILY_ONLY');

-- CreateEnum
CREATE TYPE "PhotoPrivacy" AS ENUM ('PUBLIC', 'ALL_FAMILY', 'DIRECT_RELATIVES', 'ADMINS_ONLY', 'PRIVATE', 'NONE');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('PARENT', 'CHILD', 'SPOUSE', 'SIBLING', 'ADOPTIVE_PARENT', 'ADOPTIVE_CHILD', 'STEP_PARENT', 'STEP_CHILD', 'FOSTER_PARENT', 'FOSTER_CHILD', 'GUARDIAN', 'WARD');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BIRTH_CERTIFICATE', 'DEATH_CERTIFICATE', 'MARRIAGE_CERTIFICATE', 'DIVORCE_DECREE', 'CENSUS_RECORD', 'MILITARY_RECORD', 'IMMIGRATION_RECORD', 'NEWSPAPER_ARTICLE', 'PHOTO', 'LETTER', 'WILL', 'DEED', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DRAFT');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SuggestionType" AS ENUM ('UPDATE_PERSON', 'ADD_RELATIONSHIP', 'ADD_PERSON', 'CORRECT_DATE', 'OTHER');

-- CreateEnum
CREATE TYPE "MergeStatus" AS ENUM ('COMPLETED', 'REVERTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('MEMBER_JOINED', 'MEMBER_LEFT', 'MEMBER_ROLE_CHANGED', 'PERSON_ADDED', 'PERSON_UPDATED', 'PERSON_DELETED', 'PERSON_MERGED', 'RELATIONSHIP_ADDED', 'RELATIONSHIP_REMOVED', 'MARRIAGE_ADDED', 'MARRIAGE_REMOVED', 'PHOTO_UPLOADED', 'PHOTO_DELETED', 'DOCUMENT_UPLOADED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED', 'STORY_PUBLISHED', 'STORY_UPDATED', 'SUGGESTION_MADE', 'SUGGESTION_APPROVED', 'SUGGESTION_REJECTED', 'TREE_UPDATED', 'TREE_PRIVACY_CHANGED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MindMap" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "userId" TEXT NOT NULL,
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MindMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Node" (
    "id" TEXT NOT NULL,
    "mindMapId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "NodeType" NOT NULL DEFAULT 'CHILD',
    "text" TEXT NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 150,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "style" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "mindMapId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "type" "ConnectionType" NOT NULL DEFAULT 'HIERARCHICAL',
    "label" TEXT,
    "style" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "mindMapId" TEXT NOT NULL,
    "userId" TEXT,
    "shareToken" TEXT,
    "permission" "Permission" NOT NULL DEFAULT 'VIEWER',
    "password" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "mindMapId" TEXT NOT NULL,
    "nodeId" TEXT,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapEvent" (
    "id" TEXT NOT NULL,
    "mindMapId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousState" JSONB,
    "newState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "category" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyTree" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "privacy" "TreePrivacy" NOT NULL DEFAULT 'PRIVATE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyTree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreeMember" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TreeRole" NOT NULL DEFAULT 'VIEWER',
    "linkedPersonId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "maidenName" TEXT,
    "suffix" TEXT,
    "nickname" TEXT,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "birthDate" TIMESTAMP(3),
    "birthPlace" TEXT,
    "deathDate" TIMESTAMP(3),
    "deathPlace" TEXT,
    "isLiving" BOOLEAN NOT NULL DEFAULT true,
    "biography" TEXT,
    "occupation" TEXT,
    "education" TEXT,
    "privacy" "PersonPrivacy" NOT NULL DEFAULT 'PUBLIC',
    "profilePhoto" TEXT,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "generation" INTEGER NOT NULL DEFAULT 0,
    "dnaTestProvider" TEXT,
    "dnaTestDate" TIMESTAMP(3),
    "yDnaHaplogroup" TEXT,
    "mtDnaHaplogroup" TEXT,
    "dnaKitNumber" TEXT,
    "dnaEthnicityNotes" TEXT,
    "dnaMatchNotes" TEXT,
    "dnaPrivacy" "DnaPrivacy" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "personFromId" TEXT NOT NULL,
    "personToId" TEXT NOT NULL,
    "relationshipType" "RelationshipType" NOT NULL,
    "notes" TEXT,
    "birthOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Marriage" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "marriageDate" TIMESTAMP(3),
    "marriagePlace" TEXT,
    "divorceDate" TIMESTAMP(3),
    "divorcePlace" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Marriage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreeInvitation" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TreeRole" NOT NULL DEFAULT 'VIEWER',
    "inviteCode" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "acceptedBy" TEXT,
    "invitedBy" TEXT NOT NULL,

    CONSTRAINT "TreeInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreePhoto" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "personId" TEXT,
    "url" TEXT NOT NULL,
    "originalUrl" TEXT,
    "s3Key" TEXT,
    "thumbnailKey" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "format" TEXT,
    "caption" TEXT,
    "dateTaken" TIMESTAMP(3),
    "location" TEXT,
    "privacy" "PhotoPrivacy" NOT NULL DEFAULT 'ALL_FAMILY',
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoTag" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceDocument" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "personId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "url" TEXT,
    "originalUrl" TEXT,
    "s3Key" TEXT,
    "thumbnailKey" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "pageCount" INTEGER,
    "ocrText" TEXT,
    "notes" TEXT,
    "citation" TEXT,
    "dateOnDocument" TIMESTAMP(3),
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "hasWatermark" BOOLEAN NOT NULL DEFAULT false,
    "uploadedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentPerson" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyStory" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "personId" TEXT,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "storyDate" TIMESTAMP(3),
    "location" TEXT,
    "coverImage" TEXT,
    "status" "StoryStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "FamilyStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryPerson" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryComment" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryLike" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "suggesterId" TEXT NOT NULL,
    "type" "SuggestionType" NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currentData" JSONB,
    "suggestedData" JSONB NOT NULL,
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonMerge" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "primaryPersonId" TEXT NOT NULL,
    "mergedPersonId" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "status" "MergeStatus" NOT NULL DEFAULT 'COMPLETED',
    "mergedPersonData" JSONB NOT NULL,
    "transferredRelations" JSONB NOT NULL,
    "transferredMarriages" JSONB NOT NULL,
    "transferredPhotos" JSONB NOT NULL,
    "transferredDocuments" JSONB NOT NULL,
    "transferredStories" JSONB NOT NULL,
    "fieldSelections" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revertedAt" TIMESTAMP(3),
    "revertedById" TEXT,

    CONSTRAINT "PersonMerge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreeActivity" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "targetPersonId" TEXT,
    "targetUserId" TEXT,
    "targetPhotoId" TEXT,
    "targetDocumentId" TEXT,
    "targetStoryId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreeActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityReadStatus" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityReadStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MarriagePerson" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MarriagePerson_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Folder_userId_idx" ON "Folder"("userId");

-- CreateIndex
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");

-- CreateIndex
CREATE INDEX "MindMap_userId_idx" ON "MindMap"("userId");

-- CreateIndex
CREATE INDEX "MindMap_folderId_idx" ON "MindMap"("folderId");

-- CreateIndex
CREATE INDEX "MindMap_isPublic_idx" ON "MindMap"("isPublic");

-- CreateIndex
CREATE INDEX "MindMap_createdAt_idx" ON "MindMap"("createdAt");

-- CreateIndex
CREATE INDEX "MindMap_updatedAt_idx" ON "MindMap"("updatedAt");

-- CreateIndex
CREATE INDEX "Node_mindMapId_idx" ON "Node"("mindMapId");

-- CreateIndex
CREATE INDEX "Node_parentId_idx" ON "Node"("parentId");

-- CreateIndex
CREATE INDEX "Node_mindMapId_parentId_idx" ON "Node"("mindMapId", "parentId");

-- CreateIndex
CREATE INDEX "Connection_mindMapId_idx" ON "Connection"("mindMapId");

-- CreateIndex
CREATE INDEX "Connection_sourceNodeId_idx" ON "Connection"("sourceNodeId");

-- CreateIndex
CREATE INDEX "Connection_targetNodeId_idx" ON "Connection"("targetNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_sourceNodeId_targetNodeId_key" ON "Connection"("sourceNodeId", "targetNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Share_shareToken_key" ON "Share"("shareToken");

-- CreateIndex
CREATE INDEX "Share_mindMapId_idx" ON "Share"("mindMapId");

-- CreateIndex
CREATE INDEX "Share_userId_idx" ON "Share"("userId");

-- CreateIndex
CREATE INDEX "Share_shareToken_idx" ON "Share"("shareToken");

-- CreateIndex
CREATE INDEX "Comment_mindMapId_idx" ON "Comment"("mindMapId");

-- CreateIndex
CREATE INDEX "Comment_nodeId_idx" ON "Comment"("nodeId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "MapEvent_mindMapId_idx" ON "MapEvent"("mindMapId");

-- CreateIndex
CREATE INDEX "MapEvent_userId_idx" ON "MapEvent"("userId");

-- CreateIndex
CREATE INDEX "MapEvent_createdAt_idx" ON "MapEvent"("createdAt");

-- CreateIndex
CREATE INDEX "MapEvent_mindMapId_createdAt_idx" ON "MapEvent"("mindMapId", "createdAt");

-- CreateIndex
CREATE INDEX "Template_category_idx" ON "Template"("category");

-- CreateIndex
CREATE INDEX "Template_isPublic_idx" ON "Template"("isPublic");

-- CreateIndex
CREATE INDEX "Template_createdBy_idx" ON "Template"("createdBy");

-- CreateIndex
CREATE INDEX "FamilyTree_createdBy_idx" ON "FamilyTree"("createdBy");

-- CreateIndex
CREATE INDEX "FamilyTree_privacy_idx" ON "FamilyTree"("privacy");

-- CreateIndex
CREATE INDEX "FamilyTree_createdAt_idx" ON "FamilyTree"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TreeMember_linkedPersonId_key" ON "TreeMember"("linkedPersonId");

-- CreateIndex
CREATE INDEX "TreeMember_treeId_idx" ON "TreeMember"("treeId");

-- CreateIndex
CREATE INDEX "TreeMember_userId_idx" ON "TreeMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeMember_treeId_userId_key" ON "TreeMember"("treeId", "userId");

-- CreateIndex
CREATE INDEX "Person_treeId_idx" ON "Person"("treeId");

-- CreateIndex
CREATE INDEX "Person_treeId_generation_idx" ON "Person"("treeId", "generation");

-- CreateIndex
CREATE INDEX "Person_lastName_idx" ON "Person"("lastName");

-- CreateIndex
CREATE INDEX "Person_privacy_idx" ON "Person"("privacy");

-- CreateIndex
CREATE INDEX "Relationship_treeId_idx" ON "Relationship"("treeId");

-- CreateIndex
CREATE INDEX "Relationship_personFromId_idx" ON "Relationship"("personFromId");

-- CreateIndex
CREATE INDEX "Relationship_personToId_idx" ON "Relationship"("personToId");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_personFromId_personToId_relationshipType_key" ON "Relationship"("personFromId", "personToId", "relationshipType");

-- CreateIndex
CREATE INDEX "Marriage_treeId_idx" ON "Marriage"("treeId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeInvitation_inviteCode_key" ON "TreeInvitation"("inviteCode");

-- CreateIndex
CREATE INDEX "TreeInvitation_treeId_idx" ON "TreeInvitation"("treeId");

-- CreateIndex
CREATE INDEX "TreeInvitation_inviteCode_idx" ON "TreeInvitation"("inviteCode");

-- CreateIndex
CREATE INDEX "TreeInvitation_email_idx" ON "TreeInvitation"("email");

-- CreateIndex
CREATE INDEX "TreeInvitation_status_idx" ON "TreeInvitation"("status");

-- CreateIndex
CREATE INDEX "TreePhoto_treeId_idx" ON "TreePhoto"("treeId");

-- CreateIndex
CREATE INDEX "TreePhoto_personId_idx" ON "TreePhoto"("personId");

-- CreateIndex
CREATE INDEX "TreePhoto_uploadedBy_idx" ON "TreePhoto"("uploadedBy");

-- CreateIndex
CREATE INDEX "TreePhoto_privacy_idx" ON "TreePhoto"("privacy");

-- CreateIndex
CREATE INDEX "TreePhoto_dateTaken_idx" ON "TreePhoto"("dateTaken");

-- CreateIndex
CREATE INDEX "PhotoTag_photoId_idx" ON "PhotoTag"("photoId");

-- CreateIndex
CREATE INDEX "PhotoTag_personId_idx" ON "PhotoTag"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoTag_photoId_personId_key" ON "PhotoTag"("photoId", "personId");

-- CreateIndex
CREATE INDEX "SourceDocument_treeId_idx" ON "SourceDocument"("treeId");

-- CreateIndex
CREATE INDEX "SourceDocument_personId_idx" ON "SourceDocument"("personId");

-- CreateIndex
CREATE INDEX "SourceDocument_documentType_idx" ON "SourceDocument"("documentType");

-- CreateIndex
CREATE INDEX "SourceDocument_status_idx" ON "SourceDocument"("status");

-- CreateIndex
CREATE INDEX "SourceDocument_uploadedBy_idx" ON "SourceDocument"("uploadedBy");

-- CreateIndex
CREATE INDEX "DocumentPerson_documentId_idx" ON "DocumentPerson"("documentId");

-- CreateIndex
CREATE INDEX "DocumentPerson_personId_idx" ON "DocumentPerson"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentPerson_documentId_personId_key" ON "DocumentPerson"("documentId", "personId");

-- CreateIndex
CREATE INDEX "FamilyStory_treeId_idx" ON "FamilyStory"("treeId");

-- CreateIndex
CREATE INDEX "FamilyStory_personId_idx" ON "FamilyStory"("personId");

-- CreateIndex
CREATE INDEX "FamilyStory_authorId_idx" ON "FamilyStory"("authorId");

-- CreateIndex
CREATE INDEX "FamilyStory_status_idx" ON "FamilyStory"("status");

-- CreateIndex
CREATE INDEX "FamilyStory_isPublic_idx" ON "FamilyStory"("isPublic");

-- CreateIndex
CREATE INDEX "FamilyStory_isFeatured_idx" ON "FamilyStory"("isFeatured");

-- CreateIndex
CREATE INDEX "StoryPerson_storyId_idx" ON "StoryPerson"("storyId");

-- CreateIndex
CREATE INDEX "StoryPerson_personId_idx" ON "StoryPerson"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryPerson_storyId_personId_key" ON "StoryPerson"("storyId", "personId");

-- CreateIndex
CREATE INDEX "StoryComment_storyId_idx" ON "StoryComment"("storyId");

-- CreateIndex
CREATE INDEX "StoryComment_authorId_idx" ON "StoryComment"("authorId");

-- CreateIndex
CREATE INDEX "StoryComment_parentId_idx" ON "StoryComment"("parentId");

-- CreateIndex
CREATE INDEX "StoryLike_storyId_idx" ON "StoryLike"("storyId");

-- CreateIndex
CREATE INDEX "StoryLike_userId_idx" ON "StoryLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryLike_storyId_userId_key" ON "StoryLike"("storyId", "userId");

-- CreateIndex
CREATE INDEX "Suggestion_treeId_idx" ON "Suggestion"("treeId");

-- CreateIndex
CREATE INDEX "Suggestion_personId_idx" ON "Suggestion"("personId");

-- CreateIndex
CREATE INDEX "Suggestion_suggesterId_idx" ON "Suggestion"("suggesterId");

-- CreateIndex
CREATE INDEX "Suggestion_status_idx" ON "Suggestion"("status");

-- CreateIndex
CREATE INDEX "Suggestion_treeId_status_idx" ON "Suggestion"("treeId", "status");

-- CreateIndex
CREATE INDEX "PersonMerge_treeId_idx" ON "PersonMerge"("treeId");

-- CreateIndex
CREATE INDEX "PersonMerge_primaryPersonId_idx" ON "PersonMerge"("primaryPersonId");

-- CreateIndex
CREATE INDEX "PersonMerge_mergedPersonId_idx" ON "PersonMerge"("mergedPersonId");

-- CreateIndex
CREATE INDEX "PersonMerge_status_idx" ON "PersonMerge"("status");

-- CreateIndex
CREATE INDEX "PersonMerge_expiresAt_idx" ON "PersonMerge"("expiresAt");

-- CreateIndex
CREATE INDEX "TreeActivity_treeId_createdAt_idx" ON "TreeActivity"("treeId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TreeActivity_treeId_type_idx" ON "TreeActivity"("treeId", "type");

-- CreateIndex
CREATE INDEX "TreeActivity_actorId_idx" ON "TreeActivity"("actorId");

-- CreateIndex
CREATE INDEX "TreeActivity_targetPersonId_idx" ON "TreeActivity"("targetPersonId");

-- CreateIndex
CREATE INDEX "TreeActivity_createdAt_idx" ON "TreeActivity"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityReadStatus_userId_idx" ON "ActivityReadStatus"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityReadStatus_treeId_userId_key" ON "ActivityReadStatus"("treeId", "userId");

-- CreateIndex
CREATE INDEX "_MarriagePerson_B_index" ON "_MarriagePerson"("B");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MindMap" ADD CONSTRAINT "MindMap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MindMap" ADD CONSTRAINT "MindMap_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_mindMapId_fkey" FOREIGN KEY ("mindMapId") REFERENCES "MindMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_mindMapId_fkey" FOREIGN KEY ("mindMapId") REFERENCES "MindMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_mindMapId_fkey" FOREIGN KEY ("mindMapId") REFERENCES "MindMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_mindMapId_fkey" FOREIGN KEY ("mindMapId") REFERENCES "MindMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapEvent" ADD CONSTRAINT "MapEvent_mindMapId_fkey" FOREIGN KEY ("mindMapId") REFERENCES "MindMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyTree" ADD CONSTRAINT "FamilyTree_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreeMember" ADD CONSTRAINT "TreeMember_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreeMember" ADD CONSTRAINT "TreeMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreeMember" ADD CONSTRAINT "TreeMember_linkedPersonId_fkey" FOREIGN KEY ("linkedPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_personFromId_fkey" FOREIGN KEY ("personFromId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_personToId_fkey" FOREIGN KEY ("personToId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Marriage" ADD CONSTRAINT "Marriage_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreeInvitation" ADD CONSTRAINT "TreeInvitation_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreeInvitation" ADD CONSTRAINT "TreeInvitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreeInvitation" ADD CONSTRAINT "TreeInvitation_acceptedBy_fkey" FOREIGN KEY ("acceptedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreePhoto" ADD CONSTRAINT "TreePhoto_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreePhoto" ADD CONSTRAINT "TreePhoto_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreePhoto" ADD CONSTRAINT "TreePhoto_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoTag" ADD CONSTRAINT "PhotoTag_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "TreePhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoTag" ADD CONSTRAINT "PhotoTag_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPerson" ADD CONSTRAINT "DocumentPerson_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SourceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPerson" ADD CONSTRAINT "DocumentPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyStory" ADD CONSTRAINT "FamilyStory_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyStory" ADD CONSTRAINT "FamilyStory_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyStory" ADD CONSTRAINT "FamilyStory_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryPerson" ADD CONSTRAINT "StoryPerson_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "FamilyStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryPerson" ADD CONSTRAINT "StoryPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryComment" ADD CONSTRAINT "StoryComment_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "FamilyStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryComment" ADD CONSTRAINT "StoryComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryComment" ADD CONSTRAINT "StoryComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StoryComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryLike" ADD CONSTRAINT "StoryLike_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "FamilyStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryLike" ADD CONSTRAINT "StoryLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_suggesterId_fkey" FOREIGN KEY ("suggesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonMerge" ADD CONSTRAINT "PersonMerge_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonMerge" ADD CONSTRAINT "PersonMerge_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonMerge" ADD CONSTRAINT "PersonMerge_revertedById_fkey" FOREIGN KEY ("revertedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreeActivity" ADD CONSTRAINT "TreeActivity_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreeActivity" ADD CONSTRAINT "TreeActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MarriagePerson" ADD CONSTRAINT "_MarriagePerson_A_fkey" FOREIGN KEY ("A") REFERENCES "Marriage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MarriagePerson" ADD CONSTRAINT "_MarriagePerson_B_fkey" FOREIGN KEY ("B") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
