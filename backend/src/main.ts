import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
    rawBody: true,
  });
  
  // Increase body size limit for base64 images (10MB)
  // NestJS uses express under the hood, so we can configure it directly
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Create uploads directories if they don't exist
  const receiptsDir = join(process.cwd(), 'uploads', 'receipts');
  const audioDir = join(process.cwd(), 'uploads', 'audio');
  if (!existsSync(receiptsDir)) {
    mkdirSync(receiptsDir, { recursive: true });
  }
  if (!existsSync(audioDir)) {
    mkdirSync(audioDir, { recursive: true });
  }

  // Create data directory for SQLite database
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Serve static files for uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });
  
  // Enable CORS for mobile app and admin dashboard
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:8081',
    process.env.ADMIN_DASHBOARD_URL || 'http://localhost:5173',
    // Allow Expo dev server origins (for mobile app development)
    /^https?:\/\/.*\.exp\.(go|dev|io)$/,
    /^exp:\/\/.*/,
  ];
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin matches allowed patterns
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return origin === allowed;
        }
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        // In development, log but allow (for easier debugging)
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️  CORS: Allowing origin in dev mode: ${origin}`);
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for mobile access
  await app.listen(port, host);
  console.log(`🚀 Backend server running on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  console.log(`📱 Accessible from network at: http://<your-ip>:${port}`);
}
bootstrap();
