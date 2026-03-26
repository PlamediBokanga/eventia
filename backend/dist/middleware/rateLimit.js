"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSimpleRateLimiter = createSimpleRateLimiter;
function createSimpleRateLimiter(windowMs, maxHits) {
    const hits = new Map();
    return function checkRateLimit(key) {
        const now = Date.now();
        const previous = hits.get(key);
        if (!previous || previous.resetAt <= now) {
            hits.set(key, { count: 1, resetAt: now + windowMs });
            return { limited: false, remaining: maxHits - 1, retryAfterSec: 0 };
        }
        previous.count += 1;
        hits.set(key, previous);
        if (previous.count > maxHits) {
            return {
                limited: true,
                remaining: 0,
                retryAfterSec: Math.max(1, Math.ceil((previous.resetAt - now) / 1000))
            };
        }
        return {
            limited: false,
            remaining: Math.max(0, maxHits - previous.count),
            retryAfterSec: 0
        };
    };
}
