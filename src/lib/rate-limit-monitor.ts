/**
 * Rate Limit Monitoring and Error Handling Utilities
 */

interface RateLimitInfo {
  service: string;
  statusCode: number;
  timestamp: Date;
  endpoint: string;
  message?: string;
}

type RateLimitLogInput = Omit<RateLimitInfo, 'timestamp'>;

const rateLimitLog: RateLimitInfo[] = [];
const MAX_LOG_ENTRIES = 100;

export function logRateLimitHit(info: RateLimitLogInput): void {
  console.warn(`[RateLimit] ${info.service}: ${info.statusCode} - ${info.endpoint}`);
  rateLimitLog.push({ ...info, timestamp: new Date() });

  if (rateLimitLog.length > MAX_LOG_ENTRIES) {
    rateLimitLog.splice(0, rateLimitLog.length - MAX_LOG_ENTRIES);
  }
}

export function handleApiError(error: any, context: { service: string; endpoint: string }) {
  const errorMessage = error?.message || String(error);
  const statusCode = error?.status || error?.statusCode || error?.response?.status;

  const isRateLimited =
    statusCode === 429 ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('rateLimitExceeded') ||
    errorMessage.includes('Too Many Requests') ||
    errorMessage.includes('quota exceeded');

  if (isRateLimited) {
    logRateLimitHit({
      service: context.service,
      statusCode: statusCode || 429,
      endpoint: context.endpoint,
      message: errorMessage,
    });

    return {
      isRateLimited: true,
      statusCode: statusCode || 429,
      message: `${context.service} rate limit exceeded. Please try again later.`,
    };
  }

  return { isRateLimited: false, statusCode, message: errorMessage };
}

export function createRateLimitedFetch(service: string) {
  let lastRequestTime = 0;
  const MIN_DELAY = 1000;

  return async (url: string, fetchOptions?: RequestInit) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_DELAY) {
      await new Promise(resolve => setTimeout(resolve, MIN_DELAY - timeSinceLastRequest));
    }

    try {
      const response = await fetch(url, fetchOptions);
      lastRequestTime = Date.now();

      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      return response;
    } catch (error) {
      return handleApiError(error, { service, endpoint: url });
    }
  };
}
