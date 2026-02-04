import type { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "../utils/errors";
import { getCorrelationId } from "./correlationId";

/**
 * Global error handling middleware
 */
export default function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    // If headers already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(err);
    }

    let statusCode = 500;
    let code = ErrorCode.INTERNAL_SERVER_ERROR;
    let message = "Internal Server Error";
    let details = undefined;

    // Handle standardized AppError
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        code = err.code;
        message = err.message;
        details = err.details;
    }
    // Handle timeout error from connect-timeout
    else if (err.status === 503 || err.code === "ETIMEDOUT" || err.message === "Response timeout") {
        statusCode = 503;
        code = ErrorCode.REQUEST_TIMEOUT;
        message = "Request took too long to process and was terminated.";
    }
    // Handle other known errors (like express-validator)
    else if (err.errors && Array.isArray(err.errors)) {
        statusCode = 400;
        code = ErrorCode.VALIDATION_ERROR;
        message = "Validation failed";
        details = err.errors;
    }

    // Log error
    const logData = {
        requestId: (req as any).requestId,
        correlationId: getCorrelationId(req),
        path: req.path,
        method: req.method,
        code,
        statusCode,
        message: err.message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    };

    if (statusCode >= 500) {
        req.log.error(logData, err.message);
    } else {
        req.log.warn(logData, err.message);
    }

    // Pre-formatting response
    const errorResponse = {
        error: {
            code,
            message,
            status: statusCode,
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId,
            correlationId: getCorrelationId(req),
            ...(details && { details }),
            ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
        },
    };

    res.status(statusCode).json(errorResponse);
}
