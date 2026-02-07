# Walkthrough: Config Management with Zod Validation

This document describes the environment variable validation with Zod and the optional Dependency Injection container.

---

## Environment Variable Validation

### Files Created
- `src/config/env.schema.ts` - Zod schema for all environment variables

### Features
- Type-safe environment variable access
- Automatic validation on startup
- Helpful error messages for missing/invalid config
- Default values for development

### Validated Variables

| Category | Variables |
|----------|-----------|
| Application | `NODE_ENV`, `PORT`, `LOG_LEVEL` |
| JWT | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES` |
| Database | `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE` |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_CLUSTER` |
| Rate Limiting | `RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX` |
| Alerting | `ALERTING_ENABLED`, `ALERT_WEBHOOK_URL` |

### Error Example

If you have an invalid config (e.g., JWT_SECRET too short), you'll see:

```
❌ Environment validation failed:

  • JWT_SECRET: JWT_SECRET must be at least 16 characters

💡 Check your .env file or environment variables.
```

---

## Dependency Injection Container

### File Created
- `src/container.ts` - Simple DI container with singleton pattern

### Usage

```typescript
import { container, Services } from "./container";

// Register a service
container.register(Services.CONFIG, () => config);

// Get a service
const cfg = container.get(Services.CONFIG);
```

### Available Service Names
- `Services.CONFIG`
- `Services.DATABASE`
- `Services.REDIS`
- `Services.AUTH_SERVICE`
- `Services.ALERT_SERVICE`

---

## Benefits

1. **Fail Fast** - Invalid config stops the app at startup, not runtime
2. **Type Safety** - TypeScript knows the exact type of each env var
3. **Documentation** - Schema serves as documentation for all config options
4. **Testing** - Container can be reset for isolated tests
