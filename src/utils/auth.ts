import jwt from "jsonwebtoken";
import { storeRefreshToken } from "./redis";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "dev-refresh-secret";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REFRESH_TOKEN_EXPIRY_SECONDS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;

export interface TokenPayload {
    sub: number;
    email: string;
}

/**
 * Generates both Access and Refresh tokens
 */
export async function generateTokenPair(payload: TokenPayload) {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` });

    // Store refresh token in Redis associated with userId (payload.sub)
    await storeRefreshToken(payload.sub, refreshToken, REFRESH_TOKEN_EXPIRY_SECONDS);

    return { accessToken, refreshToken };
}

/**
 * Verifies Refresh Token
 */
export function verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, REFRESH_SECRET) as unknown as TokenPayload;
}
