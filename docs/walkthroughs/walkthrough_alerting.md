# Walkthrough: Alerting & Uptime Dashboard

This document describes the alerting notifications integration and uptime tracking features added to the microts service.

---

## New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/alerts/webhook` | POST | Receive alerts from Prometheus Alertmanager |
| `/alerts/history` | GET | View recent alerts (last 100) |
| `/status` | GET | Status page with uptime and metrics |

---

## Files Created

### Service Layer
- `src/services/alert.service.ts` - Webhook receiver, notification handlers, alert history

### Routes
- `src/routes/alert.routes.ts` - Alert webhook and history endpoints
- `src/routes/status.routes.ts` - Status page with uptime info

### Modified
- `src/middleware/metrics.ts` - Added uptime gauges
- `src/config/index.ts` - Added alerting configuration
- `src/index.ts` - Mounted new routes

---

## Prometheus Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `process_uptime_seconds` | Gauge | Process uptime in seconds |
| `http_server_start_time` | Gauge | Unix timestamp when server started |

---

## Configuration

Environment variables for alerting:

```bash
# Enable alerting
ALERTING_ENABLED=true

# Webhook URL for notifications (Slack, Discord, etc.)
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/xxx
```

---

## Usage Examples

### Send Test Alert

```bash
curl -X POST http://localhost:3000/alerts/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "version": "4",
    "status": "firing",
    "groupKey": "test",
    "receiver": "webhook",
    "alerts": [{
      "status": "firing",
      "labels": {
        "alertname": "HighCPU",
        "severity": "warning"
      },
      "annotations": {
        "summary": "CPU usage above 80%",
        "description": "Server CPU is running high"
      },
      "startsAt": "2026-02-07T00:00:00Z",
      "endsAt": "0001-01-01T00:00:00Z"
    }]
  }'
```

### View Status Page

```bash
curl http://localhost:3000/status
```

Response:
```json
{
  "service": "microts",
  "status": "healthy",
  "uptime": {
    "seconds": 3600,
    "formatted": "1h 0m 0s",
    "startedAt": "2026-02-07T00:00:00.000Z"
  },
  "alerts": {
    "total": 1,
    "firing": 1,
    "resolved": 0
  },
  "links": {
    "health": "/health",
    "ready": "/ready",
    "metrics": "/metrics",
    "alertHistory": "/alerts/history"
  }
}
```

### View Alert History

```bash
curl http://localhost:3000/alerts/history?limit=10
```

---

## Alertmanager Integration

To connect Prometheus Alertmanager, add this to `alertmanager.yml`:

```yaml
receivers:
  - name: 'microts-webhook'
    webhook_configs:
      - url: 'http://microts:3000/alerts/webhook'
        send_resolved: true

route:
  receiver: 'microts-webhook'
```
