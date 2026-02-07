import bcrypt from "bcrypt";
import { createUser, getUserByEmail } from "../models/user";
import { generateTokenPair, verifyRefreshToken } from "../utils/auth";
import { storeRefreshToken, getStoredRefreshToken, removeRefreshToken } from "../utils/redis";
import { ConflictError, UnauthorizedError } from "../utils/errors";

const SALT_ROUNDS = 10;

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface UserResponse {
    id: number;
    email: string;
}

export async function registerUser(email: string, password: string): Promise<{ user: UserResponse; tokens: TokenPair }> {
    // Check if user already exists
    const existing = await getUserByEmail(email);
    if (existing) {
        throw new ConflictError("Email already registered");
    }

    // Hash password and create user
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser(email, hash);

    // Generate token pair
    const tokens = await generateTokenPair({ sub: user.id, email: user.email });

    return {
        user: { id: user.id, email: user.email },
        tokens,
    };
}

export async function loginUser(email: string, password: string): Promise<TokenPair> {
    const user = await getUserByEmail(email);
    if (!user) {
        throw new UnauthorizedError("Invalid credentials");
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        throw new UnauthorizedError("Invalid credentials");
    }

    return generateTokenPair({ sub: user.id, email: user.email });
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = verifyRefreshToken(refreshToken);
    const stored = await getStoredRefreshToken(payload.sub);

    if (!stored || stored !== refreshToken) {
        throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Token Rotation - generate new pair
    return generateTokenPair({ sub: payload.sub, email: payload.email });
}

export async function logoutUser(userId: number): Promise<void> {
    await removeRefreshToken(userId);
}
