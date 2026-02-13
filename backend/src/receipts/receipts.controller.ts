import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ReceiptsService } from './receipts.service';
import { FileUploadService } from './file-upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

export class ProcessReceiptDto {
  @IsString()
  ocrText: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  imageBase64?: string;
}

export class ExtractTextDto {
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  imageBase64?: string;
}

@Controller('receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          const uploadsDir = join(process.cwd(), 'uploads', 'receipts');
          if (!existsSync(uploadsDir)) {
            mkdirSync(uploadsDir, { recursive: true });
          }
          cb(null, uploadsDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadReceipt(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file by magic bytes (more secure than just mimetype)
    const isValid = this.fileUploadService.validateFileByMagicBytes(
      file.path,
      file.mimetype,
    );
    if (!isValid) {
      // Delete the uploaded file if validation fails
      const fs = require('fs');
      fs.unlinkSync(file.path);
      throw new BadRequestException('Invalid file type. File content does not match expected image format.');
    }

    const imageUrl = this.fileUploadService.getFileUrl(file.filename);
    return { imageUrl, filename: file.filename };
  }

  @Post('process')
  async processReceipt(
    @CurrentUser() user: User,
    @Body() dto: ProcessReceiptDto,
  ) {
    return this.receiptsService.processReceipt(
      user.id,
      dto.ocrText,
      dto.imageUrl || dto.imageBase64 || '',
      user.currency,
    );
  }

  @Post('extract-text')
  async extractText(@Body() dto: ExtractTextDto) {
    const imageInput = dto.imageBase64 || dto.imageUrl;
    if (!imageInput) {
      throw new BadRequestException('Either imageUrl or imageBase64 is required');
    }
    const text = await this.receiptsService.extractTextFromImage(imageInput);
    return { text };
  }

  /**
   * Combined endpoint: Upload image, extract text, and process receipt in one request
   * This reduces network round trips and improves performance
   */
  @Post('process-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          const uploadsDir = join(process.cwd(), 'uploads', 'receipts');
          if (!existsSync(uploadsDir)) {
            mkdirSync(uploadsDir, { recursive: true });
          }
          cb(null, uploadsDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async processImage(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file by magic bytes (more secure than just mimetype)
    const isValid = this.fileUploadService.validateFileByMagicBytes(
      file.path,
      file.mimetype,
    );
    if (!isValid) {
      // Delete the uploaded file if validation fails
      const fs = require('fs');
      fs.unlinkSync(file.path);
      throw new BadRequestException('Invalid file type. File content does not match expected image format.');
    }

    try {
      const imageUrl = this.fileUploadService.getFileUrl(file.filename);
      
      // Extract text from image using OCR
      const ocrText = await this.receiptsService.extractTextFromImage(imageUrl);
      
      if (!ocrText || ocrText.trim().length === 0) {
        // Clean up uploaded file if OCR fails
        const fs = require('fs');
        fs.unlinkSync(file.path);
        throw new BadRequestException('Could not extract text from receipt. Please try again with a clearer image.');
      }
      
      // Process receipt with extracted text
      const expense = await this.receiptsService.processReceipt(
        user.id,
        ocrText,
        imageUrl,
        user.currency,
      );
      
      return expense;
    } catch (error) {
      // Clean up uploaded file on error
      const fs = require('fs');
      if (existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }
}

