import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Router } from "express";

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Microts API",
            version: "1.0.0",
            description: "API Documentation for Microts Microservice",
            license: {
                name: "MIT",
                url: "https://spdx.org/licenses/MIT.html",
            },
            contact: {
                name: "Deepmind Team",
                url: "https://google.com",
                email: "support@google.com",
            },
        },
        servers: [
            {
                url: "http://localhost:3000",
                description: "Development server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                ErrorResponse: {
                    type: "object",
                    properties: {
                        error: {
                            type: "object",
                            properties: {
                                code: { type: "string" },
                                message: { type: "string" },
                                status: { type: "integer" },
                                timestamp: { type: "string", format: "date-time" },
                                requestId: { type: "string" },
                                correlationId: { type: "string" },
                                details: { type: "object" },
                                stack: { type: "string" },
                            },
                        },
                    },
                },
                User: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        email: { type: "string", format: "email" },
                        created_at: { type: "string", format: "date-time" },
                    },
                },
            },
        },
    },
    apis: ["./src/index.ts", "./src/auth.ts"], // files containing annotations
};

const specs = swaggerJsdoc(options);
const router = Router();

router.use("/", swaggerUi.serve);
router.get("/", swaggerUi.setup(specs, {
    explorer: true,
    customSiteTitle: "Microts API Documentation",
}));

export default router;
