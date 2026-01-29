import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || `postgresql://postgres:password@postgres:5432/microts`;

export const pool = new Pool({
  connectionString,
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

export default pool;
