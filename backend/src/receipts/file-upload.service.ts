import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as multer from 'multer';
import { extname } from 'path';
import { readFileSync } from 'fs';

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  // Allowed image MIME types
  private readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  // Magic bytes for image validation (first few bytes of file)
  private readonly MAGIC_BYTES: Record<string, string[]> = {
    'image/jpeg': ['FFD8FF'],
    'image/png': ['89504E47'],
    'image/gif': ['47494638'],
    'image/webp': ['52494646'], // RIFF (WebP starts with RIFF)
  };
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  constructor(private configService: ConfigService) {}

  /**
   * Validate file by checking magic bytes (more secure than just mimetype)
   */
  private validateFileType(file: Express.Multer.File): boolean {
    try {
      // Read first few bytes to check magic bytes
      const buffer = readFileSync(file.path);
      const hex = buffer.slice(0, 4).toString('hex').toUpperCase();

      // Check if magic bytes match expected image types
      for (const [mimeType, magicBytes] of Object.entries(this.MAGIC_BYTES)) {
        if (magicBytes.some((mb) => hex.startsWith(mb))) {
          // Verify mimetype matches
          return file.mimetype === mimeType;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Error validating file type', error);
      return false;
    }
  }

  /**
   * Configure multer for file uploads
   */
  getMulterConfig() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        // In production, use cloud storage (S3, Cloudinary, etc.)
        // For now, using local storage
        cb(null, './uploads/receipts');
      },
      filename: (req, file, cb) => {
        // Generate random filename (never use user-provided names)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        // Use extension from validated mimetype, not original filename
        const ext = this.getExtensionFromMimeType(file.mimetype);
        cb(null, `${uniqueSuffix}${ext}`);
      },
    });

    const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      // First check mimetype
      if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(new BadRequestException('File type not allowed. Only JPEG, PNG, GIF, and WebP images are accepted.'));
        return;
      }

      // Note: Magic bytes validation happens after file is saved
      // For now, we validate mimetype. Full magic byte validation requires
      // reading the file after upload, which we can do in the controller
      cb(null, true);
    };

    return {
      storage,
      fileFilter,
      limits: {
        fileSize: this.MAX_FILE_SIZE,
      },
    };
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    return extensions[mimeType] || '.jpg';
  }

  /**
   * Validate uploaded file by magic bytes
   */
  validateFileByMagicBytes(filePath: string, expectedMimeType: string): boolean {
    try {
      const buffer = readFileSync(filePath);
      const hex = buffer.slice(0, 4).toString('hex').toUpperCase();
      const magicBytes = this.MAGIC_BYTES[expectedMimeType];

      if (!magicBytes) {
        return false;
      }

      return magicBytes.some((mb) => hex.startsWith(mb));
    } catch (error) {
      this.logger.error('Error validating file by magic bytes', error);
      return false;
    }
  }

  /**
   * Get file URL (in production, return cloud storage URL)
   */
  getFileUrl(filename: string): string {
    // In production, return cloud storage URL
    // For now, return local URL
    const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
    return `${baseUrl}/uploads/receipts/${filename}`;
  }
}

