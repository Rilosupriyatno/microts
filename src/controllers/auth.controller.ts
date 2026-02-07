import type { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { UnauthorizedError } from "../utils/errors";

/**
 * Register a new user
 */
export async function register(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password } = req.body;
        const { user, tokens } = await authService.registerUser(email, password);

        res.status(201).json({
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Login user
 */
export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password } = req.body;
        const tokens = await authService.loginUser(email, password);
        res.json(tokens);
    } catch (err) {
        next(err);
    }
}

/**
 * Refresh access token
 */
export async function refresh(req: Request, res: Response, next: NextFunction) {
    try {
        const { refreshToken } = req.body;
        const tokens = await authService.refreshTokens(refreshToken);
        res.json(tokens);
    } catch (err) {
        next(new UnauthorizedError("Invalid refresh token"));
    }
}

/**
 * Logout user
 */
export async function logout(req: Request, res: Response, next: NextFunction) {
    try {
        const user = (req as any).user;
        await authService.logoutUser(user.id);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}
