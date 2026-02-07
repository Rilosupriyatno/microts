import express from "express";
import type { Request, Response, NextFunction } from "express";
import {
    processAlertmanagerPayload,
    getAlertHistory,
    getAlertStats,
    type AlertmanagerPayload
} from "../services/alert.service";
import { BadRequestError } from "../utils/errors";

const router = express.Router();

/**
 * @openapi
 * /alerts/webhook:
 *   post:
 *     summary: Receive alerts from Prometheus Alertmanager
 *     description: Webhook endpoint for Alertmanager to send alert notifications.
 *     tags: [Alerts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Alerts processed successfully
 *       400:
 *         description: Invalid payload
 */
router.post("/webhook", (req: Request, res: Response, next: NextFunction) => {
    try {
        const payload = req.body as AlertmanagerPayload;

        if (!payload || !Array.isArray(payload.alerts)) {
            throw new BadRequestError("Invalid Alertmanager payload");
        }

        const processed = processAlertmanagerPayload(payload);

        res.json({
            success: true,
            processed: processed.length,
            alerts: processed.map(a => ({
                id: a.id,
                name: a.alertName,
                status: a.status,
                severity: a.severity,
            })),
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /alerts/history:
 *   get:
 *     summary: Get recent alert history
 *     description: Returns the last N alerts received (default 50, max 100).
 *     tags: [Alerts]
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Alert history
 */
router.get("/history", (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const history = getAlertHistory(limit);
    const stats = getAlertStats();

    res.json({
        stats,
        alerts: history,
    });
});

export default router;
