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
