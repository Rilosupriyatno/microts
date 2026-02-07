/**
 * Centralized configuration for the microservice
 * All environment variables and settings are managed here
 */

export const config = {
    // Application
    port: parseInt(process.env.PORT || "3000", 10),
    env: process.env.NODE_ENV || "development",
    logLevel: process.env.LOG_LEVEL || "info",

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || "dev-secret",
        refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
    },

    // Database
    db: {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432", 10),
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_NAME || "microts",
        maxConnections: parseInt(process.env.DB_POOL_SIZE || "10", 10),
    },

    // Redis
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        password: process.env.REDIS_PASSWORD,
        clusterMode: process.env.REDIS_CLUSTER === "true",
        clusterNodes: process.env.REDIS_CLUSTER_NODES?.split(",") || [],
    },

    // Rate Limiting
    rateLimit: {
        windowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW || "60", 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX || "60", 10),
    },

    // CORS
    cors: {
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
    },

    // Request
    request: {
        timeout: process.env.REQUEST_TIMEOUT || "30000",
        bodySizeLimit: "10kb",
    },
} as const;

export default config;
