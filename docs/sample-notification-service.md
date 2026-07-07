# Notification Service Overview

The notification service is responsible for delivering user-facing alerts
across email, SMS, and in-app channels. It consumes events from an internal
queue and applies per-user delivery preferences before dispatching.

## Retry Policy

Failed deliveries are retried up to 3 times with exponential backoff
(1s, 4s, 16s). After the third failure, the event is moved to a dead-letter
queue for manual inspection.

## Rate Limiting

Each user is limited to 20 notifications per hour across all channels to
prevent notification fatigue. Limits are enforced using a sliding window
counter stored in Redis.
