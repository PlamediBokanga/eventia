type Hit = {
  count: number;
  resetAt: number;
};

export function createSimpleRateLimiter(windowMs: number, maxHits: number) {
  const hits = new Map<string, Hit>();

  return function checkRateLimit(key: string) {
    const now = Date.now();
    const previous = hits.get(key);

    if (!previous || previous.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return { limited: false as const, remaining: maxHits - 1, retryAfterSec: 0 };
    }

    previous.count += 1;
    hits.set(key, previous);

    if (previous.count > maxHits) {
      return {
        limited: true as const,
        remaining: 0,
        retryAfterSec: Math.max(1, Math.ceil((previous.resetAt - now) / 1000))
      };
    }

    return {
      limited: false as const,
      remaining: Math.max(0, maxHits - previous.count),
      retryAfterSec: 0
    };
  };
}

