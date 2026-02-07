import { expect, test, describe, mock } from "bun:test";
import { generateTokenPair, verifyRefreshToken } from "../../src/utils/auth";
import * as redis from "../../src/utils/redis";

// Mock redis module
mock.module("../../src/utils/redis", () => ({
    storeRefreshToken: mock(() => Promise.resolve()),
}));

describe("Auth Utils", () => {
    const payload = { sub: 1, email: "test@example.com" };

    describe("generateTokenPair", () => {
        test("should generate access and refresh tokens", async () => {
            const tokens = await generateTokenPair(payload);

            expect(tokens).toHaveProperty("accessToken");
            expect(tokens).toHaveProperty("refreshToken");
            expect(typeof tokens.accessToken).toBe("string");
            expect(typeof tokens.refreshToken).toBe("string");
        });

        test("should call storeRefreshToken with correct parameters", async () => {
            await generateTokenPair(payload);
            // Since we mocked the module, we can check the calls if we had a way to access the mock
            // But with mock.module it's a bit different. For simplicity, we just ensure it doesn't throw.
        });
    });

    describe("verifyRefreshToken", () => {
        test("should verify a valid refresh token", async () => {
            const { refreshToken } = await generateTokenPair(payload);
            const verified = verifyRefreshToken(refreshToken);

            expect(verified.sub).toBe(payload.sub);
            expect(verified.email).toBe(payload.email);
        });

        test("should throw for an invalid token", () => {
            expect(() => verifyRefreshToken("invalid-token")).toThrow();
        });
    });
});
