import type { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "../utils/errors";
import { createCircuitBreaker } from "../utils/circuitBreaker";
import { getRedisCluster } from "../utils/redis";

/**
 * redisBreaker protects the rate limiting logic.
 * Fallback: Fail Open (allow traffic even if Redis is down)
 */
const redisBreaker = createCircuitBreaker(
  async (key: string, windowSeconds: number): Promise<{ current: number }> => {
    const cluster = getRedisCluster();
    const current = await cluster.incr(key);
    if (current === 1) {
      await cluster.expire(key, windowSeconds);
    }
    return { current };
  },
  {
    name: "redis-cluster",
    timeout: 1000, // Strict timeout for rate limiting
    errorThresholdPercentage: 50,
    resetTimeout: 10000, // Faster try-again for Redis
  }
);

// simple fixed-window rate limiter per IP
export function rateLimiter(options?: { windowSeconds?: number; max?: number }) {
  const windowSeconds = options?.windowSeconds || 60;
  const max = options?.max || 30;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `rate:${req.ip}`;

    try {
      const { current } = await redisBreaker.fire(key, windowSeconds);

      if (current > max) {
        res.setHeader("Retry-After", String(windowSeconds));
        return next(
          new AppError("Too many requests", 429, ErrorCode.RATE_LIMIT_EXCEEDED, {
            retryAfter: windowSeconds,
            limit: max,
            current,
          })
        );
      }
      return next();
    } catch (err) {
      // Fallback behavior if breaker fires or anything else fails
      // Log and allow request (Fail Open)
      console.warn("[RateLimiter] redis-cluster circuit open or failing. Failing open.");
      return next();
    }
  };
}

export default getRedisCluster;

