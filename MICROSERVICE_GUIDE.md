# Microservice Best Practices Guide

## 1. Project Structure

### ✅ Mengapa Struktur Folder?
```
src/           → Source code terisolasi dari config files
docker/        → Container config terpusat
docker/compose → Orchestration configs terpisah per environment
```

**Alasan:**
- **Clarity**: Mudah dimengerti apa itu source, infrastructure, config
- **Scalability**: Saat project berkembang, mudah tambah services
- **Maintenance**: Lebih mudah untuk troubleshoot dan update

---

## 2. Express.js Framework

### ✅ Kenapa Express?
- Lightweight & minimal
- Banyak middleware ecosystem
- Production-ready
- Perfect untuk microservice

### Struktur Code yang Baik:
```typescript
// src/index.ts
import express from "express";

const app = express();

// Middleware
app.use(express.json());

// Routes
app.get("/health", handler);

// Error handling
app.use(errorHandler);

// Startup
server.listen(PORT);
```

**Best Practices:**
- ✅ Middleware di awal
- ✅ Routes di tengah
- ✅ Error handler di akhir (catch-all)
- ✅ Graceful shutdown handling

---

## 3. Health Check Endpoints

### ✅ Kenapa Penting?
Kubernetes, Docker, orchestrators memerlukan:

#### `/health` - Liveness Probe
```json
{
  "status": "ok",
  "timestamp": "2026-01-30T18:29:42.818Z",
  "environment": "development"
}
```
- **Tujuan**: Cek apakah service masih hidup
- **Frequensi**: Setiap 10-30 detik
- **Aksi Gagal**: Restart container jika terus gagal

#### `/ready` - Readiness Probe
```json
{
  "ready": true,
  "timestamp": "2026-01-30T18:29:42.818Z"
}
```
- **Tujuan**: Cek apakah service siap menerima traffic
- **Kapan**: Sebelum load balancer routing request
- **Aksi Gagal**: Traffic dialihkan ke instance lain

### Real World Example:
```yaml
# Kubernetes manifest
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## 4. Environment Variables

### ✅ Kenapa?
Code harus flexible untuk berbagai environment:
- Development (debug enabled, verbose logs)
- Staging (testing before production)
- Production (optimized, security hardened)

### Pattern:
```typescript
// src/index.ts
const PORT = parseInt(process.env.PORT || "3000", 10);
const ENV = process.env.NODE_ENV || "development";
const DEBUG = process.env.DEBUG === "true";

if (DEBUG) console.log("Debug mode enabled");
```

### `.env` file (untuk local development):
```env
NODE_ENV=development
PORT=3000
DEBUG=true
LOG_LEVEL=debug
```

---

## 5. Docker Best Practices

### ✅ Development Dockerfile (`Dockerfile.dev`)
```dockerfile
FROM oven/bun:1-alpine
RUN bun install        # Tidak frozen (flexible)
CMD ["bun", "run", "dev"]  # Watch mode untuk hot reload
```

**Alasan:**
- ✅ Volume mounting untuk live code changes
- ✅ Faster iteration cycle
- ✅ Close to production environment

### ✅ Production Dockerfile (`Dockerfile.prod`)
```dockerfile
# Multi-stage build
FROM ... AS builder
RUN bun install --frozen-lockfile  # Locked dependencies
RUN bun build ...                   # Compile TypeScript

FROM ...
COPY --from=builder /app/dist .     # Only built artifacts
USER nodejs                         # Non-root user
CMD ["bun", "run", "start"]
```

**Alasan:**
- ✅ Multi-stage: Smaller final image (no build tools)
- ✅ Frozen lockfile: Reproducible builds
- ✅ Non-root user: Security (dapat't run as root)
- ✅ Optimized: Hanya production files yang di-include

### Image Size Comparison:
```
Development: ~200MB (includes build tools)
Production:  ~50MB  (optimized)
```

---

## 6. Port Management

### ✅ Kenapa Port 3000?
```
3000   → Development default (Node.js convention)
8080   → Common alternative
8000   → Django/Python convention
```

**Best Practice:** Gunakan environment variable:
```bash
PORT=3000 bun run dev
PORT=8080 podman run -e PORT=8080 microts:latest
```

---

## 7. Volume Mounting (Development)

### ✅ Kenapa?
```yaml
volumes:
  - ../../:/app:delegated      # Source code (hot reload)
  - /app/node_modules          # Exclude node_modules
```

**Alasan:**
- ✅ `/app:/app` → Code changes langsung ter-reflect
- ✅ `/app/node_modules` → Prevent overwrite dari container
- `:delegated` → macOS optimization (faster I/O)

---

## 8. Error Handling

### ✅ Global Error Handler (Middleware)
```typescript
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: ENV === "development" ? err.message : undefined
  });
});
```

**Alasan:**
- ✅ Catch unhandled errors
- ✅ Consistent error format
- ✅ Hide sensitive info in production

---

## 9. Graceful Shutdown

### ✅ Kenapa?
```typescript
process.on("SIGTERM", () => {
  console.log("Shutting down gracefully...");
  server.close(() => process.exit(0));
});
```

**Skenario:**
- Kubernetes/Docker mengirim SIGTERM sebelum kill
- Service punya waktu untuk:
  - Finish in-flight requests
  - Close database connections
  - Clean up resources

**Tanpa graceful shutdown:**
- ❌ Requests terpotong di tengah
- ❌ Data corruption
- ❌ Connection leaks

---

## 10. TypeScript Benefits

### ✅ Kenapa TypeScript?
```typescript
// Type safety
const PORT: number = parseInt(process.env.PORT || "3000", 10);

// IDE autocomplete
app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "ok" });  // Type checked!
});
```

**Alasan:**
- ✅ Catch errors at compile time, bukan runtime
- ✅ Better IDE support (autocomplete)
- ✅ Self-documenting code
- ✅ Refactoring confidence

---

## 11. Package Management

### ✅ `package.json` Scripts
```json
{
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build src/index.ts",
    "start": "bun run dist/index.js",
    "type-check": "tsc --noEmit"
  }
}
```

**Alasan:**
- ✅ Consistent commands across team
- ✅ Easy to update build process
- ✅ Documentation via scripts

---

## 12. Logging Best Practices

### ❌ Avoid:
```typescript
console.log("Debug info"); // Hard to search, no timestamp
```

### ✅ Better:
```typescript
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
};

logger.info("Server started");
logger.error("Connection failed");
```

**Production:** Gunakan logging library seperti `winston`, `pino`, atau `bunyan`

---

## 13. JSON API Responses

### ✅ Standard Format:
```json
{
  "status": "ok",
  "data": { ... },
  "error": null,
  "timestamp": "2026-01-30T18:29:42.818Z"
}
```

**Error Response:**
```json
{
  "status": "error",
  "error": "Not Found",
  "message": "Resource dengan ID 123 tidak ditemukan",
  "timestamp": "2026-01-30T18:29:42.818Z"
}
```

---

## 14. Security Considerations

### ✅ Implemented:
- Non-root user di production
- Environment variable untuk secrets
- Error message tidak expose details (production)
- Input validation (dapat ditambah later)

### Untuk Ditambah Nanti:
- Authentication (JWT tokens)
- Authorization (role-based access)
- Rate limiting
- CORS configuration
- HTTPS/TLS
- SQL injection prevention (jika ada database)

---

## 15. Monitoring & Observability

### Metrics yang Penting:
```
- Request count & latency
- Error rate
- Memory usage
- CPU usage
- Container restarts
```

### Tools:
- Prometheus: Metrics collection
- Grafana: Visualization
- ELK Stack: Log aggregation
- Datadog: All-in-one monitoring

---

## 16. Development Workflow

### 1. Local Development
```bash
bun install
bun run dev
# Automatic reload saat code change
```

### 2. Container Development
```bash
podman-compose -f docker/compose/dev.yml up -d
# Run dalam container, mirip dengan production
```

### 3. Build & Test
```bash
bun run build
bun run type-check
```

### 4. Production Deploy
```bash
podman-compose -f docker/compose/prod.yml up -d
```

---

## 17. Next Steps untuk Project Anda

### Phase 1 (Current) ✅
- ✅ Basic Express server
- ✅ Health checks
- ✅ Docker setup

### Phase 2 (Soon)
- [ ] Database connection (PostgreSQL/MongoDB)
- [ ] API routes logic
- [ ] Request validation
- [ ] Logging library

### Phase 3 (Later)
- [ ] Authentication (JWT/OAuth)
- [ ] Unit tests
- [ ] Integration tests
- [ ] CI/CD pipeline

### Phase 4 (Production)
- [ ] Monitoring & alerts
- [ ] Load testing
- [ ] Security audit
- [ ] Performance optimization

---

## 18. Microservice Communication

Saat nanti ada multiple services:

### Inter-Service Communication:
```
Service A → Service B (REST HTTP)
Service A → Message Queue (Async)
```

### API Gateway Pattern:
```
Client → API Gateway → Service A
                    → Service B
                    → Service C
```

### Service Discovery:
```
Service Registry (Consul, Eureka)
Services register themselves
Others discover via registry
```

---

## Quick Reference

| Aspect | Development | Production |
|--------|-------------|------------|
| Image | Large, includes tools | Small, optimized |
| Start Command | `bun run dev` | `bun run start` |
| Logs | Verbose, debug | Minimal, structured |
| Ports | Exposed for dev | Behind load balancer |
| User | Root (dev convenience) | Non-root (security) |
| Health Checks | Disabled | Enabled |
| Error Details | Full stacktrace | Generic message |
| Restart Policy | unless-stopped | always |

---

## Learning Resources

- **Express.js**: https://expressjs.com
- **Docker Best Practices**: https://docs.docker.com/develop/dev-best-practices/
- **12 Factor App**: https://12factor.net
- **Microservices Patterns**: https://microservices.io
- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices

---

Sekarang Anda punya solid foundation untuk microservice! 🚀
