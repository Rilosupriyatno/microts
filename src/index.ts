// IMPORTANT: Tracing must be initialized BEFORE any other imports
import { initTracing } from "./tracing";
if (process.env.NODE_ENV !== "test") {
  initTracing();
}

import express from "express";
import { Server } from "http";
import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import requestIdMiddleware from "./middleware/requestId";
import correlationIdMiddleware, { getCorrelationId } from "./middleware/correlationId";
import { metricsMiddleware, metricsHandler } from "./middleware/metrics";
import authRouter from "./routes/auth.routes";
import alertRouter from "./routes/alert.routes";
import statusRouter from "./routes/status.routes";
import { authenticate } from "./middleware/auth";
import { rateLimiter } from "./middleware/rateLimiter";
import { initDb, isDatabaseReady, query } from "./db";
import timeout from "connect-timeout";
import helmet from "helmet";
import cors from "cors";
import errorHandler from "./middleware/errorHandler";
import { NotFoundError } from "./utils/errors";
import swaggerRouter from "./middleware/swagger";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        ignore: "pid,hostname",
        singleLine: false,
      },
    },
  }),
});

const app = express();
let server: Server | null = null;
const PORT = parseInt(process.env.PORT || "3000", 10);
const ENV = process.env.NODE_ENV || "development";

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["http://localhost:3000"],
    credentials: true,
  })
);

// Middleware
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(timeout(process.env.REQUEST_TIMEOUT || "30000"));

// Request ID and Correlation ID: generate IDs and attach to logs
app.use(requestIdMiddleware);
app.use(correlationIdMiddleware);
app.use(
  pinoHttp({
    logger,
    genReqId: (req: any) => (req.headers["x-request-id"] as string) || randomUUID(),
    customProps: (req: any, res: any) => ({
      requestId: (req as any).requestId || req.id,
      correlationId: getCorrelationId(req),
    }),
  })
);

// Metrics middleware (Prometheus)
app.use(metricsMiddleware);

// Rate limiter (global)
app.use(rateLimiter({ windowSeconds: 60, max: 60 }));

// Stricter rate limiter for Authentication (prevent brute force)
const authRateLimiter = rateLimiter({ windowSeconds: 15 * 60, max: 5 });

// Health check endpoint
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     description: Returns the health status of the microservice.
 *     tags: [Infrastructure]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 timestamp: { type: string, format: date-time }
 *                 environment: { type: string, example: development }
 */
app.get("/health", (req, res) => {
  req.log.debug("Health check endpoint called");
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: ENV,
  });
});

// Ready check endpoint - reports readiness including DB
/**
 * @openapi
 * /ready:
 *   get:
 *     summary: Readiness check
 *     description: Reports service readiness, including database connectivity.
 *     tags: [Infrastructure]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready (e.g., DB disconnected)
 */
app.get("/ready", (req, res) => {
  req.log.debug("Ready check endpoint called");
  const ready = isDatabaseReady();
  res.status(ready ? 200 : 503).json({
    ready,
    database: isDatabaseReady() ? "connected" : "connecting",
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint (Prometheus)
/**
 * @openapi
 * /metrics:
 *   get:
 *     summary: Prometheus metrics
 *     description: Exposes metrics for Prometheus monitoring.
 *     tags: [Infrastructure]
 *     responses:
 *       200:
 *         description: Prometheus metrics in text format
 */
app.get("/metrics", metricsHandler);

// API Routes
app.get("/api", (req, res) => {
  req.log.debug("API info endpoint called");
  res.status(200).json({
    message: "Welcome to microts microservice",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      ready: "/ready",
      slow: "/test/slow",
      timeoutOverride: "/test/timeout-override"
    },
  });
});

// Test routes for timeout
/**
 * @openapi
 * /test/slow:
 *   get:
 *     summary: Test slow request
 *     description: Simulates a slow operation that takes 35s (will trigger default 30s timeout).
 *     tags: [Testing]
 *     responses:
 *       500:
 *         description: Timeout error
 */
app.get("/test/slow", (req, res) => {
  req.log.info("Slow request started");
  // Delay longer than default 30s
  setTimeout(() => {
    if (!req.timedout) {
      res.json({ message: "Done after 35s" });
    }
  }, 35000);
});

app.get("/test/timeout-override", timeout("1000"), (req, res) => {
  req.log.info("Timeout override request started");
  setTimeout(() => {
    if (!req.timedout) {
      res.json({ message: "Done after 2s" });
    }
  }, 2000);
});

// Test route for DB Circuit Breaker
/**
 * @openapi
 * /test/db:
 *   get:
 *     summary: Test DB connection with Circuit Breaker
 *     description: Checks DB connection using the circuit breaker protected query.
 *     tags: [Testing]
 *     responses:
 *       200:
 *         description: Database is connected
 *       503:
 *         description: Circuit is open or DB is down
 */
app.get("/test/db", async (req, res, next) => {
  try {
    const result = await query("SELECT NOW()");
    res.json({ status: "success", data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Test route for Redis Circuit Breaker (uses rate limiter)
app.get("/test/redis-limiter", rateLimiter({ max: 100 }), (req, res) => {
  res.json({ status: "success", message: "Rate limiter check passed" });
});

// Auth routes
app.use("/auth", authRateLimiter, authRouter);

// Alert routes (webhook receiver)
app.use("/alerts", alertRouter);

// Status page
app.use("/status", statusRouter);

// API Documentation
app.use("/docs", swaggerRouter);

// Example protected route
/**
 * @openapi
 * /me:
 *   get:
 *     summary: Get current user profile
 *     description: Returns profile of the currently authenticated user.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Unauthorized
 */
app.get("/me", authenticate, async (req, res) => {
  const user = (req as any).user;
  res.json({ user });
});

// 404 handler - Catch all unregistered routes
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
});

// Centralized Error handler - Must be last
app.use(errorHandler);

// Start server
async function start() {
  // initialize DB (create tables)
  try {
    await initDb();
    logger.info("Database initialized");
  } catch (e) {
    logger.error({ err: e }, "Database initialization failed");
  }

  server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`🚀 Microservice running on http://0.0.0.0:${PORT}`);
    logger.info(`📝 Environment: ${ENV}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    logger.info(`✅ Ready check: http://localhost:${PORT}/ready`);
    logger.debug(`📊 Log level: ${process.env.LOG_LEVEL || "info"}`);
  });

  // Graceful shutdown handlers
  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, shutting down gracefully...");
    if (server) {
      server.close(async () => {
        const { closePool } = await import("./db");
        await closePool();
        logger.info("Server closed");
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });

  process.on("SIGINT", async () => {
    logger.info("SIGINT received, shutting down gracefully...");
    if (server) {
      server.close(async () => {
        const { closePool } = await import("./db");
        await closePool();
        logger.info("Server closed");
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
}

if (process.env.NODE_ENV !== "test") {
  start();
}

export { app };
