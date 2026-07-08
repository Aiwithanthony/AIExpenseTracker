import { ConfigService } from '@nestjs/config';

const INSECURE_PATTERNS = ['change-in-production', 'your-super-secret', 'secret'];

/**
 * Resolves the JWT signing secret, failing fast at boot if it is missing or an
 * obvious placeholder. Never falls back to a hardcoded value — a weak/known
 * secret lets anyone forge access tokens for any user.
 */
export function getJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');

  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'JWT_SECRET is missing or too short. Set a strong random JWT_SECRET (>= 32 chars) in the environment, e.g. `node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"`.',
    );
  }

  if (INSECURE_PATTERNS.some((p) => secret.includes(p))) {
    throw new Error(
      'JWT_SECRET looks like a placeholder value. Replace it with a strong random secret before starting the server.',
    );
  }

  return secret;
}
