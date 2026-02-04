import type { Request, Response, NextFunction } from "express";

/**
 * Middleware to handle request timeouts.
 * Must be used AFTER timeout() middleware from connect-timeout.
 */
export default function timeoutHandler(req: Request, res: Response, next: NextFunction) {
    if (req.timedout) {
        // If request timed out, send 503 Service Unavailable or 408 Request Timeout
        // 503 is often preferred in microservices to indicate server-side bottleneck
        if (!res.headersSent) {
            res.status(503).json({
                error: {
                    code: "REQUEST_TIMEOUT",
                    message: "Request took too long to process and was terminated.",
                    status: 503,
                    timestamp: new Date().toISOString(),
                    requestId: (req as any).requestId
                }
            });
        }
        // Log the timeout
        req.log?.error({
            requestId: (req as any).requestId,
            path: req.path,
            method: req.method
        }, "Request timed out");
    } else {
        next();
    }
}
