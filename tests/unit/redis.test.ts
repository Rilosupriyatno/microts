import { describe, expect, it, mock, beforeEach } from "bun:test";

// Create mock functions that we can track
const mockSet = mock(async () => "OK");
const mockGet = mock(async () => "token");
const mockDel = mock(async () => 1);

// Mock the entire redis module instead of ioredis
mock.module("../../src/utils/redis", () => ({
    storeRefreshToken: async (userId: number, token: string, expirySeconds: number) => {
        await mockSet(`refresh_token:${userId}`, token, "EX", expirySeconds);
    },
    getStoredRefreshToken: async (userId: number) => {
        return mockGet(`refresh_token:${userId}`);
    },
    removeRefreshToken: async (userId: number) => {
        await mockDel(`refresh_token:${userId}`);
    },
    getRedisCluster: () => ({
        set: mockSet,
        get: mockGet,
        del: mockDel,
    }),
}));

import { storeRefreshToken, getStoredRefreshToken, removeRefreshToken } from "../../src/utils/redis";

describe("Redis Utility", () => {
    beforeEach(() => {
        mockSet.mockClear();
        mockGet.mockClear();
        mockDel.mockClear();
    });

    it("should store a refresh token", async () => {
        await storeRefreshToken(1, "test-token", 3600);
        expect(mockSet).toHaveBeenCalledWith(
            "refresh_token:1",
            "test-token",
            "EX",
            3600
        );
    });

    it("should retrieve a refresh token", async () => {
        const token = await getStoredRefreshToken(1);
        expect(token).toBe("token");
        expect(mockGet).toHaveBeenCalledWith("refresh_token:1");
    });

    it("should remove a refresh token", async () => {
        await removeRefreshToken(1);
        expect(mockDel).toHaveBeenCalledWith("refresh_token:1");
    });
});
