import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Globally strips HTML tags from all string values in request bodies.
 * This is a defence-in-depth measure against stored XSS — particularly
 * relevant for any user-supplied text that may be rendered in a web UI
 * (admin dashboard, email notifications, etc.).
 *
 * Does NOT affect numeric, boolean, or non-body parameters.
 */
@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitize(req.body);
    }
    return next.handle();
  }

  private sanitize(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.sanitize(v));
    }
    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(value as object)) {
        result[key] = this.sanitize((value as Record<string, unknown>)[key]);
      }
      return result;
    }
    return value;
  }

  /**
   * Remove HTML tags and null bytes from a string.
   * Intentionally does NOT HTML-encode entities — the API returns JSON,
   * so encoding is the responsibility of the rendering layer.
   */
  private sanitizeString(value: string): string {
    return value
      .replace(/<[^>]*>/g, '')   // strip HTML tags
      .replace(/\0/g, '');       // strip null bytes
  }
}
