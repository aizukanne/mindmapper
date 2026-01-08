import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { Readable } from 'stream';
import crypto from 'crypto';
import {
  ImageProcessor,
  type ImageSize,
  type ProcessedImage,
  type ImageMetadata,
} from './image-processing.js';

// Storage configuration
export interface StorageConfig {
  provider: 'local' | 's3';
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string; // For S3-compatible services like MinIO, DigitalOcean Spaces
    forcePathStyle?: boolean; // For S3-compatible services
  };
  local?: {
    uploadDir: string;
    publicUrl: string;
  };
  limits: {
    maxPhotosPerMember: number;
    maxPhotosPerTree: number;
    maxFileSizeMB: number;
  };
  thumbnails: {
    width: number;
    height: number;
    quality: number;
  };
}

// Default configuration
const defaultConfig: StorageConfig = {
  provider: (process.env.STORAGE_PROVIDER as 'local' | 's3') || 'local',
  s3: {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  },
  local: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    publicUrl: process.env.PUBLIC_URL || 'http://localhost:3001/uploads',
  },
  limits: {
    maxPhotosPerMember: parseInt(process.env.MAX_PHOTOS_PER_MEMBER || '100', 10),
    maxPhotosPerTree: parseInt(process.env.MAX_PHOTOS_PER_TREE || '1000', 10),
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  },
  thumbnails: {
    width: 400,
    height: 400,
    quality: 80,
  },
};

let config = { ...defaultConfig };
let s3Client: S3Client | null = null;

// Initialize S3 client if configured
function getS3Client(): S3Client | null {
  if (config.provider !== 's3' || !config.s3?.bucket) {
    return null;
  }

  if (!s3Client) {
    const s3Config: ConstructorParameters<typeof S3Client>[0] = {
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
    };

    if (config.s3.endpoint) {
      s3Config.endpoint = config.s3.endpoint;
    }

    if (config.s3.forcePathStyle) {
      s3Config.forcePathStyle = true;
    }

    s3Client = new S3Client(s3Config);
  }

  return s3Client;
}

// Configure storage (can be called to override defaults)
export function configureStorage(newConfig: Partial<StorageConfig>): void {
  config = { ...config, ...newConfig };
  s3Client = null; // Reset client to use new config
}

// Get current storage configuration
export function getStorageConfig(): StorageConfig {
  return { ...config };
}

// Check if S3 is properly configured
export function isS3Configured(): boolean {
  return (
    config.provider === 's3' &&
    !!config.s3?.bucket &&
    !!config.s3?.accessKeyId &&
    !!config.s3?.secretAccessKey
  );
}

// Photo upload result
export interface UploadResult {
  originalUrl: string;
  thumbnailUrl: string;
  key: string;
  thumbnailKey: string;
  size: number;
  width: number;
  height: number;
  format: string;
}

// Extended photo upload result with multiple sizes
export interface MultiSizeUploadResult extends UploadResult {
  variants: {
    [key: string]: {
      url: string;
      key: string;
      width: number;
      height: number;
      size: number;
      format: string;
    };
  };
  webpVariants?: {
    [key: string]: {
      url: string;
      key: string;
      size: number;
    };
  };
}

// Image processor instance
const imageProcessor = new ImageProcessor();

// Generate unique file key
function generateFileKey(treeId: string, userId: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const hash = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();
  return `trees/${treeId}/photos/${userId}/${timestamp}-${hash}.${ext}`;
}

// Upload photo to S3
export async function uploadPhoto(
  buffer: Buffer,
  filename: string,
  treeId: string,
  userId: string,
  mimeType: string
): Promise<UploadResult> {
  const client = getS3Client();
  if (!client || !config.s3?.bucket) {
    throw new Error('S3 storage is not configured');
  }

  // Process image with sharp to get metadata
  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions');
  }

  // Generate keys
  const originalKey = generateFileKey(treeId, userId, filename);
  const thumbnailKey = originalKey.replace(/\.(\w+)$/, '_thumb.$1');

  // Create thumbnail
  const thumbnailBuffer = await image
    .resize(config.thumbnails.width, config.thumbnails.height, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: config.thumbnails.quality })
    .toBuffer();

  // Upload original
  await client.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: originalKey,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'max-age=31536000', // 1 year cache
    })
  );

  // Upload thumbnail
  await client.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
      CacheControl: 'max-age=31536000',
    })
  );

  // Generate URLs
  const baseUrl = config.s3.endpoint
    ? `${config.s3.endpoint}/${config.s3.bucket}`
    : `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com`;

  return {
    originalUrl: `${baseUrl}/${originalKey}`,
    thumbnailUrl: `${baseUrl}/${thumbnailKey}`,
    key: originalKey,
    thumbnailKey,
    size: buffer.length,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format || 'unknown',
  };
}

/**
 * Upload photo with multiple size variants for responsive web delivery.
 * Creates thumbnail, small, medium, and optionally WebP versions.
 */
export async function uploadPhotoWithVariants(
  buffer: Buffer,
  filename: string,
  treeId: string,
  userId: string,
  mimeType: string,
  options: {
    sizes?: ImageSize[];
    includeWebP?: boolean;
  } = {}
): Promise<MultiSizeUploadResult> {
  const client = getS3Client();
  if (!client || !config.s3?.bucket) {
    throw new Error('S3 storage is not configured');
  }

  // Store bucket reference to avoid TypeScript narrowing issues in async callbacks
  const bucket = config.s3.bucket;
  const region = config.s3.region;
  const endpoint = config.s3.endpoint;

  const { sizes = ['thumbnail', 'small', 'medium'], includeWebP = true } = options;

  // Process image with the image processor
  const { variants, metadata } = await imageProcessor.processForWeb(buffer, {
    sizes,
    includeWebP,
    includeAVIF: false, // AVIF encoding is slower, disable by default
  });

  // Generate base key
  const baseKey = generateFileKey(treeId, userId, filename);
  const baseKeyWithoutExt = baseKey.replace(/\.\w+$/, '');

  // Generate base URL
  const baseUrl = endpoint
    ? `${endpoint}/${bucket}`
    : `https://${bucket}.s3.${region}.amazonaws.com`;

  // Upload original (optimized)
  const originalKey = baseKey;
  const optimizedOriginal = await imageProcessor.resizeImage(
    buffer,
    { width: 2400, height: 2400, fit: 'inside' },
    'jpeg'
  );

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: originalKey,
      Body: optimizedOriginal.buffer,
      ContentType: 'image/jpeg',
      CacheControl: 'max-age=31536000',
    })
  );

  // Upload all variants
  const uploadedVariants: MultiSizeUploadResult['variants'] = {};
  const webpVariants: MultiSizeUploadResult['webpVariants'] = {};

  const uploadPromises = Object.entries(variants).map(async ([variantName, variant]) => {
    const isWebP = variantName.endsWith('_webp');
    const ext = isWebP ? 'webp' : 'jpg';
    const contentType = isWebP ? 'image/webp' : 'image/jpeg';
    const key = `${baseKeyWithoutExt}_${variantName}.${ext}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: variant.buffer,
        ContentType: contentType,
        CacheControl: 'max-age=31536000',
      })
    );

    if (isWebP) {
      webpVariants[variantName.replace('_webp', '')] = {
        url: `${baseUrl}/${key}`,
        key,
        size: variant.size,
      };
    } else {
      uploadedVariants[variantName] = {
        url: `${baseUrl}/${key}`,
        key,
        width: variant.width,
        height: variant.height,
        size: variant.size,
        format: variant.format,
      };
    }
  });

  await Promise.all(uploadPromises);

  // Use thumbnail as the main thumbnail
  const thumbnailKey = uploadedVariants['thumbnail']?.key || `${baseKeyWithoutExt}_thumbnail.jpg`;
  const thumbnailUrl = uploadedVariants['thumbnail']?.url || `${baseUrl}/${thumbnailKey}`;

  return {
    originalUrl: `${baseUrl}/${originalKey}`,
    thumbnailUrl,
    key: originalKey,
    thumbnailKey,
    size: buffer.length,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    variants: uploadedVariants,
    webpVariants: includeWebP ? webpVariants : undefined,
  };
}

/**
 * Process an image on-demand and return the resized buffer.
 * Useful for generating sizes not pre-created during upload.
 */
export async function processImageOnDemand(
  buffer: Buffer,
  options: {
    width: number;
    height: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    format?: 'jpeg' | 'webp' | 'avif' | 'png';
    quality?: number;
  }
): Promise<ProcessedImage> {
  const { width, height, fit = 'inside', format = 'jpeg', quality = 85 } = options;

  return imageProcessor.resizeImage(
    buffer,
    { width, height, fit },
    format,
    {
      sizes: {
        thumbnail: { width: 150, height: 150, fit: 'cover' },
        small: { width: 400, height: 400, fit: 'inside' },
        medium: { width: 800, height: 800, fit: 'inside' },
        large: { width: 1600, height: 1600, fit: 'inside' },
        original: null,
      },
      quality: { jpeg: quality, webp: quality, avif: quality, png: quality },
      progressive: true,
      stripMetadata: true,
      withoutEnlargement: true,
    }
  );
}

/**
 * Get image metadata from a buffer
 */
export async function getImageMetadataFromBuffer(buffer: Buffer): Promise<ImageMetadata> {
  return imageProcessor.getMetadata(buffer);
}

// Generate presigned URL for downloading original resolution
export async function getDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const client = getS3Client();
  if (!client || !config.s3?.bucket) {
    throw new Error('S3 storage is not configured');
  }

  const command = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${key.split('/').pop()}"`,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

// Get photo metadata from S3
export async function getPhotoMetadata(
  key: string
): Promise<{ size: number; contentType: string; lastModified: Date } | null> {
  const client = getS3Client();
  if (!client || !config.s3?.bucket) {
    return null;
  }

  try {
    const response = await client.send(
      new HeadObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
      })
    );

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
    };
  } catch {
    return null;
  }
}

// Stream photo from S3 (for proxying downloads)
export async function streamPhoto(key: string): Promise<{
  stream: Readable;
  contentType: string;
  contentLength: number;
} | null> {
  const client = getS3Client();
  if (!client || !config.s3?.bucket) {
    return null;
  }

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
      })
    );

    if (!response.Body) {
      return null;
    }

    return {
      stream: response.Body as Readable,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || 0,
    };
  } catch {
    return null;
  }
}

// Delete photo from S3
export async function deletePhoto(key: string, thumbnailKey?: string): Promise<boolean> {
  const client = getS3Client();
  if (!client || !config.s3?.bucket) {
    return false;
  }

  try {
    // Delete original
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
      })
    );

    // Delete thumbnail if provided
    if (thumbnailKey) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.s3.bucket,
          Key: thumbnailKey,
        })
      );
    }

    return true;
  } catch {
    return false;
  }
}

// Check photo limits for a member and tree
export interface PhotoLimitCheck {
  allowed: boolean;
  memberCount: number;
  treeCount: number;
  memberLimit: number;
  treeLimit: number;
  reason?: string;
}

export async function checkPhotoLimits(
  prisma: {
    treePhoto: {
      count: (args: { where: Record<string, unknown> }) => Promise<number>;
    };
  },
  treeId: string,
  userId: string
): Promise<PhotoLimitCheck> {
  const [memberCount, treeCount] = await Promise.all([
    prisma.treePhoto.count({
      where: { treeId, uploadedBy: userId },
    }),
    prisma.treePhoto.count({
      where: { treeId },
    }),
  ]);

  const memberLimit = config.limits.maxPhotosPerMember;
  const treeLimit = config.limits.maxPhotosPerTree;

  if (memberCount >= memberLimit) {
    return {
      allowed: false,
      memberCount,
      treeCount,
      memberLimit,
      treeLimit,
      reason: `You have reached your limit of ${memberLimit} photos. Please delete some photos to upload more.`,
    };
  }

  if (treeCount >= treeLimit) {
    return {
      allowed: false,
      memberCount,
      treeCount,
      memberLimit,
      treeLimit,
      reason: `This family tree has reached its limit of ${treeLimit} photos. Please contact an admin.`,
    };
  }

  return {
    allowed: true,
    memberCount,
    treeCount,
    memberLimit,
    treeLimit,
  };
}

// Get remaining upload quota
export async function getUploadQuota(
  prisma: {
    treePhoto: {
      count: (args: { where: Record<string, unknown> }) => Promise<number>;
    };
  },
  treeId: string,
  userId: string
): Promise<{
  memberRemaining: number;
  treeRemaining: number;
  memberLimit: number;
  treeLimit: number;
}> {
  const [memberCount, treeCount] = await Promise.all([
    prisma.treePhoto.count({
      where: { treeId, uploadedBy: userId },
    }),
    prisma.treePhoto.count({
      where: { treeId },
    }),
  ]);

  return {
    memberRemaining: Math.max(0, config.limits.maxPhotosPerMember - memberCount),
    treeRemaining: Math.max(0, config.limits.maxPhotosPerTree - treeCount),
    memberLimit: config.limits.maxPhotosPerMember,
    treeLimit: config.limits.maxPhotosPerTree,
  };
}

// Validate file before upload
export function validatePhotoFile(
  file: { size: number; mimetype: string }
): { valid: boolean; error?: string } {
  const maxSizeBytes = config.limits.maxFileSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${config.limits.maxFileSizeMB}MB limit`,
    };
  }

  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
  ];

  if (!allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, HEIC',
    };
  }

  return { valid: true };
}

// Export multer configuration helper
export function getMulterLimits() {
  return {
    fileSize: config.limits.maxFileSizeMB * 1024 * 1024,
    files: 1,
  };
}

// ===========================================
// Generic File Upload/Download Functions
// ===========================================

/**
 * Result from generating a presigned upload URL
 */
export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  expiresAt: Date;
  fields?: Record<string, string>;
}

/**
 * Generate a presigned URL for direct client-side uploads to S3
 * This allows the client to upload files directly to S3 without passing through the server
 */
export async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
  folder: string = 'uploads',
  expiresInSeconds: number = 3600
): Promise<PresignedUploadResult> {
  const client = getS3Client();
  if (!client || !config.s3?.bucket) {
    throw new Error('S3 storage is not configured');
  }

  // Generate a unique key for the file
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const hash = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${folder}/${timestamp}-${hash}-${safeFilename}`;

  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    ContentType: contentType,
    CacheControl: 'max-age=31536000',
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  return {
    uploadUrl,
    key,
    expiresAt,
  };
}

/**
 * Result from uploading a generic file
 */
export interface FileUploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

/**
 * Upload a generic file to S3 (not just photos)
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder: string = 'files'
): Promise<FileUploadResult> {
  const client = getS3Client();
  if (!client || !config.s3?.bucket) {
    throw new Error('S3 storage is not configured');
  }

  // Generate a unique key
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const hash = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${folder}/${timestamp}-${hash}-${safeFilename}`;

  // Upload to S3
  await client.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'max-age=31536000',
    })
  );

  // Generate public URL
  const baseUrl = config.s3.endpoint
    ? `${config.s3.endpoint}/${config.s3.bucket}`
    : `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com`;

  return {
    url: `${baseUrl}/${key}`,
    key,
    size: buffer.length,
    contentType,
  };
}

/**
 * Delete a file from S3 by key
 */
export async function deleteFile(key: string): Promise<boolean> {
  const client = getS3Client();
  if (!client || !config.s3?.bucket) {
    return false;
  }

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a presigned download URL for a file
 */
export async function getFileDownloadUrl(
  key: string,
  filename?: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const client = getS3Client();
  if (!client || !config.s3?.bucket) {
    throw new Error('S3 storage is not configured');
  }

  const downloadFilename = filename || key.split('/').pop() || 'download';

  const command = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${downloadFilename}"`,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Generate a presigned URL for viewing a file (inline, not attachment)
 */
export async function getFileViewUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const client = getS3Client();
  if (!client || !config.s3?.bucket) {
    throw new Error('S3 storage is not configured');
  }

  const command = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    ResponseContentDisposition: 'inline',
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Check if a file exists in S3
 */
export async function fileExists(key: string): Promise<boolean> {
  const client = getS3Client();
  if (!client || !config.s3?.bucket) {
    return false;
  }

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file metadata from S3
 */
export async function getFileMetadata(key: string): Promise<{
  size: number;
  contentType: string;
  lastModified: Date;
  etag?: string;
} | null> {
  const client = getS3Client();
  if (!client || !config.s3?.bucket) {
    return null;
  }

  try {
    const response = await client.send(
      new HeadObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
      })
    );

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
      etag: response.ETag,
    };
  } catch {
    return null;
  }
}

/**
 * Validate S3 configuration and test connectivity
 */
export async function validateS3Configuration(): Promise<{
  valid: boolean;
  error?: string;
  bucket?: string;
  region?: string;
}> {
  if (!isS3Configured()) {
    return {
      valid: false,
      error: 'S3 is not configured. Please set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY environment variables.',
    };
  }

  const client = getS3Client();
  if (!client || !config.s3?.bucket) {
    return {
      valid: false,
      error: 'Failed to initialize S3 client',
    };
  }

  try {
    // Try to check bucket access by listing with max 1 object
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    await client.send(
      new ListObjectsV2Command({
        Bucket: config.s3.bucket,
        MaxKeys: 1,
      })
    );

    return {
      valid: true,
      bucket: config.s3.bucket,
      region: config.s3.region,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to connect to S3 bucket',
      bucket: config.s3.bucket,
      region: config.s3.region,
    };
  }
}

/**
 * Get storage status and configuration info
 */
export function getStorageStatus(): {
  provider: 'local' | 's3';
  configured: boolean;
  bucket?: string;
  region?: string;
  endpoint?: string;
  limits: {
    maxFileSizeMB: number;
    maxPhotosPerMember: number;
    maxPhotosPerTree: number;
  };
} {
  return {
    provider: config.provider,
    configured: config.provider === 's3' ? isS3Configured() : true,
    bucket: config.s3?.bucket || undefined,
    region: config.s3?.region || undefined,
    endpoint: config.s3?.endpoint || undefined,
    limits: {
      maxFileSizeMB: config.limits.maxFileSizeMB,
      maxPhotosPerMember: config.limits.maxPhotosPerMember,
      maxPhotosPerTree: config.limits.maxPhotosPerTree,
    },
  };
}
