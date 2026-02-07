import { expect, test, describe, mock } from "bun:test";

// 1. SET ENVIRONMENT VARIABLES
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-123";
process.env.REFRESH_SECRET = "test-refresh-secret-123";

// 2. MOCK ALL MODULES BEFORE ANY IMPORTS
mock.module("../../src/db", () => ({
    query: mock(() => Promise.resolve({ rows: [], rowCount: 0 })),
    initDb: mock(() => Promise.resolve()),
}));

mock.module("../../src/utils/redis", () => {
    let store: Record<string, string> = {};
    return {
        storeRefreshToken: mock((userId: number, token: string) => {
            store[userId.toString()] = token;
            return Promise.resolve();
        }),
        getStoredRefreshToken: mock((userId: number) => Promise.resolve(store[userId.toString()])),
        removeRefreshToken: mock((userId: number) => {
            delete store[userId.toString()];
            return Promise.resolve();
        }),
        closeRedis: mock(() => Promise.resolve()),
        getRedisCluster: mock(() => ({
            set: mock(() => Promise.resolve()),
            get: mock(() => Promise.resolve(null)),
            del: mock(() => Promise.resolve()),
        })),
    };
});

mock.module("../../src/models/user", () => {
    const users: any[] = [{ id: 1, email: "test@example.com", password_hash: "hashed" }];
    return {
        createUser: mock((email: string, passwordHash: string) => {
            const newUser = { id: users.length + 1, email, password_hash: passwordHash, created_at: new Date().toISOString() };
            users.push(newUser);
            return Promise.resolve(newUser);
        }),
        getUserByEmail: mock((email: string) => {
            const user = users.find(u => u.email === email);
            return Promise.resolve(user || null);
        }),
    };
});

mock.module("pino", () => ({
    __esModule: true,
    default: mock(() => ({
        info: mock(() => { }),
        error: mock(() => { }),
        debug: mock(() => { }),
        warn: mock(() => { }),
        child: mock(function (this: any) { return this; }),
    })),
}));

mock.module("bcrypt", () => ({
    default: {
        hash: mock(() => Promise.resolve("hashed")),
        compare: mock(() => Promise.resolve(true)),
    },
    hash: mock(() => Promise.resolve("hashed")),
    compare: mock(() => Promise.resolve(true)),
}));

// 3. NOW IMPORT APPLICATION CODE
import request from "supertest";
import { app } from "../../src/index";

describe("User Lifecycle E2E Flow", () => {
    let accessToken: string;
    let refreshToken: string;
    const userCerts = {
        email: "e2e@example.com",
        password: "password123"
    };

    test("Step 1: Register a new user", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send(userCerts);

        if (res.status !== 201) console.log("Step 1 Fail Body:", res.body);
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("accessToken");
        expect(res.body).toHaveProperty("refreshToken");
    });

    test("Step 2: Login with the new user", async () => {
        const res = await request(app)
            .post("/auth/login")
            .send(userCerts);

        if (res.status !== 200) console.log("Step 2 Fail Body:", res.body);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("accessToken");
        expect(res.body).toHaveProperty("refreshToken");
        accessToken = res.body.accessToken;
        refreshToken = res.body.refreshToken;
    });

    test("Step 3: Access protected profile route", async () => {
        const res = await request(app)
            .get("/me")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.user).toHaveProperty("email", userCerts.email);
    });

    test("Step 4: Rotate tokens using refresh token", async () => {
        const res = await request(app)
            .post("/auth/refresh")
            .send({ refreshToken });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("accessToken");
        expect(res.body).toHaveProperty("refreshToken");

        // Ensure old access token still works (if not expired) or new one works
        const newAccessToken = res.body.accessToken;
        const profileRes = await request(app)
            .get("/me")
            .set("Authorization", `Bearer ${newAccessToken}`);

        expect(profileRes.status).toBe(200);
    });

    test("Step 5: Logout", async () => {
        const res = await request(app)
            .post("/auth/logout")
            .set("Authorization", `Bearer ${accessToken}`); // Usually logout needs current session

        if (res.status !== 204) console.log("Step 5 Fail Body:", res.body);
        expect(res.status).toBe(204);
    });
});
