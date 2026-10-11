# Hardware ↔ Backend Communication Protocol

## Core principle
Hardware collects and reports raw data. It never decides severity or hazard status — the backend
does, against configurable thresholds (`/api/settings`). An ESP32 sends `Gas = 82.5 ppm`, never
`Gas = CRITICAL`.

## Auth
- Humans (dashboard): `Authorization: Bearer <JWT>` from `POST /api/auth/login`.
- Hardware: `Authorization: Bearer <device token>` (prefix `igd_`), issued once by an admin via
  `POST /api/devices`.

## Endpoints hardware calls
| Purpose | Method & path | Auth |
|---|---|---|
| Register | `POST /api/devices/register` | none |
| Heartbeat | `POST /api/devices/heartbeat` | none |
| Pull device config | `GET /api/devices/:deviceId/config` | none |
| Poll queued commands | `GET /api/devices/:id/commands` | device token |
| Acknowledge a command | `POST /api/devices/commands/ack` | device token |
| Batch sensor readings | `POST /api/v1/sensors/readings` | device token |
| Single sensor reading | `POST /api/sensors/:sensorId/readings` | device token or user JWT |
| RFID access event | `POST /api/v1/access-events` | device token |
| Camera image upload | `POST /api/images/analyze` (multipart) | device token or user JWT |

## Timestamps
UTC ISO-8601 with offset, e.g. `2026-09-23T14:31:10Z`.

## Duplicate protection
Every event carries an `eventId`. Resubmitting the same `eventId` is a no-op.

## Offline buffering
Buffer events locally when offline, flush with original timestamps once connectivity returns.
