import { Pool, type QueryResult, type QueryConfig } from "pg";
import client from "prom-client";
import { createCircuitBreaker } from "./utils/circuitBreaker";
import { AppError, ErrorCode } from "./utils/errors";
import { config } from "./config";

// Build connection string from config
const connectionString = config.db.connectionUrl ||
  `postgresql://${config.db.user}:${config.db.password}@${config.db.host}:${config.db.port}/${config.db.database}`;

/**
 * PostgreSQL connection pool with configurable settings
 */
export const pool = new Pool({
  connectionString,
  max: config.db.maxConnections,                    // Maximum pool size
  idleTimeoutMillis: 30000,                         // Close idle clients after 30s
  connectionTimeoutMillis: 5000,                    // Fail if connection takes > 5s
  statement_timeout: config.db.queryTimeout,        // Query timeout
  allowExitOnIdle: false,                           // Keep pool alive
});

let dbReady = false;

// ============= Pool Monitoring (Prometheus Metrics) =============

const poolTotalConnections = new client.Gauge({
  name: "pg_pool_total_connections",
  help: "Total number of connections in the pool",
});

const poolIdleConnections = new client.Gauge({
  name: "pg_pool_idle_connections",
  help: "Number of idle connections in the pool",
});

const poolWaitingCount = new client.Gauge({
  name: "pg_pool_waiting_count",
  help: "Number of clients waiting for a connection",
});

// Update pool metrics every 5 seconds
const metricsInterval = setInterval(() => {
  poolTotalConnections.set(pool.totalCount);
  poolIdleConnections.set(pool.idleCount);
  poolWaitingCount.set(pool.waitingCount);
}, 5000);

// ============= Database Initialization =============

export async function initDb(
  maxRetries = config.env.DB_INIT_MAX_RETRIES,
  delayMs = config.env.DB_INIT_DELAY_MS
) {
  // Retry with exponential backoff until DB is ready
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const dbClient = await pool.connect();
      try {
        await dbClient.query(`
          CREATE TABLE IF NOT EXISTS "users" (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
        `);
        dbReady = true;
        console.log(`[DB] Connected successfully (pool size: ${config.db.maxConnections})`);
        return;
      } finally {
        dbClient.release();
      }
    } catch (e: any) {
      const waitMs = delayMs * Math.pow(2, attempt - 1); // exponential backoff
      const errMsg = e && e.message ? e.message : String(e);
      if (attempt < maxRetries) {
        console.log(`[DB] Init attempt ${attempt}/${maxRetries} failed: ${errMsg}. Retrying in ${waitMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      } else {
        console.error(`[DB] Init failed after ${maxRetries} attempts: ${errMsg}`);
        console.error(`[DB] Check DATABASE_URL, network/connectivity, and that the Postgres container/service is healthy.`);
        throw e;
      }
    }
  }
}

export function isDatabaseReady() {
  return dbReady;
}

/**
 * Get pool statistics for health checks
 */
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    max: config.db.maxConnections,
  };
}

// ============= Graceful Shutdown =============

let isShuttingDown = false;

/**
 * Gracefully drain and close the connection pool
 * Waits for active queries to complete before closing
 */
export async function closePool(timeoutMs = 10000): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("[DB] Starting graceful shutdown...");

  // Stop metrics collection
  clearInterval(metricsInterval);

  // Wait for active connections to finish (with timeout)
  const startTime = Date.now();

  while (pool.totalCount > pool.idleCount && Date.now() - startTime < timeoutMs) {
    console.log(`[DB] Waiting for ${pool.totalCount - pool.idleCount} active connections to finish...`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (pool.totalCount > pool.idleCount) {
    console.warn(`[DB] Timeout reached, forcing close with ${pool.totalCount - pool.idleCount} active connections`);
  }

  await pool.end();
  dbReady = false;
  console.log("[DB] Connection pool closed");
}

// ============= Circuit Breaker Protected Query =============

const dbBreaker = createCircuitBreaker(
  async (queryTextOrConfig: string | QueryConfig, values?: any[]): Promise<QueryResult> => {
    return pool.query(queryTextOrConfig, values);
  },
  {
    name: "postgresql",
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  }
);

// Fallback behavior when circuit is open
dbBreaker.fallback(() => {
  throw new AppError(
    "Database service is currently unavailable. Please try again later.",
    503,
    ErrorCode.SERVICE_UNAVAILABLE
  );
});

export const query = (queryText: string, values?: any[]) => dbBreaker.fire(queryText, values);

export default pool;
