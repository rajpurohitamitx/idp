# Industrial Guardian

AI-powered industrial safety, PPE & hazard detection platform. Two real input pipelines (camera →
AI vision, and sensor hardware → threshold/anomaly analysis) feed a data-fusion + hazard + severity
+ alert engine, backed by PostgreSQL and delivered live to a React dashboard over Socket.IO.

```
industrial-guardian/
├── backend/              Node.js + TypeScript + Express + Prisma + PostgreSQL + Socket.IO
├── ai-service/            Python + FastAPI + OpenCV — separate, replaceable detection model
├── frontend/              React + TypeScript + Vite + Tailwind + Recharts
├── hardware-integration/  ESP32 example firmware, RFID module, protocol docs, Python test clients
└── database/              (Prisma manages schema/migrations from backend/prisma)
```

## Quick start

### 1. Everything at once (recommended)
```
docker compose up --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```
Frontend: http://localhost:5173 — log in with `admin@demo.industrialguardian.local` / `Admin@12345`
Backend API docs: http://localhost:4000/api-docs

### 2. Or run each service manually
```
# Backend
cd backend && cp .env.example .env && npm install
npm run prisma:migrate && npm run seed && npm run dev

# AI service
cd ai-service && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && cp .env.example .env
uvicorn app.main:app --reload --port 8001

# Frontend
cd frontend && cp .env.example .env && npm install && npm run dev
```

## Connecting real ESP32 hardware
1. Register the device + its cameras/sensors via the API (see `hardware-integration/protocols/README.md`
   and the Swagger docs at `/api-docs` for exact payloads) — get back a `deviceToken` (prefix `igd_`).
2. Edit `hardware-integration/esp32/sensor_controller/sensor_controller.ino` or `camera_node/camera_node.ino`
   with your WiFi credentials, your machine's LAN IP as `BACKEND_URL`, and the device token.
3. **Calibrate sensors first**: flash `hardware-integration/esp32/calibration/sensor_calibration.ino`
   (no WiFi/backend needed) to get real measured constants for your exact wiring before touching the
   full firmware — see comments in that file.
4. No physical hardware yet? Use `hardware-integration/camera/mock_hardware_client.py` (simulated
   sensor/RFID/image events) or `webcam_client.py` (streams a real laptop webcam into the real pipeline)
   to prove the full chain works first.

## Core design decisions (per the spec)
- **No hard-coded thresholds**: `backend/src/config/defaults.ts` holds defaults; every value is
  overridable at runtime via `PUT /api/settings` (admin-only).
- **False-positive protection**: camera hazards require N consecutive qualifying frames; sensor
  hazards require persistent abnormal readings; both have cooldowns.
- **Anomaly detection beyond simple thresholds**: combines rate-of-change and robust (median/MAD)
  statistical deviation — catches a climbing series like `30,31,31,32,45,47,49`.
- **Camera + sensor fusion**: only correlates opposite-source events sharing a location, a related
  hazard type, and a configurable time window — never blindly combines unrelated events.
- **Hardware is dumb, backend is smart**: sensors send raw values; the backend owns all
  threshold/anomaly/severity decisions. Device auth (hashed tokens) is entirely separate from user JWTs.
- **Demo mode**: `/api/demo/*` is explicitly separate from real ingestion endpoints; every record it
  creates is flagged `isDemo: true`.

## Entry PPE workflow
`POST /api/access-events` records the RFID identification (`decision: PENDING_PPE`). The gate camera
then calls `POST /api/access-events/:eventId/entry-check` (multipart: `image`, `cameraId`) — runs the
same AI pipeline, resolves the decision to `APPROVED` or `DENIED`.

## Tests
- Unit tests for every decision engine (no database needed): `cd backend && npm test`
- Integration tests against a real (disposable) Postgres:
  `DATABASE_URL=postgresql://guardian:change_me@localhost:5432/industrial_guardian_test npm run test:integration`
- AI-service tests: `cd ai-service && pytest`

## Known limitations
- Swagger doc covers all main resources but isn't exhaustive on every edge case — the Zod validators
  in `backend/src/validators/index.ts` are the actual source of truth for request validation.
- No visual restricted-zone region editor in earlier versions is now included (drag-to-draw rectangle
  on the Restricted Zones page).
- Mobile inspection robot, predictive maintenance, biometric ID — explicitly out of scope for v1 per
  the spec's own "future extensibility" section.
