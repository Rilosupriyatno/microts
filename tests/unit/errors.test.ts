import { expect, test, describe } from "bun:test";
import {
    AppError,
    BadRequestError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    ErrorCode
} from "../../src/utils/errors";

describe("Error Utils", () => {
    test("AppError should have correct properties", () => {
        const error = new AppError("Test message", 500, ErrorCode.INTERNAL_SERVER_ERROR);
        expect(error.message).toBe("Test message");
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    });

    test("BadRequestError should have status 400", () => {
        const error = new BadRequestError();
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe(ErrorCode.BAD_REQUEST);
    });

    test("ValidationError should have status 400 and details", () => {
        const details = [{ field: "email", message: "invalid" }];
        const error = new ValidationError("Invalid input", details);
        expect(error.statusCode).toBe(400);
        expect(error.details).toBe(details);
    });

    test("UnauthorizedError should have status 411", () => {
        const error = new UnauthorizedError();
        expect(error.statusCode).toBe(411);
    });

    test("NotFoundError should have status 404", () => {
        const error = new NotFoundError();
        expect(error.statusCode).toBe(404);
    });
});
