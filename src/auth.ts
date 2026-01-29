import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createUser, getUserByEmail } from "./models/user";
import { pool } from "./db";

const router = express.Router();

const jwtSecret = process.env.JWT_SECRET || "dev-secret";

router.post("/register", async (req, res) => {
    const { email, password } = req.body;
    // basic validation
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // check existing
    const existing = await getUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    const user = await createUser(email, hash);

    const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: "24h" }) as string | undefined;
    if (!token) {
      return res.status(500).json({ error: "Token generation failed" });
    }
    res.status(201).json({ user: { id: user.id, email: user.email }, token });
  }
);

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing credentials" });
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: "24h" }) as string | undefined;
    if (!token) {
      return res.status(500).json({ error: "Token generation failed" });
    }
    res.json({ token });
  }
);

export function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Missing Authorization" });
  const parts = auth.split(" ");
  if (parts.length !== 2) return res.status(401).json({ error: "Invalid Authorization" });
  const token = parts[1];
  if (!token) return res.status(401).json({ error: "Invalid Authorization" });
  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    // attach user id
    (req as any).user = { id: payload.sub, email: payload.email };
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export default router;
