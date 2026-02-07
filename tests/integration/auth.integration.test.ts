import { expect, test, describe, mock } from "bun:test";

const mockUser = { id: 1, email: "test@example.com" };

// Mocking must happen BEFORE imports
mock.module("../../src/db", () => ({
    query: mock(() => Promise.resolve({ rows: [], rowCount: 0 })),
    initDb: mock(() => Promise.resolve()),
}));

mock.module("../../src/utils/redis", () => ({
    storeRefreshToken: mock(() => Promise.resolve()),
    getStoredRefreshToken: mock(() => Promise.resolve("mocked-token")),
    removeRefreshToken: mock(() => Promise.resolve()),
}));

mock.module("../../src/models/user", () => ({
    createUser: mock(() => Promise.resolve(mockUser)),
    getUserByEmail: mock((email: string) => {
        if (email === "existing@example.com" || email === "test@example.com") {
            return Promise.resolve({ ...mockUser, password_hash: "hashed" });
        }
        return Promise.resolve(null);
    }),
}));

mock.module("jsonwebtoken", () => ({
    default: {
        verify: mock(() => ({ sub: 1, email: "test@example.com" })),
        sign: mock(() => "mocked-jwt-token"),
    },
    verify: mock(() => ({ sub: 1, email: "test@example.com" })),
    sign: mock(() => "mocked-jwt-token"),
}));

mock.module("bcrypt", () => ({
    default: {
        compare: mock(() => Promise.resolve(true)),
        hash: mock(() => Promise.resolve("hashed")),
    },
    compare: mock(() => Promise.resolve(true)),
    hash: mock(() => Promise.resolve("hashed")),
}));

import request from "supertest";
import { app } from "../../src/index";

describe("Auth Integration Tests", () => {
    describe("POST /auth/register", () => {
        test("should register a new user with valid data", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({
                    email: "new@example.com",
                    password: "password123"
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("accessToken");
            expect(response.body).toHaveProperty("refreshToken");
        });

        test("should return 400 for invalid email", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({
                    email: "invalid-email",
                    password: "password123"
                });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
        });

        test("should return 400 for short password", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({
                    email: "valid@example.com",
                    password: "short"
                });

            expect(response.status).toBe(400);
            expect(response.body.error.details).toContainEqual(
                expect.objectContaining({ path: "password" })
            );
        });
    });

    describe("POST /auth/login", () => {
        test("should return 411 for invalid credentials (user not found)", async () => {
            const response = await request(app)
                .post("/auth/login")
                .send({
                    email: "notfound@example.com",
                    password: "password123"
                });

            expect(response.status).toBe(411);
            expect(response.body.error.code).toBe("UNAUTHORIZED");
        });

        test("should login successfully with valid credentials", async () => {
            const response = await request(app)
                .post("/auth/login")
                .send({
                    email: "test@example.com",
                    password: "password123"
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("accessToken");
            expect(response.body).toHaveProperty("refreshToken");
        });
    });

    describe("GET /me", () => {
        test("should return user profile for authenticated user", async () => {
            const response = await request(app)
                .get("/me")
                .set("Authorization", "Bearer mocked-token");

            expect(response.status).toBe(200);
            expect(response.body.user).toHaveProperty("email", "test@example.com");
        });

        test("should return 411 when no token is provided", async () => {
            const response = await request(app)
                .get("/me");

            expect(response.status).toBe(411);
        });
    });

    describe("POST /auth/logout", () => {
        test("should logout successfully", async () => {
            const response = await request(app)
                .post("/auth/logout")
                .set("Authorization", "Bearer mocked-token");

            expect(response.status).toBe(204);
        });
    });
});
