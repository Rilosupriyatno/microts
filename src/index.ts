// IMPORTANT: Tracing must be initialized BEFORE any other imports
import { initTracing } from "./tracing";
initTracing();

import express from "express";
import { Server } from "http";
import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import requestIdMiddleware from "./middleware/requestId";
import correlationIdMiddleware, { getCorrelationId } from "./middleware/correlationId";
import { metricsMiddleware, metricsHandler } from "./middleware/metrics";
import authRouter, { authenticate } from "./auth";
import { rateLimiter } from "./middleware/rateLimiter";
import { initDb, isDatabaseReady } from "./db";
import timeout from "connect-timeout";
import errorHandler from "./middleware/errorHandler";
import { NotFoundError } from "./utils/errors";

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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// Health check endpoint
app.get("/health", (req, res) => {
  req.log.debug("Health check endpoint called");
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: ENV,
  });
});

// Ready check endpoint - reports readiness including DB
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

// Auth routes
app.use("/auth", authRouter);

// Example protected route
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
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down gracefully...");
    if (server) {
      server.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT received, shutting down gracefully...");
    if (server) {
      server.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
}

start();

export default app;
