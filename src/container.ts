/**
 * Simple Dependency Injection Container
 * Provides a lightweight way to manage service dependencies
 */

type Factory<T> = () => T;

class Container {
    private instances = new Map<string, unknown>();
    private factories = new Map<string, Factory<unknown>>();

    /**
     * Register a factory function for a service
     */
    register<T>(name: string, factory: Factory<T>): void {
        this.factories.set(name, factory);
    }

    /**
     * Get or create a singleton instance of a service
     */
    get<T>(name: string): T {
        // Return cached instance if exists
        if (this.instances.has(name)) {
            return this.instances.get(name) as T;
        }

        // Create new instance from factory
        const factory = this.factories.get(name);
        if (!factory) {
            throw new Error(`Service '${name}' is not registered`);
        }

        const instance = factory() as T;
        this.instances.set(name, instance);
        return instance;
    }

    /**
     * Check if a service is registered
     */
    has(name: string): boolean {
        return this.factories.has(name);
    }

    /**
     * Clear all instances (useful for testing)
     */
    clear(): void {
        this.instances.clear();
    }

    /**
     * Reset entire container (useful for testing)
     */
    reset(): void {
        this.instances.clear();
        this.factories.clear();
    }
}

// Global container instance
export const container = new Container();

// Service name constants for type safety
export const Services = {
    CONFIG: "config",
    DATABASE: "database",
    REDIS: "redis",
    AUTH_SERVICE: "authService",
    ALERT_SERVICE: "alertService",
} as const;

export type ServiceName = (typeof Services)[keyof typeof Services];

export default container;
