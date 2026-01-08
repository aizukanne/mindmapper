/**
 * Photo Upload API Routes
 *
 * Dedicated Multer-based endpoint for photo uploads with:
 * - File validation (type, size)
 * - Sharp image processing (resize, optimize, format conversion)
 * - S3 storage with multiple size variants
 * - Database record creation in TreePhoto table
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler, ErrorCodes } from '../middleware/errorHandler.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  isS3Configured,
  validatePhotoFile,
  getMulterLimits,
  checkPhotoLimits,
  getUploadQuota,
  uploadPhotoWithVariants,
  deletePhoto as deletePhotoFromS3,
  getDownloadUrl,
  type MultiSizeUploadResult,
} from '../lib/storage.js';
import {
  ImageProcessor,
  type ImageSize,
} from '../lib/image-processing.js';

export const photosRouter = Router();

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// Configure multer for memory storage with file size limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: getMulterLimits(),
  fileFilter: (req, file, cb) => {
    // Allow common image types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
    ];

    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, HEIC', {
        code: ErrorCodes.VALIDATION_ERROR,
      }));
    }
  },
});

// ===========================================
// Validation Schemas
// ===========================================

const photoUploadSchema = z.object({
  treeId: z.string().min(1, 'Tree ID is required'),
  personId: z.string().optional(),
  caption: z.string().max(500).optional(),
  dateTaken: z.string().refine(
    (val) => {
      if (!val) return true;
      return /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val);
    },
    { message: 'Invalid date format. Use YYYY-MM-DD or ISO datetime.' }
  ).optional(),
  location: z.string().max(255).optional(),
  privacy: z.enum(['PUBLIC', 'ALL_FAMILY', 'DIRECT_RELATIVES', 'ADMINS_ONLY', 'PRIVATE']).optional(),
  sizes: z.string().optional(), // JSON array of sizes: ["thumbnail", "small", "medium", "large"]
  includeWebP: z.string().optional(), // "true" or "false"
});

const photoListQuerySchema = z.object({
  treeId: z.string().min(1, 'Tree ID is required'),
  personId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  privacy: z.enum(['PUBLIC', 'ALL_FAMILY', 'DIRECT_RELATIVES', 'ADMINS_ONLY', 'PRIVATE', 'NONE']).optional(),
  sortBy: z.enum(['createdAt', 'dateTaken', 'fileSize']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
});

const photoIdParamSchema = z.object({
  photoId: z.string().min(1, 'Photo ID is required'),
});

const photoUpdateSchema = z.object({
  caption: z.string().max(500).optional(),
  dateTaken: z.string().optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  privacy: z.enum(['PUBLIC', 'ALL_FAMILY', 'DIRECT_RELATIVES', 'ADMINS_ONLY', 'PRIVATE']).optional(),
  personId: z.string().optional().nullable(),
});

// ===========================================
// Photo Upload Endpoint
// ===========================================

/**
 * POST /api/photos/upload
 * Upload a photo with validation, Sharp processing, S3 storage, and database record creation
 *
 * Request: multipart/form-data
 * - file: The image file (required)
 * - treeId: Family tree ID (required)
 * - personId: Person ID to associate with (optional)
 * - caption: Photo caption (optional)
 * - dateTaken: Date the photo was taken (optional, YYYY-MM-DD)
 * - location: Location where photo was taken (optional)
 * - privacy: Privacy level (optional, defaults to ALL_FAMILY)
 * - sizes: JSON array of sizes to generate (optional, defaults to ["thumbnail", "small", "medium"])
 * - includeWebP: Generate WebP variants (optional, defaults to "true")
 */
photosRouter.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate S3 configuration
    if (!isS3Configured()) {
      throw new AppError(503, 'S3 storage is not configured. Photo upload requires S3.', {
        code: ErrorCodes.SERVICE_UNAVAILABLE,
      });
    }

    // Validate file presence
    const file = req.file;
    if (!file) {
      throw new AppError(400, 'No image file provided', { code: ErrorCodes.BAD_REQUEST });
    }

    // Parse and validate request body
    const bodyData = photoUploadSchema.parse(req.body);
    const { treeId, personId, caption, dateTaken, location, privacy } = bodyData;

    // Parse optional processing options
    let sizes: ImageSize[] = ['thumbnail', 'small', 'medium'];
    if (bodyData.sizes) {
      try {
        const parsedSizes = JSON.parse(bodyData.sizes);
        if (Array.isArray(parsedSizes)) {
          sizes = parsedSizes.filter((s): s is ImageSize =>
            ['thumbnail', 'small', 'medium', 'large'].includes(s)
          );
        }
      } catch {
        // Use default sizes if parsing fails
      }
    }
    const includeWebP = bodyData.includeWebP !== 'false';

    const userId = getUserId(req);

    // Verify tree exists and user has access
    const tree = await prisma.familyTree.findFirst({
      where: { id: treeId },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    if (!tree) {
      throw new AppError(404, 'Family tree not found', { code: ErrorCodes.NOT_FOUND });
    }

    // Check if user is owner or member
    const isOwner = tree.createdBy === userId;
    const membership = tree.members[0];

    if (!isOwner && !membership) {
      throw new AppError(403, 'You do not have access to this tree', { code: ErrorCodes.FORBIDDEN });
    }

    // Check photo upload limits
    const limitCheck = await checkPhotoLimits(prisma, treeId, userId);
    if (!limitCheck.allowed) {
      throw new AppError(400, limitCheck.reason || 'Photo upload limit reached', {
        code: ErrorCodes.BAD_REQUEST,
        details: {
          memberCount: limitCheck.memberCount,
          memberLimit: limitCheck.memberLimit,
          treeCount: limitCheck.treeCount,
          treeLimit: limitCheck.treeLimit,
        },
      });
    }

    // Validate person if provided
    if (personId) {
      const person = await prisma.person.findFirst({
        where: { id: personId, treeId },
      });

      if (!person) {
        throw new AppError(400, 'Person not found in this tree', {
          code: ErrorCodes.BAD_REQUEST,
        });
      }
    }

    // Validate the photo file
    const fileValidation = validatePhotoFile({ size: file.size, mimetype: file.mimetype });
    if (!fileValidation.valid) {
      throw new AppError(400, fileValidation.error || 'Invalid photo file', {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    // Validate image using Sharp
    const imageProcessor = new ImageProcessor();
    const isValidImage = await imageProcessor.isValidImage(file.buffer);
    if (!isValidImage) {
      throw new AppError(400, 'Invalid or corrupted image file', {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    // Get image metadata for additional validation
    const metadata = await imageProcessor.getMetadata(file.buffer);

    // Ensure minimum dimensions
    if (metadata.width < 50 || metadata.height < 50) {
      throw new AppError(400, 'Image dimensions too small. Minimum 50x50 pixels required.', {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    // Upload photo with variants to S3
    let uploadResult: MultiSizeUploadResult;
    try {
      uploadResult = await uploadPhotoWithVariants(
        file.buffer,
        file.originalname,
        treeId,
        userId,
        file.mimetype,
        {
          sizes,
          includeWebP,
        }
      );
    } catch (uploadError) {
      throw new AppError(500, 'Failed to upload photo to storage', {
        code: ErrorCodes.INTERNAL_ERROR,
        details: { message: uploadError instanceof Error ? uploadError.message : 'Unknown error' },
      });
    }

    // Determine default privacy based on person's age (if applicable)
    let defaultPrivacy: 'PUBLIC' | 'ALL_FAMILY' | 'DIRECT_RELATIVES' | 'ADMINS_ONLY' | 'PRIVATE' = 'ALL_FAMILY';

    if (personId) {
      const person = await prisma.person.findUnique({
        where: { id: personId },
        select: { birthDate: true, isLiving: true },
      });

      if (person && person.birthDate && person.isLiving) {
        const age = Math.floor(
          (Date.now() - new Date(person.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );
        if (age < 18) {
          defaultPrivacy = 'DIRECT_RELATIVES';
        }
      }
    }

    // Create database record
    const photo = await prisma.treePhoto.create({
      data: {
        treeId,
        personId: personId || null,
        url: uploadResult.thumbnailUrl,
        originalUrl: uploadResult.originalUrl,
        s3Key: uploadResult.key,
        thumbnailKey: uploadResult.thumbnailKey,
        width: uploadResult.width,
        height: uploadResult.height,
        fileSize: uploadResult.size,
        format: uploadResult.format,
        caption: caption || null,
        dateTaken: dateTaken ? new Date(dateTaken) : null,
        location: location || null,
        privacy: privacy || defaultPrivacy,
        uploadedBy: userId,
      },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        photo,
        variants: uploadResult.variants,
        webpVariants: uploadResult.webpVariants,
        metadata: {
          originalWidth: metadata.width,
          originalHeight: metadata.height,
          originalFormat: metadata.format,
          hasAlpha: metadata.hasAlpha,
        },
      },
    });
  })
);

// ===========================================
// Photo List Endpoint
// ===========================================

/**
 * GET /api/photos
 * List photos with filtering and pagination
 */
photosRouter.get(
  '/',
  validateQuery(photoListQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      treeId,
      personId,
      startDate,
      endDate,
      privacy,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = '50',
      offset = '0',
    } = req.query as z.infer<typeof photoListQuerySchema>;

    const userId = getUserId(req);

    // Verify tree access
    const tree = await prisma.familyTree.findFirst({
      where: { id: treeId },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    if (!tree) {
      throw new AppError(404, 'Family tree not found', { code: ErrorCodes.NOT_FOUND });
    }

    const isOwner = tree.createdBy === userId;
    const membership = tree.members[0];

    if (!isOwner && !membership) {
      throw new AppError(403, 'You do not have access to this tree', { code: ErrorCodes.FORBIDDEN });
    }

    // Build where clause
    const where: Record<string, unknown> = { treeId };

    if (personId) {
      // Include photos where person is primary or tagged
      where.OR = [
        { personId },
        { taggedPeople: { some: { personId } } },
      ];
    }

    if (startDate) {
      where.dateTaken = { ...((where.dateTaken as Record<string, unknown>) || {}), gte: new Date(startDate) };
    }

    if (endDate) {
      where.dateTaken = { ...((where.dateTaken as Record<string, unknown>) || {}), lte: new Date(endDate) };
    }

    if (privacy) {
      where.privacy = privacy;
    }

    const [photos, total] = await Promise.all([
      prisma.treePhoto.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: parseInt(limit, 10),
        skip: parseInt(offset, 10),
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          uploader: {
            select: {
              id: true,
              name: true,
            },
          },
          taggedPeople: {
            include: {
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                },
              },
            },
          },
        },
      }),
      prisma.treePhoto.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        photos,
        pagination: {
          total,
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
          hasMore: parseInt(offset, 10) + photos.length < total,
        },
      },
    });
  })
);

// ===========================================
// Get Single Photo
// ===========================================

/**
 * GET /api/photos/:photoId
 * Get a single photo with details
 */
photosRouter.get(
  '/:photoId',
  asyncHandler(async (req: Request, res: Response) => {
    const { photoId } = req.params;
    const userId = getUserId(req);

    const photo = await prisma.treePhoto.findUnique({
      where: { id: photoId },
      include: {
        tree: {
          select: {
            id: true,
            name: true,
            createdBy: true,
          },
        },
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
        taggedPeople: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    if (!photo) {
      throw new AppError(404, 'Photo not found', { code: ErrorCodes.NOT_FOUND });
    }

    // Verify access to the tree
    const membership = await prisma.treeMember.findFirst({
      where: { treeId: photo.treeId, userId },
    });

    const isOwner = photo.tree.createdBy === userId;

    if (!isOwner && !membership) {
      throw new AppError(403, 'You do not have access to this photo', { code: ErrorCodes.FORBIDDEN });
    }

    res.json({
      success: true,
      data: photo,
    });
  })
);

// ===========================================
// Update Photo
// ===========================================

/**
 * PATCH /api/photos/:photoId
 * Update photo metadata
 */
photosRouter.patch(
  '/:photoId',
  validateBody(photoUpdateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { photoId } = req.params;
    const data = req.body as z.infer<typeof photoUpdateSchema>;
    const userId = getUserId(req);

    const photo = await prisma.treePhoto.findUnique({
      where: { id: photoId },
      include: {
        tree: {
          select: { createdBy: true },
        },
      },
    });

    if (!photo) {
      throw new AppError(404, 'Photo not found', { code: ErrorCodes.NOT_FOUND });
    }

    // Check permissions - only uploader, tree owner, or admin can update
    const membership = await prisma.treeMember.findFirst({
      where: { treeId: photo.treeId, userId },
    });

    const isOwner = photo.tree.createdBy === userId;
    const isUploader = photo.uploadedBy === userId;
    const isAdmin = membership?.role === 'ADMIN';

    if (!isOwner && !isUploader && !isAdmin) {
      throw new AppError(403, 'You do not have permission to update this photo', {
        code: ErrorCodes.FORBIDDEN,
      });
    }

    // Validate personId if provided
    if (data.personId) {
      const person = await prisma.person.findFirst({
        where: { id: data.personId, treeId: photo.treeId },
      });

      if (!person) {
        throw new AppError(400, 'Person not found in this tree', {
          code: ErrorCodes.BAD_REQUEST,
        });
      }
    }

    const updatedPhoto = await prisma.treePhoto.update({
      where: { id: photoId },
      data: {
        caption: data.caption !== undefined ? data.caption : undefined,
        dateTaken: data.dateTaken !== undefined
          ? (data.dateTaken ? new Date(data.dateTaken) : null)
          : undefined,
        location: data.location !== undefined ? data.location : undefined,
        privacy: data.privacy,
        personId: data.personId !== undefined ? data.personId : undefined,
      },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedPhoto,
    });
  })
);

// ===========================================
// Delete Photo
// ===========================================

/**
 * DELETE /api/photos/:photoId
 * Delete a photo from storage and database
 */
photosRouter.delete(
  '/:photoId',
  asyncHandler(async (req: Request, res: Response) => {
    const { photoId } = req.params;
    const userId = getUserId(req);

    const photo = await prisma.treePhoto.findUnique({
      where: { id: photoId },
      include: {
        tree: {
          select: { createdBy: true },
        },
      },
    });

    if (!photo) {
      throw new AppError(404, 'Photo not found', { code: ErrorCodes.NOT_FOUND });
    }

    // Check permissions
    const membership = await prisma.treeMember.findFirst({
      where: { treeId: photo.treeId, userId },
    });

    const isOwner = photo.tree.createdBy === userId;
    const isUploader = photo.uploadedBy === userId;
    const isAdmin = membership?.role === 'ADMIN';

    if (!isOwner && !isUploader && !isAdmin) {
      throw new AppError(403, 'You do not have permission to delete this photo', {
        code: ErrorCodes.FORBIDDEN,
      });
    }

    // Delete from S3 if stored there
    if (photo.s3Key) {
      try {
        await deletePhotoFromS3(photo.s3Key, photo.thumbnailKey || undefined);
      } catch (error) {
        console.error('Failed to delete photo from S3:', error);
        // Continue with database deletion even if S3 deletion fails
      }
    }

    // Delete from database
    await prisma.treePhoto.delete({
      where: { id: photoId },
    });

    res.json({
      success: true,
      message: 'Photo deleted successfully',
    });
  })
);

// ===========================================
// Get Download URL
// ===========================================

/**
 * GET /api/photos/:photoId/download
 * Get a presigned download URL for the original resolution photo
 */
photosRouter.get(
  '/:photoId/download',
  asyncHandler(async (req: Request, res: Response) => {
    const { photoId } = req.params;
    const userId = getUserId(req);

    const photo = await prisma.treePhoto.findUnique({
      where: { id: photoId },
      include: {
        tree: {
          select: { createdBy: true },
        },
      },
    });

    if (!photo) {
      throw new AppError(404, 'Photo not found', { code: ErrorCodes.NOT_FOUND });
    }

    // Verify access
    const membership = await prisma.treeMember.findFirst({
      where: { treeId: photo.treeId, userId },
    });

    const isOwner = photo.tree.createdBy === userId;

    if (!isOwner && !membership) {
      throw new AppError(403, 'You do not have access to this photo', { code: ErrorCodes.FORBIDDEN });
    }

    if (!photo.s3Key) {
      // Return original URL if available
      if (photo.originalUrl) {
        res.json({
          success: true,
          data: {
            downloadUrl: photo.originalUrl,
            filename: `photo-${photo.id}.jpg`,
            fileSize: photo.fileSize,
            width: photo.width,
            height: photo.height,
            format: photo.format,
          },
        });
        return;
      }
      throw new AppError(400, 'Original resolution not available for this photo', {
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    const downloadUrl = await getDownloadUrl(photo.s3Key, 3600);

    res.json({
      success: true,
      data: {
        downloadUrl,
        expiresIn: 3600,
        filename: photo.s3Key.split('/').pop() || `photo-${photo.id}.jpg`,
        fileSize: photo.fileSize,
        width: photo.width,
        height: photo.height,
        format: photo.format,
      },
    });
  })
);

// ===========================================
// Get Upload Quota
// ===========================================

/**
 * GET /api/photos/quota
 * Get the user's upload quota for a specific tree
 */
photosRouter.get(
  '/tree/:treeId/quota',
  asyncHandler(async (req: Request, res: Response) => {
    const { treeId } = req.params;
    const userId = getUserId(req);

    // Verify tree access
    const tree = await prisma.familyTree.findFirst({
      where: { id: treeId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!tree) {
      throw new AppError(404, 'Family tree not found', { code: ErrorCodes.NOT_FOUND });
    }

    const isOwner = tree.createdBy === userId;

    if (!isOwner && tree.members.length === 0) {
      throw new AppError(403, 'You do not have access to this tree', { code: ErrorCodes.FORBIDDEN });
    }

    const quota = await getUploadQuota(prisma, treeId, userId);

    res.json({
      success: true,
      data: quota,
    });
  })
);

// ===========================================
// Photo Validation Endpoint (for pre-upload validation)
// ===========================================

/**
 * POST /api/photos/validate
 * Validate an image file before upload (without actually uploading)
 */
photosRouter.post(
  '/validate',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new AppError(400, 'No image file provided', { code: ErrorCodes.BAD_REQUEST });
    }

    // Validate file type and size
    const fileValidation = validatePhotoFile({ size: file.size, mimetype: file.mimetype });

    // Validate image with Sharp
    const imageProcessor = new ImageProcessor();
    let isValidImage = false;
    let imageMetadata: { width: number; height: number; format: string; hasAlpha: boolean } | null = null;

    try {
      isValidImage = await imageProcessor.isValidImage(file.buffer);
      if (isValidImage) {
        const meta = await imageProcessor.getMetadata(file.buffer);
        imageMetadata = {
          width: meta.width,
          height: meta.height,
          format: meta.format,
          hasAlpha: meta.hasAlpha,
        };
      }
    } catch {
      isValidImage = false;
    }

    const errors: string[] = [];

    if (!fileValidation.valid) {
      errors.push(fileValidation.error || 'Invalid file');
    }

    if (!isValidImage) {
      errors.push('Invalid or corrupted image file');
    }

    if (imageMetadata && (imageMetadata.width < 50 || imageMetadata.height < 50)) {
      errors.push('Image dimensions too small. Minimum 50x50 pixels required.');
    }

    res.json({
      success: true,
      data: {
        valid: errors.length === 0,
        errors,
        metadata: imageMetadata,
        fileInfo: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        },
      },
    });
  })
);

export default photosRouter;
