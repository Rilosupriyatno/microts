import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

/**
 * Alert severity levels
 */
export type AlertSeverity = "critical" | "warning" | "info";

/**
 * Prometheus Alertmanager webhook payload format
 */
export interface AlertmanagerPayload {
    version: string;
    groupKey: string;
    status: "firing" | "resolved";
    receiver: string;
    groupLabels: Record<string, string>;
    commonLabels: Record<string, string>;
    commonAnnotations: Record<string, string>;
    externalURL: string;
    alerts: Alert[];
}

export interface Alert {
    status: "firing" | "resolved";
    labels: Record<string, string>;
    annotations: Record<string, string>;
    startsAt: string;
    endsAt: string;
    generatorURL: string;
    fingerprint: string;
}

/**
 * Internal alert record for history
 */
export interface AlertRecord {
    id: string;
    receivedAt: Date;
    status: "firing" | "resolved";
    severity: AlertSeverity;
    alertName: string;
    summary: string;
    description: string;
    labels: Record<string, string>;
}

// In-memory alert history (circular buffer, last 100 alerts)
const MAX_HISTORY = 100;
const alertHistory: AlertRecord[] = [];

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Extract severity from alert labels
 */
function getSeverity(labels: Record<string, string>): AlertSeverity {
    const severity = labels.severity?.toLowerCase();
    if (severity === "critical" || severity === "warning" || severity === "info") {
        return severity;
    }
    return "warning"; // default
}

/**
 * Process incoming Alertmanager webhook payload
 */
export function processAlertmanagerPayload(payload: AlertmanagerPayload): AlertRecord[] {
    const records: AlertRecord[] = [];

    for (const alert of payload.alerts) {
        const record: AlertRecord = {
            id: generateAlertId(),
            receivedAt: new Date(),
            status: alert.status,
            severity: getSeverity(alert.labels),
            alertName: alert.labels.alertname || "Unknown",
            summary: alert.annotations.summary || "",
            description: alert.annotations.description || "",
            labels: alert.labels,
        };

        records.push(record);
        addToHistory(record);
        notifyAlert(record);
    }

    return records;
}

/**
 * Add alert to history (circular buffer)
 */
function addToHistory(record: AlertRecord): void {
    if (alertHistory.length >= MAX_HISTORY) {
        alertHistory.shift(); // Remove oldest
    }
    alertHistory.push(record);
}

/**
 * Notify about an alert (log-based for now)
 */
function notifyAlert(record: AlertRecord): void {
    const logMethod = record.severity === "critical" ? "error" :
        record.severity === "warning" ? "warn" : "info";

    const emoji = record.status === "resolved" ? "✅" :
        record.severity === "critical" ? "🚨" :
            record.severity === "warning" ? "⚠️" : "ℹ️";

    logger[logMethod]({
        alertId: record.id,
        alertName: record.alertName,
        status: record.status,
        severity: record.severity,
        summary: record.summary,
    }, `${emoji} [ALERT] ${record.alertName} - ${record.status.toUpperCase()}`);

    // If webhook URL is configured, send notification
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (webhookUrl) {
        sendWebhookNotification(webhookUrl, record).catch((err) => {
            logger.error({ err, alertId: record.id }, "Failed to send webhook notification");
        });
    }
}

/**
 * Send notification to external webhook (e.g., Slack, Discord, etc.)
 */
async function sendWebhookNotification(url: string, record: AlertRecord): Promise<void> {
    const emoji = record.status === "resolved" ? "✅" :
        record.severity === "critical" ? "🚨" :
            record.severity === "warning" ? "⚠️" : "ℹ️";

    const message = {
        text: `${emoji} *${record.alertName}* - ${record.status.toUpperCase()}`,
        attachments: [
            {
                color: record.status === "resolved" ? "good" :
                    record.severity === "critical" ? "danger" : "warning",
                fields: [
                    { title: "Severity", value: record.severity, short: true },
                    { title: "Status", value: record.status, short: true },
                    { title: "Summary", value: record.summary || "N/A", short: false },
                ],
            },
        ],
    };

    await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
    });
}

/**
 * Get alert history
 */
export function getAlertHistory(limit?: number): AlertRecord[] {
    const count = Math.min(limit || MAX_HISTORY, alertHistory.length);
    return alertHistory.slice(-count).reverse(); // Most recent first
}

/**
 * Get alert statistics
 */
export function getAlertStats(): {
    total: number;
    firing: number;
    resolved: number;
    bySeverity: Record<AlertSeverity, number>;
} {
    const stats = {
        total: alertHistory.length,
        firing: 0,
        resolved: 0,
        bySeverity: { critical: 0, warning: 0, info: 0 } as Record<AlertSeverity, number>,
    };

    for (const alert of alertHistory) {
        if (alert.status === "firing") stats.firing++;
        else stats.resolved++;
        stats.bySeverity[alert.severity]++;
    }

    return stats;
}
