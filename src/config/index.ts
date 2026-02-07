/**
 * Centralized configuration for the microservice
 * Uses Zod-validated environment variables for type safety
 */

import { validateEnv, type EnvConfig } from "./env.schema";

// Validate environment on first import
let _env: EnvConfig | null = null;

function getEnv(): EnvConfig {
    if (!_env) {
        _env = validateEnv();
    }
    return _env;
}

// Lazy-loaded validated config
export const config = {
    get env() {
        return getEnv();
    },

    // Application
    get port() {
        return getEnv().PORT;
    },
    get nodeEnv() {
        return getEnv().NODE_ENV;
    },
    get logLevel() {
        return getEnv().LOG_LEVEL;
    },

    // JWT
    jwt: {
        get secret() {
            return getEnv().JWT_SECRET;
        },
        get refreshSecret() {
            return getEnv().JWT_REFRESH_SECRET;
        },
        get accessExpiresIn() {
            return getEnv().JWT_ACCESS_EXPIRES;
        },
        get refreshExpiresIn() {
            return getEnv().JWT_REFRESH_EXPIRES;
        },
    },

    // Database
    db: {
        get host() {
            return getEnv().DB_HOST;
        },
        get port() {
            return getEnv().DB_PORT;
        },
        get user() {
            return getEnv().DB_USER;
        },
        get password() {
            return getEnv().DB_PASSWORD;
        },
        get database() {
            return getEnv().DB_NAME;
        },
        get maxConnections() {
            return getEnv().DB_POOL_SIZE;
        },
        get queryTimeout() {
            return getEnv().DB_QUERY_TIMEOUT;
        },
        get connectionUrl() {
            return getEnv().DATABASE_URL;
        },
    },

    // Redis
    redis: {
        get host() {
            return getEnv().REDIS_HOST;
        },
        get port() {
            return getEnv().REDIS_PORT;
        },
        get password() {
            return getEnv().REDIS_PASSWORD;
        },
        get clusterMode() {
            return getEnv().REDIS_CLUSTER === "true";
        },
        get clusterNodes() {
            return getEnv().REDIS_CLUSTER_NODES?.split(",") || [];
        },
    },

    // Rate Limiting
    rateLimit: {
        get windowSeconds() {
            return getEnv().RATE_LIMIT_WINDOW;
        },
        get maxRequests() {
            return getEnv().RATE_LIMIT_MAX;
        },
    },

    // CORS
    cors: {
        get allowedOrigins() {
            return getEnv().ALLOWED_ORIGINS.split(",");
        },
    },

    // Request
    request: {
        get timeout() {
            return getEnv().REQUEST_TIMEOUT;
        },
        bodySizeLimit: "10kb",
    },

    // Alerting
    alerting: {
        get enabled() {
            return getEnv().ALERTING_ENABLED === "true";
        },
        get webhookUrl() {
            return getEnv().ALERT_WEBHOOK_URL;
        },
    },
};

export default config;
