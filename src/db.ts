import { Pool, type QueryResult, type QueryConfig } from "pg";
import { createCircuitBreaker } from "./utils/circuitBreaker";
import { AppError, ErrorCode } from "./utils/errors";

const connectionString = process.env.DATABASE_URL || `postgresql://postgres:password@postgres:5432/microts`;

export const pool = new Pool({
  connectionString,
  statement_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || "10000", 10), // Default 10s
});

let dbReady = false;

export async function initDb(maxRetries = Number(process.env.DB_INIT_MAX_RETRIES) || 10, delayMs = Number(process.env.DB_INIT_DELAY_MS) || 1000) {
  // Retry with exponential backoff until DB is ready
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS "users" (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
        `);
        dbReady = true;
        return;
      } finally {
        client.release();
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
 * Protected query function using Circuit Breaker
 */
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
