import { describe, expect, it, mock } from "bun:test";

// Mock implementation for Redis Cluster
const mockRedis = {
    set: mock(async () => "OK"),
    get: mock(async () => "token"),
    del: mock(async () => 1),
    on: mock(() => { }),
    connect: mock(async () => { }),
};

// Properly mock the Cluster constructor BEFORE importing the code that uses it
mock.module("ioredis", () => {
    return {
        default: {
            Cluster: function () {
                return mockRedis;
            },
        },
    };
});

import { storeRefreshToken, getStoredRefreshToken, removeRefreshToken } from "./redis";

describe("Redis Utility", () => {
    it("should store a refresh token", async () => {
        await storeRefreshToken(1, "test-token", 3600);
        expect(mockRedis.set).toHaveBeenCalledWith(
            "refresh_token:1",
            "test-token",
            "EX",
            3600
        );
    });

    it("should retrieve a refresh token", async () => {
        const token = await getStoredRefreshToken(1);
        expect(token).toBe("token");
        expect(mockRedis.get).toHaveBeenCalledWith("refresh_token:1");
    });

    it("should remove a refresh token", async () => {
        await removeRefreshToken(1);
        expect(mockRedis.del).toHaveBeenCalledWith("refresh_token:1");
    });
});
