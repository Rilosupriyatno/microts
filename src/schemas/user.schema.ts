import { z } from "zod";

/**
 * Schema for User Registration
 */
export const registerSchema = {
    body: z.object({
        email: z
            .string()
            .email("Invalid email format")
            .trim()
            .toLowerCase(),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters long"),
    }),
};

/**
 * Schema for User Login
 */
export const loginSchema = {
    body: z.object({
        email: z
            .string()
            .email("Invalid email format")
            .trim()
            .toLowerCase(),
        password: z
            .string()
            .min(1, "Password is required"),
    }),
};

/**
 * Schema for Token Refresh
 */
export const refreshSchema = {
    body: z.object({
        refreshToken: z
            .string()
            .min(1, "Refresh token is required"),
    }),
};
