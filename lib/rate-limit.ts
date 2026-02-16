/**
 * In-memory rate limiter for serverless API routes.
 *
 * For a portfolio / low-traffic deployment this is sufficient.
 * For high-traffic production, swap for Upstash Redis (@upstash/ratelimit).
 *
 * Tracks requests per IP with a sliding window.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Garbage-collect expired entries every 5 minutes
const GC_INTERVAL = 5 * 60 * 1000;
let lastGC = Date.now();

function gc() {
  const now = Date.now();
  if (now - lastGC < GC_INTERVAL) return;
  lastGC = now;
  store.forEach((entry, key) => {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  });
}

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Check rate limit for a given identifier (typically IP address).
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  gc();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const entry = store.get(identifier);

  // First request or window expired — reset
  if (!entry || now > entry.resetAt) {
    store.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: now + windowMs,
      limit: config.limit,
    };
  }

  // Within window — increment
  entry.count += 1;

  if (entry.count > config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      limit: config.limit,
    };
  }

  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
    limit: config.limit,
  };
}

/**
 * Extract client IP from request headers.
 * Supports Vercel, Cloudflare, and standard proxy headers.
 */
export function getClientIp(request: Request): string {
  const headers = new Headers(request.headers);

  return (
    headers.get('x-real-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
