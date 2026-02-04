import type { Request, Response, NextFunction } from "express";
import Redis, { type Cluster } from "ioredis";
import { AppError, ErrorCode } from "../utils/errors";

// Redis Cluster nodes - configuration for all nodes
const clusterNodes = [
  { host: "redis-node-1", port: 6379 },
  { host: "redis-node-2", port: 6380 },
  { host: "redis-node-3", port: 6381 },
  { host: "redis-node-4", port: 6382 },
  { host: "redis-node-5", port: 6383 },
  { host: "redis-node-6", port: 6384 },
];

let redisCluster: Cluster | null = null;

// Lazy-init Redis Cluster connection (don't block startup)
function getRedisCluster() {
  if (!redisCluster) {
    redisCluster = new Redis.Cluster(clusterNodes, {
      clusterRetryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: false,
      enableOfflineQueue: true,
      lazyConnect: true,
    });

    redisCluster.on("error", (err: Error) => {
      console.warn("[RedisCluster] Connection error:", err.message);
    });

    redisCluster.on("connect", () => {
      console.log("[RedisCluster] Connected to cluster");
    });

    redisCluster.on("ready", () => {
      console.log("[RedisCluster] Ready and cluster slots mapping complete");
    });

    redisCluster.on("reconnecting", () => {
      console.log("[RedisCluster] Attempting to reconnect...");
    });

    // Try to connect in background (non-blocking)
    redisCluster.connect().catch((err: Error) => {
      console.warn("[RedisCluster] Initial connection failed (will retry):", err.message);
    });
  }
  return redisCluster;
}

// simple fixed-window rate limiter per IP
export function rateLimiter(options?: { windowSeconds?: number; max?: number }) {
  const windowSeconds = options?.windowSeconds || 60;
  const max = options?.max || 30;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cluster = getRedisCluster();
      const key = `rate:${req.ip}`;
      const current = await cluster.incr(key);
      if (current === 1) {
        await cluster.expire(key, windowSeconds);
      }
      if (current > max) {
        res.setHeader("Retry-After", String(windowSeconds));
        return next(new AppError("Too many requests", 429, ErrorCode.RATE_LIMIT_EXCEEDED, {
          retryAfter: windowSeconds,
          limit: max,
          current
        }));
      }
      return next();
    } catch (err) {
      // fail open - if Redis Cluster isn't available, allow the request
      console.debug("[RateLimiter] Redis Cluster unavailable, allowing request:", (err as any).message);
      return next();
    }
  };
}

export default getRedisCluster;

