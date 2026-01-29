import express from "express";
import { Server } from "http";
import pino from "pino";
import pinoHttp from "pino-http";
import authRouter, { authenticate } from "./auth";
import { rateLimiter } from "./middleware/rateLimiter";
import { initDb, isDatabaseReady } from "./db";

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
app.use(pinoHttp({ logger }));
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

// API Routes
app.get("/api", (req, res) => {
  req.log.debug("API info endpoint called");
  res.status(200).json({
    message: "Welcome to microts microservice",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      ready: "/ready",
    },
  });
});

// Auth routes
app.use("/auth", authRouter);

// Example protected route
app.get("/me", authenticate, async (req, res) => {
  const user = (req as any).user;
  res.json({ user });
});

// 404 handler
app.use((req, res) => {
  req.log.warn({ path: req.path, method: req.method }, "Not Found");
  res.status(404).json({
    error: "Not Found",
    path: req.path,
    method: req.method,
  });
});

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    req.log.error(
      {
        error: err.message,
        stack: ENV === "development" ? err.stack : undefined,
      },
      "Internal Server Error"
    );
    res.status(500).json({
      error: "Internal Server Error",
      message: ENV === "development" ? err.message : undefined,
    });
  }
);

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
