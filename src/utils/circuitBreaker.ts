import CircuitBreaker from "opossum";
import pino from "pino";

const logger = pino();

export interface CircuitBreakerOptions {
    timeout?: number; // If our function takes longer than this, consider it a failure. Default 3000ms.
    errorThresholdPercentage?: number; // When 50% of requests fail, open the circuit. Default 50.
    resetTimeout?: number; // After 30 seconds, try again. Default 30000ms.
    name?: string;
}

/**
 * Creates a standard Circuit Breaker wrapper for a function.
 */
export function createCircuitBreaker<T, Args extends any[]>(
    action: (...args: Args) => Promise<T>,
    options: CircuitBreakerOptions = {}
): CircuitBreaker<Args, T> {
    const breakerOptions = {
        timeout: options.timeout || 3000,
        errorThresholdPercentage: options.errorThresholdPercentage || 50,
        resetTimeout: options.resetTimeout || 30000,
    };

    const breaker = new CircuitBreaker(action, breakerOptions);

    const circuitName = options.name || "unnamed-circuit";

    breaker.on("open", () => {
        logger.warn(`[CircuitBreaker] Circuit opened for ${circuitName}`);
    });

    breaker.on("halfOpen", () => {
        logger.info(`[CircuitBreaker] Circuit half-open for ${circuitName}`);
    });

    breaker.on("close", () => {
        logger.info(`[CircuitBreaker] Circuit closed for ${circuitName}`);
    });

    breaker.on("fallback", (result) => {
        logger.warn(`[CircuitBreaker] Fallback executed for ${circuitName}`);
    });

    return breaker;
}
