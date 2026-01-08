/**
 * Image Processing Module
 *
 * Provides comprehensive image resizing and optimization using Sharp.
 * Features:
 * - Multiple thumbnail sizes (small, medium, large)
 * - Web-optimized formats (WebP, AVIF)
 * - Progressive JPEG compression
 * - Automatic format detection and conversion
 * - EXIF data handling
 */

import sharp from 'sharp';

// ==========================================
// Types and Interfaces
// ==========================================

/**
 * Predefined image sizes for responsive web delivery
 */
export type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

/**
 * Supported output formats for web optimization
 */
export type OutputFormat = 'jpeg' | 'webp' | 'avif' | 'png' | 'original';

/**
 * Configuration for a single image size variant
 */
export interface ImageSizeConfig {
  width: number;
  height: number;
  fit: keyof sharp.FitEnum;
  position?: string;
}

/**
 * Configuration for image processing
 */
export interface ImageProcessingConfig {
  sizes: Record<ImageSize, ImageSizeConfig | null>;
  quality: {
    jpeg: number;
    webp: number;
    avif: number;
    png: number;
  };
  progressive: boolean;
  stripMetadata: boolean;
  withoutEnlargement: boolean;
}

/**
 * Result of processing a single image variant
 */
export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

/**
 * Result of processing all image variants
 */
export interface ProcessedImageSet {
  original: ProcessedImage;
  variants: Record<string, ProcessedImage>;
  metadata: ImageMetadata;
}

/**
 * Image metadata extracted from the original
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  space?: string;
  hasAlpha: boolean;
  orientation?: number;
  exif?: Record<string, unknown>;
}

// ==========================================
// Default Configuration
// ==========================================

const defaultConfig: ImageProcessingConfig = {
  sizes: {
    thumbnail: { width: 150, height: 150, fit: 'cover' },
    small: { width: 400, height: 400, fit: 'inside' },
    medium: { width: 800, height: 800, fit: 'inside' },
    large: { width: 1600, height: 1600, fit: 'inside' },
    original: null, // null means keep original dimensions
  },
  quality: {
    jpeg: 85,
    webp: 85,
    avif: 80,
    png: 90,
  },
  progressive: true,
  stripMetadata: true,
  withoutEnlargement: true,
};

// ==========================================
// Image Processing Class
// ==========================================

export class ImageProcessor {
  private config: ImageProcessingConfig;

  constructor(config: Partial<ImageProcessingConfig> = {}) {
    this.config = {
      ...defaultConfig,
      ...config,
      sizes: { ...defaultConfig.sizes, ...config.sizes },
      quality: { ...defaultConfig.quality, ...config.quality },
    };
  }

  /**
   * Get image metadata from a buffer
   */
  async getMetadata(buffer: Buffer): Promise<ImageMetadata> {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      space: metadata.space,
      hasAlpha: metadata.hasAlpha || false,
      orientation: metadata.orientation,
    };
  }

  /**
   * Process an image into multiple size variants
   */
  async processImage(
    buffer: Buffer,
    options: {
      sizes?: ImageSize[];
      formats?: OutputFormat[];
      customConfig?: Partial<ImageProcessingConfig>;
    } = {}
  ): Promise<ProcessedImageSet> {
    const { sizes = ['thumbnail', 'small', 'medium'], formats = ['original'] } = options;

    const config = options.customConfig
      ? { ...this.config, ...options.customConfig }
      : this.config;

    // Get original metadata
    const metadata = await this.getMetadata(buffer);

    // Process original (optimized but not resized)
    const original = await this.optimizeOriginal(buffer, metadata, config);

    // Process each size variant
    const variants: Record<string, ProcessedImage> = {};

    for (const size of sizes) {
      const sizeConfig = config.sizes[size];
      if (!sizeConfig) continue;

      for (const format of formats) {
        const key = formats.length > 1 ? `${size}_${format}` : size;
        variants[key] = await this.resizeImage(buffer, sizeConfig, format, config);
      }
    }

    return {
      original,
      variants,
      metadata,
    };
  }

  /**
   * Resize a single image to specified dimensions
   */
  async resizeImage(
    buffer: Buffer,
    sizeConfig: ImageSizeConfig,
    format: OutputFormat = 'original',
    config: ImageProcessingConfig = this.config
  ): Promise<ProcessedImage> {
    let image = sharp(buffer);

    // Get original metadata to determine output format
    const metadata = await image.metadata();
    const originalFormat = metadata.format || 'jpeg';

    // Resize
    image = image.resize({
      width: sizeConfig.width,
      height: sizeConfig.height,
      fit: sizeConfig.fit,
      position: sizeConfig.position || 'center',
      withoutEnlargement: config.withoutEnlargement,
    });

    // Apply format conversion and optimization
    image = this.applyFormat(image, format === 'original' ? originalFormat : format, config);

    // Strip metadata if configured
    if (config.stripMetadata) {
      image = image.rotate(); // Auto-rotate based on EXIF, then strip
    }

    const outputBuffer = await image.toBuffer({ resolveWithObject: true });

    return {
      buffer: outputBuffer.data,
      width: outputBuffer.info.width,
      height: outputBuffer.info.height,
      format: outputBuffer.info.format,
      size: outputBuffer.data.length,
    };
  }

  /**
   * Optimize original image without resizing
   */
  private async optimizeOriginal(
    buffer: Buffer,
    metadata: ImageMetadata,
    config: ImageProcessingConfig
  ): Promise<ProcessedImage> {
    let image = sharp(buffer);

    // Auto-rotate based on EXIF orientation
    image = image.rotate();

    // Apply format optimization
    image = this.applyFormat(image, metadata.format, config);

    const outputBuffer = await image.toBuffer({ resolveWithObject: true });

    return {
      buffer: outputBuffer.data,
      width: outputBuffer.info.width,
      height: outputBuffer.info.height,
      format: outputBuffer.info.format,
      size: outputBuffer.data.length,
    };
  }

  /**
   * Apply format-specific optimization
   */
  private applyFormat(
    image: sharp.Sharp,
    format: string,
    config: ImageProcessingConfig
  ): sharp.Sharp {
    switch (format) {
      case 'jpeg':
      case 'jpg':
        return image.jpeg({
          quality: config.quality.jpeg,
          progressive: config.progressive,
          mozjpeg: true, // Use mozjpeg encoder for better compression
        });

      case 'webp':
        return image.webp({
          quality: config.quality.webp,
          effort: 4, // Balance between speed and compression
          smartSubsample: true,
        });

      case 'avif':
        return image.avif({
          quality: config.quality.avif,
          effort: 4,
        });

      case 'png':
        return image.png({
          quality: config.quality.png,
          progressive: config.progressive,
          compressionLevel: 8,
          palette: true, // Use palette for smaller files when possible
        });

      case 'gif':
        return image.gif();

      default:
        // For unknown formats, convert to JPEG
        return image.jpeg({
          quality: config.quality.jpeg,
          progressive: config.progressive,
        });
    }
  }

  /**
   * Convert image to WebP format for web optimization
   */
  async toWebP(buffer: Buffer, quality?: number): Promise<ProcessedImage> {
    const image = sharp(buffer);
    const result = await image
      .webp({
        quality: quality || this.config.quality.webp,
        effort: 4,
        smartSubsample: true,
      })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: result.data,
      width: result.info.width,
      height: result.info.height,
      format: 'webp',
      size: result.data.length,
    };
  }

  /**
   * Convert image to AVIF format for maximum compression
   */
  async toAVIF(buffer: Buffer, quality?: number): Promise<ProcessedImage> {
    const image = sharp(buffer);
    const result = await image
      .avif({
        quality: quality || this.config.quality.avif,
        effort: 4,
      })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: result.data,
      width: result.info.width,
      height: result.info.height,
      format: 'avif',
      size: result.data.length,
    };
  }

  /**
   * Create a square thumbnail with center crop
   */
  async createThumbnail(buffer: Buffer, size: number = 150): Promise<ProcessedImage> {
    return this.resizeImage(buffer, {
      width: size,
      height: size,
      fit: 'cover',
      position: 'attention', // Smart crop focusing on the most interesting area
    });
  }

  /**
   * Process image for web delivery with multiple formats
   */
  async processForWeb(
    buffer: Buffer,
    options: {
      sizes?: ImageSize[];
      includeWebP?: boolean;
      includeAVIF?: boolean;
    } = {}
  ): Promise<{
    variants: Record<string, ProcessedImage>;
    metadata: ImageMetadata;
  }> {
    const { sizes = ['thumbnail', 'small', 'medium'], includeWebP = true, includeAVIF = false } =
      options;

    const metadata = await this.getMetadata(buffer);
    const variants: Record<string, ProcessedImage> = {};

    for (const size of sizes) {
      const sizeConfig = this.config.sizes[size];
      if (!sizeConfig) continue;

      // Original format (JPEG for photos)
      variants[size] = await this.resizeImage(buffer, sizeConfig, 'jpeg');

      // WebP variant
      if (includeWebP) {
        variants[`${size}_webp`] = await this.resizeImage(buffer, sizeConfig, 'webp');
      }

      // AVIF variant (best compression, but slower to encode)
      if (includeAVIF) {
        variants[`${size}_avif`] = await this.resizeImage(buffer, sizeConfig, 'avif');
      }
    }

    return { variants, metadata };
  }

  /**
   * Validate if buffer is a valid image
   */
  async isValidImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return !!(metadata.width && metadata.height && metadata.format);
    } catch {
      return false;
    }
  }

  /**
   * Get supported input formats
   */
  static getSupportedFormats(): string[] {
    return ['jpeg', 'jpg', 'png', 'gif', 'webp', 'avif', 'tiff', 'heif', 'heic', 'raw'];
  }

  /**
   * Calculate estimated file sizes for different formats
   */
  async estimateFileSizes(
    buffer: Buffer
  ): Promise<Record<OutputFormat, { size: number; savings: string }>> {
    const originalSize = buffer.length;

    const [jpeg, webp, avif, png] = await Promise.all([
      this.resizeImage(
        buffer,
        { width: 800, height: 800, fit: 'inside' },
        'jpeg'
      ),
      this.resizeImage(
        buffer,
        { width: 800, height: 800, fit: 'inside' },
        'webp'
      ),
      this.resizeImage(
        buffer,
        { width: 800, height: 800, fit: 'inside' },
        'avif'
      ),
      this.resizeImage(
        buffer,
        { width: 800, height: 800, fit: 'inside' },
        'png'
      ),
    ]);

    const calcSavings = (newSize: number): string => {
      const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
      return `${savings}%`;
    };

    return {
      jpeg: { size: jpeg.size, savings: calcSavings(jpeg.size) },
      webp: { size: webp.size, savings: calcSavings(webp.size) },
      avif: { size: avif.size, savings: calcSavings(avif.size) },
      png: { size: png.size, savings: calcSavings(png.size) },
      original: { size: originalSize, savings: '0%' },
    };
  }
}

// ==========================================
// Standalone Functions (for backward compatibility)
// ==========================================

const defaultProcessor = new ImageProcessor();

/**
 * Resize an image buffer to specified dimensions
 */
export async function resizeImage(
  buffer: Buffer,
  width: number,
  height: number,
  options: {
    fit?: keyof sharp.FitEnum;
    format?: OutputFormat;
    quality?: number;
  } = {}
): Promise<ProcessedImage> {
  const { fit = 'inside', format = 'original', quality } = options;

  const config: Partial<ImageProcessingConfig> = quality
    ? {
        quality: {
          jpeg: quality,
          webp: quality,
          avif: quality,
          png: quality,
        },
      }
    : {};

  return defaultProcessor.resizeImage(buffer, { width, height, fit }, format, {
    ...defaultProcessor['config'],
    ...config,
  } as ImageProcessingConfig);
}

/**
 * Create multiple image sizes from a single buffer
 */
export async function createImageVariants(
  buffer: Buffer,
  sizes: ImageSize[] = ['thumbnail', 'small', 'medium']
): Promise<ProcessedImageSet> {
  return defaultProcessor.processImage(buffer, { sizes });
}

/**
 * Optimize an image for web delivery
 */
export async function optimizeForWeb(
  buffer: Buffer,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    format?: OutputFormat;
    quality?: number;
  } = {}
): Promise<ProcessedImage> {
  const { maxWidth = 1920, maxHeight = 1080, format = 'webp', quality = 85 } = options;

  return defaultProcessor.resizeImage(
    buffer,
    { width: maxWidth, height: maxHeight, fit: 'inside' },
    format,
    {
      ...defaultProcessor['config'],
      quality: {
        jpeg: quality,
        webp: quality,
        avif: quality,
        png: quality,
      },
    } as ImageProcessingConfig
  );
}

/**
 * Create a thumbnail from an image buffer
 */
export async function createThumbnail(
  buffer: Buffer,
  size: number = 150
): Promise<ProcessedImage> {
  return defaultProcessor.createThumbnail(buffer, size);
}

/**
 * Convert an image to WebP format
 */
export async function convertToWebP(buffer: Buffer, quality?: number): Promise<ProcessedImage> {
  return defaultProcessor.toWebP(buffer, quality);
}

/**
 * Convert an image to AVIF format
 */
export async function convertToAVIF(buffer: Buffer, quality?: number): Promise<ProcessedImage> {
  return defaultProcessor.toAVIF(buffer, quality);
}

/**
 * Get metadata from an image buffer
 */
export async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  return defaultProcessor.getMetadata(buffer);
}

/**
 * Validate if a buffer contains a valid image
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  return defaultProcessor.isValidImage(buffer);
}

// Export the ImageProcessor class as default for advanced usage
export default ImageProcessor;
