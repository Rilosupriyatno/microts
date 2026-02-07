import { z } from "zod";

/**
 * Helper to create a number field from string env var
 */
const numericString = (defaultVal: number) =>
    z.string().regex(/^\d+$/).default(String(defaultVal)).transform(Number);

/**
 * Environment variable schema with Zod validation
 * Provides type-safe access and helpful error messages for missing/invalid config
 */
export const envSchema = z.object({
    // Application
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: numericString(3000),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

    // JWT
    JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters").default("dev-secret-change-me"),
    JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters").default("dev-refresh-secret"),
    JWT_ACCESS_EXPIRES: z.string().default("15m"),
    JWT_REFRESH_EXPIRES: z.string().default("7d"),

    // Database
    DATABASE_URL: z.string().url().optional(),
    DB_HOST: z.string().default("localhost"),
    DB_PORT: numericString(5432),
    DB_USER: z.string().default("postgres"),
    DB_PASSWORD: z.string().default("postgres"),
    DB_NAME: z.string().default("microts"),
    DB_POOL_SIZE: numericString(10),
    DB_QUERY_TIMEOUT: numericString(10000),
    DB_INIT_MAX_RETRIES: numericString(10),
    DB_INIT_DELAY_MS: numericString(1000),

    // Redis
    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: numericString(6379),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_CLUSTER: z.enum(["true", "false"]).default("false"),
    REDIS_CLUSTER_NODES: z.string().optional(),

    // Rate Limiting
    RATE_LIMIT_WINDOW: numericString(60),
    RATE_LIMIT_MAX: numericString(60),

    // CORS
    ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

    // Request
    REQUEST_TIMEOUT: numericString(30000),

    // Alerting
    ALERTING_ENABLED: z.enum(["true", "false"]).default("false"),
    ALERT_WEBHOOK_URL: z.string().url().optional(),

    // OpenTelemetry
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
    OTEL_SERVICE_NAME: z.string().default("microts"),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate environment variables and return typed config
 * Throws detailed error if validation fails
 */
export function validateEnv(): EnvConfig {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error("\n❌ Environment validation failed:\n");

        for (const issue of result.error.issues) {
            const path = issue.path.join(".");
            console.error(`  • ${path}: ${issue.message}`);
        }

        console.error("\n💡 Check your .env file or environment variables.\n");
        process.exit(1);
    }

    return result.data;
}
