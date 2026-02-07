import { describe, expect, it, mock } from "bun:test";
import { createCircuitBreaker } from "../../src/utils/circuitBreaker";

describe("CircuitBreaker Utility", () => {
    it("should create a circuit breaker for a function", async () => {
        const mockAction = mock(async () => "success");
        const breaker = createCircuitBreaker(mockAction, { name: "test-breaker" });

        const result = await breaker.fire();
        expect(result).toBe("success");
        expect(mockAction).toHaveBeenCalled();
    });

    it("should execute fallback when action fails items", async () => {
        const mockAction = mock(async (): Promise<string> => {
            throw new Error("action failed");
        });
        const breaker = createCircuitBreaker(mockAction, { name: "fail-breaker" });

        breaker.fallback(() => "fallback-result");

        const result = await breaker.fire();
        expect(result).toBe("fallback-result");
    });

    it("should use default options if none provided", () => {
        const mockAction = mock(async () => "ok");
        const breaker = createCircuitBreaker(mockAction);

        // Accessing private options via cast for testing purposes
        const options = (breaker as any).options;
        expect(options.timeout).toBe(3000);
        expect(options.errorThresholdPercentage).toBe(50);
        expect(options.resetTimeout).toBe(30000);
    });
});
