import { expect, test, describe, mock, beforeAll } from "bun:test";
import request from "supertest";
import { app } from "./index";

// Mock Database and Redis
mock.module("./db", () => ({
    query: mock(() => Promise.resolve({ rows: [], rowCount: 0 })),
    initDb: mock(() => Promise.resolve()),
}));

mock.module("./utils/redis", () => ({
    storeRefreshToken: mock(() => Promise.resolve()),
    getStoredRefreshToken: mock(() => Promise.resolve("mocked-token")),
    removeRefreshToken: mock(() => Promise.resolve()),
}));

// Mock Models
mock.module("./models/user", () => ({
    createUser: mock(() => Promise.resolve({ id: 1, email: "test@example.com" })),
    getUserByEmail: mock((email: string) => {
        if (email === "existing@example.com") {
            return Promise.resolve({ id: 2, email: "existing@example.com", password_hash: "hashed" });
        }
        return Promise.resolve(null);
    }),
}));

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
    });
});
