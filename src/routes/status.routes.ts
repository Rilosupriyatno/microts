import express from "express";
import type { Request, Response } from "express";
import { getAlertStats } from "../services/alert.service";

const router = express.Router();

// Track server start time
const serverStartTime = Date.now();

/**
 * @openapi
 * /status:
 *   get:
 *     summary: Service status page
 *     description: Returns uptime, health status, and basic metrics summary.
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: Status information
 */
router.get("/", (_req: Request, res: Response) => {
    const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
    const alertStats = getAlertStats();

    const formatUptime = (seconds: number): string => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const parts: string[] = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        parts.push(`${secs}s`);

        return parts.join(" ");
    };

    res.json({
        service: "microts",
        status: "healthy",
        uptime: {
            seconds: uptime,
            formatted: formatUptime(uptime),
            startedAt: new Date(serverStartTime).toISOString(),
        },
        alerts: {
            total: alertStats.total,
            firing: alertStats.firing,
            resolved: alertStats.resolved,
        },
        links: {
            health: "/health",
            ready: "/ready",
            metrics: "/metrics",
            alertHistory: "/alerts/history",
        },
    });
});

export default router;
