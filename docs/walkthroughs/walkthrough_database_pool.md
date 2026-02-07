# Walkthrough: Database Connection Pool Management

Enhanced the PostgreSQL connection pool with configurable settings, monitoring, and graceful shutdown.

---

## Changes Made

### 1. Configurable Pool Settings (`src/db.ts`)

| Setting | Source | Default |
|---------|--------|---------|
| `max` | `DB_POOL_SIZE` | 10 |
| `statement_timeout` | `DB_QUERY_TIMEOUT` | 10000ms |
| `idleTimeoutMillis` | hardcoded | 30000ms |
| `connectionTimeoutMillis` | hardcoded | 5000ms |

### 2. Pool Monitoring

New Prometheus metrics added:

| Metric | Description |
|--------|-------------|
| `pg_pool_total_connections` | Total connections in pool |
| `pg_pool_idle_connections` | Idle connections available |
| `pg_pool_waiting_count` | Clients waiting for connection |

Metrics updated every 5 seconds and exposed via `/metrics`.

### 3. Graceful Shutdown

New `closePool(timeoutMs)` function:
- Waits for active queries to complete
- Drains connections gracefully
- Timeout fallback (default 10s)

Updated `SIGTERM` and `SIGINT` handlers in `index.ts` to call `closePool()`.

---

## Usage

### Check Pool Stats
```bash
curl http://localhost:3000/metrics | grep pg_pool
```

Output:
```
pg_pool_total_connections 5
pg_pool_idle_connections 4
pg_pool_waiting_count 0
```

### Get Pool Stats Programmatically
```typescript
import { getPoolStats } from "./db";

const stats = getPoolStats();
// { total: 5, idle: 4, waiting: 0, max: 10 }
```

---

## Verification

All tests passed: **28/28** ✅
