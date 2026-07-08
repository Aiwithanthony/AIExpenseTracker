import { HttpException, ServiceUnavailableException } from '@nestjs/common';

/**
 * Translates errors from the LLM/AI provider (OpenAI, etc.) into user-friendly
 * HTTP exceptions, so the app shows a clear message instead of a generic
 * "Internal server error". Pass through anything that's already an HttpException.
 */
export function toLlmHttpError(error: any): HttpException {
  if (error instanceof HttpException) {
    return error;
  }

  const status = error?.status ?? error?.response?.status;

  if (status === 429) {
    return new ServiceUnavailableException(
      'AI features are temporarily unavailable — the AI provider quota has been exceeded. Please check the OpenAI billing/credits and try again.',
    );
  }
  if (status === 401 || status === 403) {
    return new ServiceUnavailableException(
      'AI features are not available right now (the AI provider rejected the request). Please try again later.',
    );
  }
  if (typeof error?.message === 'string' && /no speech detected/i.test(error.message)) {
    return new ServiceUnavailableException(
      'No speech was detected in your recording. Please try again and speak clearly.',
    );
  }

  return new ServiceUnavailableException('AI processing failed. Please try again.');
}
