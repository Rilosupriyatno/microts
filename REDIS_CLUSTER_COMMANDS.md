# Quick Reference - Redis Cluster Commands

## Start/Stop Cluster

```bash
# Start all containers (cluster auto-initializes)
podman-compose -f docker/compose/dev.yml up -d

# Stop all containers
podman-compose -f docker/compose/dev.yml down

# Remove volumes (clean start)
podman-compose -f docker/compose/dev.yml down -v
```

## Check Cluster Status

```bash
# Full cluster info
podman exec microts-redis-1 redis-cli CLUSTER INFO

# List all nodes
podman exec microts-redis-1 redis-cli CLUSTER NODES

# Verify all slots covered
podman exec microts-redis-1 redis-cli CLUSTER SLOTS

# Health check (ping)
podman exec microts-redis-1 redis-cli PING
```

## View Logs

```bash
# Specific Redis node
podman logs microts-redis-1
podman logs microts-redis-2
...

# Cluster initialization
podman logs microts-redis-init

# App logs
podman logs microts-dev

# Real-time monitoring
podman logs -f microts-redis-1
```

## Test Rate Limiting

```bash
# Single request (should pass if under limit)
curl http://localhost:3000/health

# Rapid burst (will hit limit at 31st request)
for i in {1..35}; do
  curl http://localhost:3000/health
done

# Shows which requests were blocked
for i in {1..35}; do
  if curl -s http://localhost:3000/health | grep -q "Too many"; then
    echo "Request $i: BLOCKED"
  else
    echo "Request $i: ALLOWED"
  fi
done
```

## Test Authentication

```bash
# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123456"}'

# Login (get token)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123456"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Use token (protected route)
curl -X GET http://localhost:3000/me \
  -H "Authorization: Bearer $TOKEN"
```

## Monitor Replication

```bash
# Check replica status on any node
podman exec microts-redis-1 redis-cli ROLE

# Output: ["slave", "master_node_id", offset]
# Or: ["master", replica_count, [replica_info...]]

# Get replication info
podman exec microts-redis-1 redis-cli INFO replication
```

## Check Data Storage

```bash
# How many keys stored
podman exec microts-redis-1 redis-cli DBSIZE

# List all keys (careful - if many, will be slow)
podman exec microts-redis-1 redis-cli KEYS "*"

# Get all rate limit keys
podman exec microts-redis-1 redis-cli KEYS "rate:*"

# Get value of specific key
podman exec microts-redis-1 redis-cli GET "rate:127.0.0.1"
```

## Advanced Cluster Operations

```bash
# Get detailed node info
podman exec microts-redis-1 redis-cli CLUSTER NODES | head -20

# Check for cluster errors
podman exec microts-redis-1 redis-cli CLUSTER INFO | grep -i error

# Monitor all commands (live view - Ctrl+C to stop)
podman exec microts-redis-1 redis-cli MONITOR

# Benchmark performance
podman exec microts-redis-1 redis-benchmark -t ping,set,get -n 10000

# Check specific node stats
podman exec microts-redis-1 redis-cli INFO stats
```

## Troubleshooting

```bash
# If cluster is unhealthy, check logs
podman logs microts-redis-1

# Force restart a node
podman restart microts-redis-1

# Verify all nodes are healthy
podman ps | grep redis

# Check if ports are accessible
netstat -tuln | grep 637    # Shows all Redis ports

# Test connection to specific node
redis-cli -h localhost -p 6379 PING
redis-cli -h localhost -p 6380 PING
redis-cli -h localhost -p 6381 PING
```

## Container Details

| Container | Image | Port | Status |
|-----------|-------|------|--------|
| microts-redis-1 | redis:7-alpine | 6379 | Master |
| microts-redis-2 | redis:7-alpine | 6380 | Master |
| microts-redis-3 | redis:7-alpine | 6381 | Master |
| microts-redis-4 | redis:7-alpine | 6382 | Replica |
| microts-redis-5 | redis:7-alpine | 6383 | Replica |
| microts-redis-6 | redis:7-alpine | 6384 | Replica |
| microts-redis-init | redis:7-alpine | N/A | Init only |

## Rate Limit Configuration

- **Window:** 60 seconds
- **Max Requests:** 30 per window per IP
- **Storage:** Redis Cluster (auto-distributed)
- **Behavior:** Fail-open (allow if Redis unavailable)

## Performance Expectations

- **Latency:** < 5ms for most operations
- **Throughput:** ~50,000 ops/sec per master
- **Availability:** 99.9% (3 masters + 3 replicas)
- **Failover Time:** < 5 seconds (automatic)

## Security Notes (Development)

⚠️ **Current:** No authentication or encryption (dev only)

✅ **For Production:**
- Add `--requirepass` for authentication
- Enable TLS/SSL: `--tls-port`, `--tls-cert-file`, etc.
- Use firewall rules (don't expose Redis to public)
- Enable audit logging
- Regular backups of AOF files

See REDIS_CLUSTER.md for detailed production checklist.
