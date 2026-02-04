import Redis, { type Cluster } from "ioredis";

// Redis Cluster nodes
const clusterNodes = [
    { host: "redis-node-1", port: 6379 },
    { host: "redis-node-2", port: 6380 },
    { host: "redis-node-3", port: 6381 },
    { host: "redis-node-4", port: 6382 },
    { host: "redis-node-5", port: 6383 },
    { host: "redis-node-6", port: 6384 },
];

let redisCluster: Cluster | null = null;

/**
 * Lazy-init Redis Cluster connection
 */
export function getRedisCluster(): Cluster {
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

        // Try to connect in background
        redisCluster.connect().catch((err: Error) => {
            console.warn("[RedisCluster] Initial connection failed (will retry):", err.message);
        });
    }
    return redisCluster;
}

/**
 * Token Storage Helpers
 */
const REFRESH_TOKEN_PREFIX = "refresh_token:";

export async function storeRefreshToken(userId: number, token: string, expirySeconds: number) {
    const cluster = getRedisCluster();
    await cluster.set(`${REFRESH_TOKEN_PREFIX}${userId}`, token, "EX", expirySeconds);
}

export async function getStoredRefreshToken(userId: number): Promise<string | null> {
    const cluster = getRedisCluster();
    return cluster.get(`${REFRESH_TOKEN_PREFIX}${userId}`);
}

export async function removeRefreshToken(userId: number) {
    const cluster = getRedisCluster();
    await cluster.del(`${REFRESH_TOKEN_PREFIX}${userId}`);
}
