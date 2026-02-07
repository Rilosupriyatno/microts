import type { Request, Response, NextFunction } from "express";
import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// HTTP request counter
const httpRequestCount = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

// Error counter by type
const httpErrorCount = new client.Counter({
  name: "http_errors_total",
  help: "Total number of HTTP errors by type",
  labelNames: ["method", "route", "error_type"],
});

// Active connections gauge
const activeConnections = new client.Gauge({
  name: "http_active_connections",
  help: "Number of active HTTP connections",
});

// Uptime tracking
const serverStartTime = Date.now();

const processUptimeSeconds = new client.Gauge({
  name: "process_uptime_seconds",
  help: "Process uptime in seconds",
});

const httpServerStartTime = new client.Gauge({
  name: "http_server_start_time",
  help: "Unix timestamp when the HTTP server started",
});

// Set server start time immediately
httpServerStartTime.set(Math.floor(serverStartTime / 1000));

// Update uptime every second
setInterval(() => {
  processUptimeSeconds.set(Math.floor((Date.now() - serverStartTime) / 1000));
}, 1000);

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestCount);
register.registerMetric(httpErrorCount);
register.registerMetric(activeConnections);
register.registerMetric(processUptimeSeconds);
register.registerMetric(httpServerStartTime);

/**
 * Categorize HTTP status code into error type
 */
function getErrorType(statusCode: number): string | null {
  if (statusCode >= 400 && statusCode < 500) {
    if (statusCode === 400) return "validation";
    if (statusCode === 401 || statusCode === 403) return "auth";
    if (statusCode === 404) return "not_found";
    if (statusCode === 429) return "rate_limit";
    return "client_error";
  }
  if (statusCode >= 500) {
    return "server_error";
  }
  return null;
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();

  // Track active connections
  activeConnections.inc();

  res.on("finish", () => {
    const [s, ns] = process.hrtime(start);
    const durationSec = s + ns / 1e9;
    const route = (req as any).route?.path || req.path || "-";
    const labels = { method: req.method, route, status: String(res.statusCode) };

    // Record duration and request count
    httpRequestDuration.observe(labels, durationSec);
    httpRequestCount.inc(labels, 1);

    // Track errors by type
    const errorType = getErrorType(res.statusCode);
    if (errorType) {
      httpErrorCount.inc({ method: req.method, route, error_type: errorType }, 1);
    }

    // Decrement active connections
    activeConnections.dec();
  });

  next();
}

export async function metricsHandler(_: Request, res: Response) {
  res.setHeader("Content-Type", register.contentType);
  res.send(await register.metrics());
}

export { httpErrorCount, activeConnections };
export default register;

