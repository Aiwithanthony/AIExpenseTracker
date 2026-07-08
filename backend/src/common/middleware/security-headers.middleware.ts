import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Applies security-related HTTP response headers on every request.
 *
 * CSP is intentionally strict for a JSON REST API:
 *  - No scripts or frames should ever be served from the API itself
 *  - Google OAuth and Apple ID are whitelisted for their discovery endpoints
 *
 * The admin dashboard (if it has its own origin) should configure its own CSP
 * separately via its web server / framework.
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Prevent MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Deny framing completely
    res.setHeader('X-Frame-Options', 'DENY');

    // Legacy XSS filter (belt-and-suspenders for older browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Force HTTPS for 1 year, include subdomains, allow preload
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );

    // Content Security Policy
    // This API only serves JSON — all directives are set to 'none' except
    // connect-src (so AJAX clients work) and img-src (for upload serving).
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'none'",
        "connect-src 'self' https://accounts.google.com https://appleid.apple.com https://www.googleapis.com",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "style-src 'self' 'unsafe-inline'",    // retained for any served HTML (admin)
        "script-src 'self'",                   // no inline scripts, no CDN scripts
        "form-action 'self'",
        "frame-ancestors 'none'",              // equivalent to X-Frame-Options DENY
        "base-uri 'self'",
        "upgrade-insecure-requests",
      ].join('; '),
    );

    // Referrer policy — don't leak full URL to third parties
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy — disable browser features the API never needs
    res.setHeader(
      'Permissions-Policy',
      [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
      ].join(', '),
    );

    // Prevent cross-domain Flash/PDF access (belt-and-suspenders)
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Remove the Express "X-Powered-By" header to reduce fingerprinting
    res.removeHeader('X-Powered-By');

    next();
  }
}
