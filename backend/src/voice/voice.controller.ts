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
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

export class ProcessVoiceDto {
  @IsString()
  transcript: string;
}

export class TranscribeAudioDto {
  @IsString()
  @IsOptional()
  audioBase64?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;
}

@Controller('voice')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('transcribe')
  async transcribeAudio(
    @CurrentUser() user: User,
    @Body() dto: TranscribeAudioDto,
  ) {
    if (!dto.audioBase64) {
      throw new BadRequestException('audioBase64 is required');
    }

    const transcript = await this.voiceService.transcribeAudioFromBase64(
      dto.audioBase64,
      dto.mimeType || 'audio/m4a',
    );

    return { transcript };
  }

  @Post('transcribe-file')
  @UseInterceptors(FileInterceptor('audio', {
    storage: require('multer').diskStorage({
      destination: (req: any, file: any, cb: any) => {
        const path = require('path');
        const fs = require('fs');
        const uploadsDir = path.join(process.cwd(), 'uploads', 'audio');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
      },
      filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = require('path').extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req: any, file: any, cb: any) => {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed'));
      }
    },
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB (Whisper limit)
    },
  }))
  async transcribeAudioFile(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No audio file uploaded');
    }

    const transcript = await this.voiceService.transcribeAudio(file.path);

    // Clean up the file after transcription
    const fs = require('fs');
    fs.unlinkSync(file.path);

    return { transcript };
  }

  @Post('process')
  async processVoice(
    @CurrentUser() user: User,
    @Body() dto: ProcessVoiceDto,
  ) {
    return this.voiceService.processVoiceMessage(
      user.id,
      dto.transcript,
      user.currency,
    );
  }

  @Post('process-file')
  @UseInterceptors(FileInterceptor('audio', {
    storage: require('multer').diskStorage({
      destination: (req: any, file: any, cb: any) => {
        const path = require('path');
        const fs = require('fs');
        const uploadsDir = path.join(process.cwd(), 'uploads', 'audio');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
      },
      filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = require('path').extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req: any, file: any, cb: any) => {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed'));
      }
    },
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB (Whisper limit)
    },
  }))
  async processVoiceFile(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No audio file uploaded');
    }

    // Transcribe and process in one go
    const expenses = await this.voiceService.transcribeAndProcessAudio(
      user.id,
      file.path,
      user.currency,
    );

    // Clean up the file
    const fs = require('fs');
    fs.unlinkSync(file.path);

    return { expenses };
  }
}

