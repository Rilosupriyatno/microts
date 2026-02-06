import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny } from "zod";
import { ValidationError } from "../utils/errors";

/**
 * Middleware to validate request using Zod schema
 * Validates body, query, and params
 */
export const validate = (schema: {
    body?: ZodTypeAny;
    query?: ZodTypeAny;
    params?: ZodTypeAny;
}) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (schema.body) {
            req.body = await schema.body.parseAsync(req.body);
        }
        if (schema.query) {
            req.query = await schema.query.parseAsync(req.query);
        }
        if (schema.params) {
            req.params = await schema.params.parseAsync(req.params);
        }
        return next();
    } catch (error) {
        if (error instanceof ZodError) {
            // Map Zod errors to a cleaner format for the standardized ValidationError
            const details = error.issues.map((err) => ({
                path: err.path.join("."),
                message: err.message,
            }));

            const errorMessage = details
                .map((d) => `${d.path}: ${d.message}`)
                .join(", ");

            return next(new ValidationError(`Validation failed: ${errorMessage}`, details));
        }
        return next(error);
    }
};
