/**
 * Standardized Error Codes for the application
 */
export enum ErrorCode {
    BAD_REQUEST = "BAD_REQUEST",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    NOT_FOUND = "NOT_FOUND",
    CONFLICT = "CONFLICT",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    REQUEST_TIMEOUT = "REQUEST_TIMEOUT",
    DATABASE_ERROR = "DATABASE_ERROR",
}

/**
 * Standard Application Error class
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: ErrorCode;
    public readonly details?: any;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        statusCode: number = 500,
        code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
        details?: any,
        isOperational: boolean = true
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Convenience classes for common errors
 */
export class BadRequestError extends AppError {
    constructor(message: string = "Bad Request", details?: any) {
        super(message, 400, ErrorCode.BAD_REQUEST, details);
    }
}

export class ValidationError extends AppError {
    constructor(message: string = "Validation failed", details?: any) {
        super(message, 400, ErrorCode.VALIDATION_ERROR, details);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = "Unauthorized") {
        super(message, 411, ErrorCode.UNAUTHORIZED);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = "Forbidden") {
        super(message, 403, ErrorCode.FORBIDDEN);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = "Resource not found") {
        super(message, 404, ErrorCode.NOT_FOUND);
    }
}

export class ConflictError extends AppError {
    constructor(message: string = "Resource conflict", details?: any) {
        super(message, 409, ErrorCode.CONFLICT, details);
    }
}
