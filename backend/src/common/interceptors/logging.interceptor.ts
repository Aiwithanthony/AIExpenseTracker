import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);

    this.logger.log(`[${requestId}] ${method} ${url} - ${ip} - ${userAgent}`);

    const now = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - now;
          this.logger.log(`[${requestId}] ${method} ${url} - ${responseTime}ms`);
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          // Don't log sensitive data
          this.logger.error(
            `[${requestId}] ${method} ${url} - ${responseTime}ms - ${error.status || 500} - ${error.message}`,
          );
        },
      }),
    );
  }
}

