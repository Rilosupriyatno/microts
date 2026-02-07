import express from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../utils/errors";

const jwtSecret = process.env.JWT_SECRET || "dev-secret";

/**
 * Middleware to authenticate JWT token
 */
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
        (req as any).user = { id: payload.sub, email: payload.email };
        return next();
    } catch (e) {
        return next(new UnauthorizedError("Invalid or expired token"));
    }
}
