import { query } from "../db";

export type User = {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
};

export async function createUser(email: string, passwordHash: string) {
  const res = await query(
    `INSERT INTO "users" (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at`,
    [email, passwordHash]
  );
  return res.rows[0];
}

export async function getUserByEmail(email: string) {
  const res = await query(`SELECT id, email, password_hash, created_at FROM "users" WHERE email = $1`, [
    email,
  ]);
  return res.rows[0] as User | undefined;
}

export async function getUserById(id: number) {
  const res = await query(`SELECT id, email, created_at FROM "users" WHERE id = $1`, [id]);
  return res.rows[0] as User | undefined;
}
