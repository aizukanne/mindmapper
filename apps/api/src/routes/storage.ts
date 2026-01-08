import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import {
  isS3Configured,
  getStorageStatus,
  validateS3Configuration,
  getPresignedUploadUrl,
  uploadFile,
  deleteFile,
  getFileDownloadUrl,
  getFileViewUrl,
  getFileMetadata,
  fileExists,
  getMulterLimits,
  processImageOnDemand,
  getImageMetadataFromBuffer,
  uploadPhotoWithVariants,
  type MultiSizeUploadResult,
} from '../lib/storage.js';
import {
  ImageProcessor,
  type ImageSize,
} from '../lib/image-processing.js';
import { AppError, asyncHandler, ErrorCodes } from '../middleware/errorHandler.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';

export const storageRouter = Router();

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: getMulterLimits(),
});

// ===========================================
// Validation Schemas
// ===========================================

const presignedUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
  contentType: z.string().min(1, 'Content type is required'),
  folder: z.string().max(100).optional(),
  expiresIn: z.number().min(60).max(86400).optional(), // 1 min to 24 hours
});

const downloadUrlSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  filename: z.string().max(255).optional(),
  expiresIn: z.number().min(60).max(86400).optional(),
  inline: z.boolean().optional(),
});

const fileKeyParamSchema = z.object({
  key: z.string().min(1, 'Key is required'),
});

const fileKeyQuerySchema = z.object({
  key: z.string().min(1, 'Key is required'),
});

// ===========================================
// Storage Status Routes
// ===========================================

/**
 * GET /api/storage/status
 * Get storage configuration status
 */
storageRouter.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const status = getStorageStatus();

  res.json({
    success: true,
    data: status,
  });
}));

/**
 * GET /api/storage/validate
 * Validate S3 configuration and test connectivity
 */
storageRouter.get('/validate', asyncHandler(async (req: Request, res: Response) => {
  const validation = await validateS3Configuration();

  res.json({
    success: true,
    data: validation,
  });
}));

// ===========================================
// Presigned URL Routes
// ===========================================

/**
 * POST /api/storage/presigned-upload
 * Generate a presigned URL for direct client-side uploads to S3
 */
storageRouter.post(
  '/presigned-upload',
  validateBody(presignedUploadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!isS3Configured()) {
      throw new AppError(503, 'S3 storage is not configured', { code: ErrorCodes.SERVICE_UNAVAILABLE });
    }

    const { filename, contentType, folder, expiresIn } = req.body as z.infer<typeof presignedUploadSchema>;
    const userId = getUserId(req);

    // Use user-specific folder if not provided
    const targetFolder = folder || `uploads/${userId}`;

    const result = await getPresignedUploadUrl(
      filename,
      contentType,
      targetFolder,
      expiresIn || 3600
    );

    res.json({
      success: true,
      data: {
        uploadUrl: result.uploadUrl,
        key: result.key,
        expiresAt: result.expiresAt.toISOString(),
      },
    });
  })
);

/**
 * POST /api/storage/download-url
 * Generate a presigned URL for downloading a file
 */
storageRouter.post(
  '/download-url',
  validateBody(downloadUrlSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!isS3Configured()) {
      throw new AppError(503, 'S3 storage is not configured', { code: ErrorCodes.SERVICE_UNAVAILABLE });
    }

    const { key, filename, expiresIn, inline } = req.body as z.infer<typeof downloadUrlSchema>;

    // Check if file exists
    const exists = await fileExists(key);
    if (!exists) {
      throw new AppError(404, 'File not found', { code: ErrorCodes.NOT_FOUND });
    }

    const url = inline
      ? await getFileViewUrl(key, expiresIn || 3600)
      : await getFileDownloadUrl(key, filename, expiresIn || 3600);

    res.json({
      success: true,
      data: {
        downloadUrl: url,
        key,
        expiresIn: expiresIn || 3600,
      },
    });
  })
);

// ===========================================
// File Upload Routes
// ===========================================

/**
 * POST /api/storage/upload
 * Upload a file directly through the server
 */
storageRouter.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!isS3Configured()) {
      throw new AppError(503, 'S3 storage is not configured', { code: ErrorCodes.SERVICE_UNAVAILABLE });
    }

    const file = req.file;
    if (!file) {
      throw new AppError(400, 'No file provided', { code: ErrorCodes.BAD_REQUEST });
    }

    const userId = getUserId(req);
    const folder = (req.body.folder as string) || `uploads/${userId}`;

    const result = await uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  })
);

// ===========================================
// File Management Routes
// ===========================================

/**
 * GET /api/storage/metadata
 * Get metadata for a file
 */
storageRouter.get(
  '/metadata',
  validateQuery(fileKeyQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!isS3Configured()) {
      throw new AppError(503, 'S3 storage is not configured', { code: ErrorCodes.SERVICE_UNAVAILABLE });
    }

    const { key } = req.query as z.infer<typeof fileKeyQuerySchema>;

    const metadata = await getFileMetadata(key);
    if (!metadata) {
      throw new AppError(404, 'File not found', { code: ErrorCodes.NOT_FOUND });
    }

    res.json({
      success: true,
      data: {
        key,
        ...metadata,
        lastModified: metadata.lastModified.toISOString(),
      },
    });
  })
);

/**
 * GET /api/storage/exists
 * Check if a file exists
 */
storageRouter.get(
  '/exists',
  validateQuery(fileKeyQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!isS3Configured()) {
      throw new AppError(503, 'S3 storage is not configured', { code: ErrorCodes.SERVICE_UNAVAILABLE });
    }

    const { key } = req.query as z.infer<typeof fileKeyQuerySchema>;

    const exists = await fileExists(key);

    res.json({
      success: true,
      data: {
        key,
        exists,
      },
    });
  })
);

/**
 * DELETE /api/storage/file
 * Delete a file from storage
 */
storageRouter.delete(
  '/file',
  validateQuery(fileKeyQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!isS3Configured()) {
      throw new AppError(503, 'S3 storage is not configured', { code: ErrorCodes.SERVICE_UNAVAILABLE });
    }

    const { key } = req.query as z.infer<typeof fileKeyQuerySchema>;

    // Check if file exists
    const exists = await fileExists(key);
    if (!exists) {
      throw new AppError(404, 'File not found', { code: ErrorCodes.NOT_FOUND });
    }

    const deleted = await deleteFile(key);
    if (!deleted) {
      throw new AppError(500, 'Failed to delete file', { code: ErrorCodes.INTERNAL_ERROR });
    }

    res.json({
      success: true,
      data: {
        key,
        deleted: true,
      },
    });
  })
);

// ===========================================
// Image Processing Routes
// ===========================================

// Validation schemas for image processing
const imageProcessSchema = z.object({
  width: z.number().min(1).max(4000).optional(),
  height: z.number().min(1).max(4000).optional(),
  fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional(),
  format: z.enum(['jpeg', 'webp', 'avif', 'png']).optional(),
  quality: z.number().min(1).max(100).optional(),
});

const imageUploadWithVariantsSchema = z.object({
  sizes: z.array(z.enum(['thumbnail', 'small', 'medium', 'large'])).optional(),
  includeWebP: z.boolean().optional(),
  treeId: z.string().min(1, 'Tree ID is required'),
});

/**
 * POST /api/storage/image/process
 * Process an uploaded image with custom dimensions and format
 */
storageRouter.post(
  '/image/process',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new AppError(400, 'No image file provided', { code: ErrorCodes.BAD_REQUEST });
    }

    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.mimetype.toLowerCase())) {
      throw new AppError(400, 'Invalid image type. Allowed: JPEG, PNG, GIF, WebP, HEIC', { code: ErrorCodes.BAD_REQUEST });
    }

    // Parse options from body
    const options = imageProcessSchema.parse({
      width: req.body.width ? parseInt(req.body.width, 10) : undefined,
      height: req.body.height ? parseInt(req.body.height, 10) : undefined,
      fit: req.body.fit,
      format: req.body.format,
      quality: req.body.quality ? parseInt(req.body.quality, 10) : undefined,
    });

    // Set defaults
    const width = options.width || 800;
    const height = options.height || 800;
    const fit = options.fit || 'inside';
    const format = options.format || 'jpeg';
    const quality = options.quality || 85;

    // Process the image
    const processed = await processImageOnDemand(file.buffer, {
      width,
      height,
      fit,
      format,
      quality,
    });

    // Set appropriate content type
    const contentTypeMap: Record<string, string> = {
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      avif: 'image/avif',
      png: 'image/png',
    };

    res.set('Content-Type', contentTypeMap[processed.format] || 'image/jpeg');
    res.set('Content-Length', processed.size.toString());
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('X-Image-Width', processed.width.toString());
    res.set('X-Image-Height', processed.height.toString());
    res.set('X-Image-Format', processed.format);
    res.set('X-Original-Size', file.size.toString());
    res.set('X-Processed-Size', processed.size.toString());

    res.send(processed.buffer);
  })
);

/**
 * POST /api/storage/image/metadata
 * Get metadata from an uploaded image without processing
 */
storageRouter.post(
  '/image/metadata',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new AppError(400, 'No image file provided', { code: ErrorCodes.BAD_REQUEST });
    }

    const metadata = await getImageMetadataFromBuffer(file.buffer);

    res.json({
      success: true,
      data: {
        ...metadata,
        originalSize: file.size,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
    });
  })
);

/**
 * POST /api/storage/image/upload-variants
 * Upload an image and create multiple size variants for responsive delivery
 */
storageRouter.post(
  '/image/upload-variants',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!isS3Configured()) {
      throw new AppError(503, 'S3 storage is not configured', { code: ErrorCodes.SERVICE_UNAVAILABLE });
    }

    const file = req.file;
    if (!file) {
      throw new AppError(400, 'No image file provided', { code: ErrorCodes.BAD_REQUEST });
    }

    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.mimetype.toLowerCase())) {
      throw new AppError(400, 'Invalid image type. Allowed: JPEG, PNG, GIF, WebP, HEIC', { code: ErrorCodes.BAD_REQUEST });
    }

    // Parse options
    const options = imageUploadWithVariantsSchema.parse({
      sizes: req.body.sizes ? JSON.parse(req.body.sizes) : undefined,
      includeWebP: req.body.includeWebP === 'true',
      treeId: req.body.treeId,
    });

    const userId = getUserId(req);

    // Upload with variants
    const result = await uploadPhotoWithVariants(
      file.buffer,
      file.originalname,
      options.treeId,
      userId,
      file.mimetype,
      {
        sizes: options.sizes as ImageSize[] | undefined,
        includeWebP: options.includeWebP,
      }
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/storage/image/convert
 * Convert an image to a different format (WebP, AVIF, etc.)
 */
storageRouter.post(
  '/image/convert',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new AppError(400, 'No image file provided', { code: ErrorCodes.BAD_REQUEST });
    }

    const format = (req.body.format as string) || 'webp';
    const quality = req.body.quality ? parseInt(req.body.quality, 10) : 85;

    if (!['jpeg', 'webp', 'avif', 'png'].includes(format)) {
      throw new AppError(400, 'Invalid format. Allowed: jpeg, webp, avif, png', { code: ErrorCodes.BAD_REQUEST });
    }

    const imageProcessor = new ImageProcessor();
    let processed;

    switch (format) {
      case 'webp':
        processed = await imageProcessor.toWebP(file.buffer, quality);
        break;
      case 'avif':
        processed = await imageProcessor.toAVIF(file.buffer, quality);
        break;
      default:
        processed = await processImageOnDemand(file.buffer, {
          width: 4000,
          height: 4000,
          fit: 'inside',
          format: format as 'jpeg' | 'png',
          quality,
        });
    }

    const contentTypeMap: Record<string, string> = {
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      avif: 'image/avif',
      png: 'image/png',
    };

    res.set('Content-Type', contentTypeMap[format]);
    res.set('Content-Length', processed.size.toString());
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('X-Original-Size', file.size.toString());
    res.set('X-Converted-Size', processed.size.toString());
    res.set('X-Compression-Ratio', ((1 - processed.size / file.size) * 100).toFixed(1) + '%');

    res.send(processed.buffer);
  })
);

/**
 * POST /api/storage/image/thumbnail
 * Create a square thumbnail from an uploaded image
 */
storageRouter.post(
  '/image/thumbnail',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new AppError(400, 'No image file provided', { code: ErrorCodes.BAD_REQUEST });
    }

    const size = req.body.size ? parseInt(req.body.size, 10) : 150;
    if (size < 16 || size > 1000) {
      throw new AppError(400, 'Thumbnail size must be between 16 and 1000 pixels', { code: ErrorCodes.BAD_REQUEST });
    }

    const imageProcessor = new ImageProcessor();
    const thumbnail = await imageProcessor.createThumbnail(file.buffer, size);

    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Length', thumbnail.size.toString());
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('X-Thumbnail-Size', `${thumbnail.width}x${thumbnail.height}`);

    res.send(thumbnail.buffer);
  })
);

/**
 * GET /api/storage/image/formats
 * Get list of supported image formats for input and output
 */
storageRouter.get('/image/formats', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      inputFormats: ImageProcessor.getSupportedFormats(),
      outputFormats: ['jpeg', 'webp', 'avif', 'png'],
      sizes: {
        thumbnail: { width: 150, height: 150, description: 'Square thumbnail with center crop' },
        small: { width: 400, height: 400, description: 'Small image for lists and cards' },
        medium: { width: 800, height: 800, description: 'Medium image for content areas' },
        large: { width: 1600, height: 1600, description: 'Large image for full-screen views' },
      },
    },
  });
});
