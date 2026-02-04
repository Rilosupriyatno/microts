import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createUser, getUserByEmail } from "./models/user";
import { AppError, ConflictError, UnauthorizedError, ValidationError } from "./utils/errors";

const router = express.Router();

const jwtSecret = process.env.JWT_SECRET || "dev-secret";

router.post("/register", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // basic validation
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new ValidationError("Invalid email format");
    }
    if (!password || String(password).length < 8) {
      throw new ValidationError("Password must be at least 8 characters");
    }

    // check existing
    const existing = await getUserByEmail(email);
    if (existing) {
      throw new ConflictError("Email already registered");
    }

    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    const user = await createUser(email, hash);

    const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: "24h" }) as string | undefined;
    if (!token) {
      throw new AppError("Token generation failed", 500);
    }
    res.status(201).json({ user: { id: user.id, email: user.email }, token });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ValidationError("Missing email or password");
    }

    const user = await getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: "24h" }) as string | undefined;
    if (!token) {
      throw new AppError("Token generation failed", 500);
    }
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

export function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) {
    return next(new UnauthorizedError("Missing Authorization header"));
  }

  const parts = auth.split(" ");
  if (parts.length !== 2) {
    return next(new UnauthorizedError("Invalid Authorization format"));
  }

  const token = parts[1];
  if (!token) {
    return next(new UnauthorizedError("Invalid token"));
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    // attach user id
    (req as any).user = { id: payload.sub, email: payload.email };
    return next();
  } catch (e) {
    return next(new UnauthorizedError("Invalid or expired token"));
  }
}

export default router;

