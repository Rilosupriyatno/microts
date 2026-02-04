/**
 * OpenTelemetry Tracing Configuration
 * 
 * IMPORTANT: This file MUST be imported BEFORE any other imports in index.ts
 * to ensure all modules are properly instrumented.
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
    SEMRESATTRS_SERVICE_NAME,
    SEMRESATTRS_SERVICE_VERSION,
    SEMRESATTRS_DEPLOYMENT_ENVIRONMENT
} from "@opentelemetry/semantic-conventions";

const OTEL_EXPORTER_OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://jaeger:4318";
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "microts";
const SERVICE_VERSION = process.env.npm_package_version || "1.0.0";
const ENVIRONMENT = process.env.NODE_ENV || "development";

// Check if tracing is enabled (default: true in development with jaeger available)
const TRACING_ENABLED = process.env.OTEL_TRACING_ENABLED !== "false";

let sdk: NodeSDK | null = null;

export function initTracing(): void {
    if (!TRACING_ENABLED) {
        console.log("[Tracing] OpenTelemetry tracing is disabled");
        return;
    }

    try {
        const traceExporter = new OTLPTraceExporter({
            url: `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
        });

        sdk = new NodeSDK({
            resource: new Resource({
                [SEMRESATTRS_SERVICE_NAME]: SERVICE_NAME,
                [SEMRESATTRS_SERVICE_VERSION]: SERVICE_VERSION,
                [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: ENVIRONMENT,
            }),
            traceExporter,
            instrumentations: [
                getNodeAutoInstrumentations({
                    // Disable fs instrumentation to reduce noise
                    "@opentelemetry/instrumentation-fs": { enabled: false },
                    // Configure HTTP instrumentation
                    "@opentelemetry/instrumentation-http": {
                        ignoreIncomingRequestHook: (request: { url?: string }) => {
                            // Ignore health checks and metrics endpoints
                            const url = request.url || "";
                            return url === "/health" || url === "/ready" || url === "/metrics";
                        },
                    },
                    // Configure Express instrumentation
                    "@opentelemetry/instrumentation-express": {
                        enabled: true,
                    },
                    // Configure pg instrumentation for database tracing
                    "@opentelemetry/instrumentation-pg": {
                        enabled: true,
                    },
                    // Configure ioredis instrumentation
                    "@opentelemetry/instrumentation-ioredis": {
                        enabled: true,
                    },
                }),
            ],
        });

        sdk.start();
        console.log(`[Tracing] OpenTelemetry initialized - exporting to ${OTEL_EXPORTER_OTLP_ENDPOINT}`);

        // Graceful shutdown
        process.on("SIGTERM", () => {
            sdk?.shutdown()
                .then(() => console.log("[Tracing] OpenTelemetry shut down successfully"))
                .catch((error: Error) => console.error("[Tracing] Error shutting down OpenTelemetry", error));
        });

    } catch (error) {
        console.warn("[Tracing] Failed to initialize OpenTelemetry:", error);
        console.warn("[Tracing] Continuing without distributed tracing");
    }
}

export function shutdownTracing(): Promise<void> {
    if (sdk) {
        return sdk.shutdown();
    }
    return Promise.resolve();
}
