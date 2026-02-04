import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { createUser, getUserByEmail } from "./models/user";
import { AppError, ConflictError, UnauthorizedError, ValidationError } from "./utils/errors";
import { generateTokenPair, verifyRefreshToken } from "./utils/auth";
import { removeRefreshToken, getStoredRefreshToken } from "./utils/redis";

const router = express.Router();

const jwtSecret = process.env.JWT_SECRET || "dev-secret";

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with email and password.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: user@example.com }
 *               password: { type: string, format: password, example: "password123" }
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Invalid email format").normalizeEmail(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array()[0]!.msg);
      }

      const { email, password } = req.body;
      // check existing
      const existing = await getUserByEmail(email);
      if (existing) {
        throw new ConflictError("Email already registered");
      }

      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);
      const user = await createUser(email, hash);

      const { accessToken, refreshToken } = await generateTokenPair({ sub: user.id, email: user.email });

      res.status(201).json({
        user: { id: user.id, email: user.email },
        accessToken,
        refreshToken
      });
    } catch (err) {
      next(err);
    }
  });

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticates a user and returns a JWT token pair.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: user@example.com }
 *               password: { type: string, format: password, example: "password123" }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Missing or invalid email").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array()[0]!.msg);
      }

      const { email, password } = req.body;
      const user = await getUserByEmail(email);
      if (!user) {
        throw new UnauthorizedError("Invalid credentials");
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        throw new UnauthorizedError("Invalid credentials");
      }

      const { accessToken, refreshToken } = await generateTokenPair({ sub: user.id, email: user.email });
      res.json({ accessToken, refreshToken });
    } catch (err) {
      next(err);
    }
  });

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh Access Token
 *     description: Exchange a valid Refresh Token for a new Access Token.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Token refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new ValidationError("Refresh token is required");
    }

    const payload = verifyRefreshToken(refreshToken);
    const stored = await getStoredRefreshToken(payload.sub);

    if (!stored || stored !== refreshToken) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Generate new pair (Token Rotation)
    const tokens = await generateTokenPair({ sub: payload.sub, email: payload.email });
    res.json(tokens);
  } catch (err) {
    next(new UnauthorizedError("Invalid refresh token"));
  }
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Revokes the user's current session by removing the refresh token.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Logged out successfully
 */
router.post("/logout", authenticate, async (req, res, next) => {
  try {
    const user = (req as any).user;
    await removeRefreshToken(user.id);
    res.status(204).send();
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

