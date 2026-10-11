-- Industrial Guardian: full database schema (PostgreSQL)

CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERVISOR', 'OPERATOR');
CREATE TYPE "DeviceType" AS ENUM ('CAMERA', 'ESP32', 'SENSOR_CONTROLLER', 'RFID_READER', 'THERMAL_SENSOR', 'GATEWAY', 'OTHER');
CREATE TYPE "OnlineStatus" AS ENUM ('ONLINE', 'OFFLINE', 'WARNING', 'PROCESSING');
CREATE TYPE "SensorType" AS ENUM ('GAS', 'SMOKE', 'TEMPERATURE', 'HUMIDITY', 'ELECTRICAL', 'THERMAL', 'OTHER');
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "HazardType" AS ENUM ('NO_HELMET', 'NO_SAFETY_VEST', 'NO_GLOVES', 'NO_SAFETY_SHOES', 'GAS_LEAK', 'SMOKE', 'FIRE', 'HIGH_TEMPERATURE', 'THERMAL_ANOMALY', 'ELECTRICAL_ANOMALY', 'RESTRICTED_ZONE', 'UNKNOWN_HAZARD', 'OTHER');
CREATE TYPE "HazardSource" AS ENUM ('CAMERA', 'SENSOR', 'FUSED', 'MANUAL');
CREATE TYPE "HazardStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM');
CREATE TYPE "AlertKind" AS ENUM ('HAZARD', 'DEVICE_OFFLINE', 'DEVICE_ONLINE', 'SYSTEM');
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM');
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM');
CREATE TYPE "AnalysisStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'COMPLETE', 'FAILED');
CREATE TYPE "PPEResult" AS ENUM ('COMPLIANT', 'VIOLATION', 'UNKNOWN');
CREATE TYPE "AccessDecision" AS ENUM ('PENDING_PPE', 'APPROVED', 'DENIED', 'UNKNOWN_CARD', 'INACTIVE_WORKER');
CREATE TYPE "CommandStatus" AS ENUM ('QUEUED', 'SENT', 'ACCEPTED', 'RUNNING', 'COMPLETED', 'FAILED', 'EXPIRED');
CREATE TYPE "WorkerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'OPERATOR',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Worker" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "department" TEXT,
  "designation" TEXT,
  "photoUrl" TEXT,
  "rfidUid" TEXT,
  "biometricRef" TEXT,
  "status" "WorkerStatus" NOT NULL DEFAULT 'ACTIVE',
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Device" (
  "id" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "DeviceType" NOT NULL,
  "location" TEXT NOT NULL,
  "status" "OnlineStatus" NOT NULL DEFAULT 'OFFLINE',
  "firmwareVersion" TEXT,
  "tokenHash" TEXT,
  "authorized" BOOLEAN NOT NULL DEFAULT true,
  "lastHeartbeat" TIMESTAMP(3),
  "lastCommunication" TIMESTAMP(3),
  "signalStrength" INTEGER,
  "uptimeSeconds" INTEGER,
  "config" JSONB,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Camera" (
  "id" TEXT NOT NULL,
  "cameraId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "streamUrl" TEXT,
  "status" "OnlineStatus" NOT NULL DEFAULT 'OFFLINE',
  "deviceId" TEXT,
  "isEntryCamera" BOOLEAN NOT NULL DEFAULT false,
  "captureIntervalSeconds" INTEGER NOT NULL DEFAULT 10,
  "lastHeartbeat" TIMESTAMP(3),
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Camera_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Sensor" (
  "id" TEXT NOT NULL,
  "sensorId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "SensorType" NOT NULL,
  "unit" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "status" "OnlineStatus" NOT NULL DEFAULT 'OFFLINE',
  "deviceId" TEXT,
  "warningThreshold" DOUBLE PRECISION,
  "criticalThreshold" DOUBLE PRECISION,
  "lowWarningThreshold" DOUBLE PRECISION,
  "requiredAbnormalReadings" INTEGER NOT NULL DEFAULT 2,
  "rateOfChangeLimit" DOUBLE PRECISION,
  "staleAfterSeconds" INTEGER NOT NULL DEFAULT 60,
  "lastReadingAt" TIMESTAMP(3),
  "lastValue" DOUBLE PRECISION,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Sensor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SensorReading" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "sensorId" TEXT NOT NULL,
  "value" DOUBLE PRECISION,
  "unit" TEXT NOT NULL,
  "grid" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "level" TEXT NOT NULL DEFAULT 'NORMAL',
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Image" (
  "id" TEXT NOT NULL,
  "imageId" TEXT NOT NULL,
  "cameraId" TEXT NOT NULL,
  "deviceId" TEXT,
  "storagePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "location" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "AnalysisStatus" NOT NULL DEFAULT 'RECEIVED',
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImageAnalysis" (
  "id" TEXT NOT NULL,
  "analysisId" TEXT NOT NULL,
  "imageId" TEXT NOT NULL,
  "modelName" TEXT NOT NULL,
  "modelVersion" TEXT NOT NULL,
  "aiProcessingMs" INTEGER NOT NULL,
  "backendProcessingMs" INTEGER,
  "totalMs" INTEGER,
  "captureToReceiveMs" INTEGER,
  "detections" JSONB NOT NULL,
  "ppeSummary" JSONB,
  "overallResult" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImageAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DetectionEvent" (
  "id" TEXT NOT NULL,
  "imageId" TEXT NOT NULL,
  "cameraId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "boundingBox" JSONB NOT NULL,
  "confirmed" BOOLEAN NOT NULL DEFAULT false,
  "streak" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DetectionEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PPECheck" (
  "id" TEXT NOT NULL,
  "imageId" TEXT,
  "workerId" TEXT,
  "accessLogId" TEXT,
  "cameraId" TEXT,
  "purpose" TEXT NOT NULL DEFAULT 'MONITORING',
  "result" "PPEResult" NOT NULL DEFAULT 'UNKNOWN',
  "items" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "PPECheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Hazard" (
  "id" TEXT NOT NULL,
  "hazardId" TEXT NOT NULL,
  "type" "HazardType" NOT NULL,
  "severity" "Severity" NOT NULL,
  "location" TEXT NOT NULL,
  "source" "HazardSource" NOT NULL,
  "confidence" DOUBLE PRECISION,
  "status" "HazardStatus" NOT NULL DEFAULT 'ACTIVE',
  "cameraId" TEXT,
  "sensorId" TEXT,
  "imageId" TEXT,
  "workerId" TEXT,
  "details" JSONB,
  "occurrences" INTEGER NOT NULL DEFAULT 1,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Hazard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Alert" (
  "id" TEXT NOT NULL,
  "kind" "AlertKind" NOT NULL DEFAULT 'HAZARD',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" "Severity" NOT NULL,
  "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
  "hazardId" TEXT,
  "deviceId" TEXT,
  "location" TEXT,
  "acknowledgedBy" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Incident" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "hazardId" TEXT NOT NULL,
  "severity" "Severity" NOT NULL,
  "location" TEXT NOT NULL,
  "source" "HazardSource" NOT NULL,
  "imageId" TEXT,
  "sensorRef" JSONB,
  "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "detectedAt" TIMESTAMP(3) NOT NULL,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "acknowledgedBy" TEXT,
  "resolvedBy" TEXT,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccessLog" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "readerId" TEXT,
  "rfidUid" TEXT NOT NULL,
  "workerId" TEXT,
  "decision" "AccessDecision" NOT NULL DEFAULT 'PENDING_PPE',
  "reason" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RestrictedZone" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "cameraId" TEXT NOT NULL,
  "region" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestrictedZone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeviceCommand" (
  "id" TEXT NOT NULL,
  "commandId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "command" TEXT NOT NULL,
  "payload" JSONB,
  "status" "CommandStatus" NOT NULL DEFAULT 'QUEUED',
  "result" JSONB,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeviceCommand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "actor" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT,
  "entityId" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Worker_employeeId_key" ON "Worker"("employeeId");
CREATE UNIQUE INDEX "Worker_rfidUid_key" ON "Worker"("rfidUid");
CREATE UNIQUE INDEX "Device_deviceId_key" ON "Device"("deviceId");
CREATE UNIQUE INDEX "Camera_cameraId_key" ON "Camera"("cameraId");
CREATE UNIQUE INDEX "Sensor_sensorId_key" ON "Sensor"("sensorId");
CREATE UNIQUE INDEX "SensorReading_eventId_key" ON "SensorReading"("eventId");
CREATE UNIQUE INDEX "Image_imageId_key" ON "Image"("imageId");
CREATE UNIQUE INDEX "ImageAnalysis_analysisId_key" ON "ImageAnalysis"("analysisId");
CREATE UNIQUE INDEX "ImageAnalysis_imageId_key" ON "ImageAnalysis"("imageId");
CREATE UNIQUE INDEX "PPECheck_accessLogId_key" ON "PPECheck"("accessLogId");
CREATE UNIQUE INDEX "Hazard_hazardId_key" ON "Hazard"("hazardId");
CREATE UNIQUE INDEX "Incident_incidentId_key" ON "Incident"("incidentId");
CREATE UNIQUE INDEX "Incident_hazardId_key" ON "Incident"("hazardId");
CREATE UNIQUE INDEX "AccessLog_eventId_key" ON "AccessLog"("eventId");
CREATE UNIQUE INDEX "DeviceCommand_commandId_key" ON "DeviceCommand"("commandId");

CREATE INDEX "SensorReading_sensorId_timestamp_idx" ON "SensorReading"("sensorId", "timestamp");
CREATE INDEX "Image_cameraId_capturedAt_idx" ON "Image"("cameraId", "capturedAt");
CREATE INDEX "DetectionEvent_cameraId_type_createdAt_idx" ON "DetectionEvent"("cameraId", "type", "createdAt");
CREATE INDEX "Hazard_status_type_location_idx" ON "Hazard"("status", "type", "location");
CREATE INDEX "Hazard_lastSeenAt_idx" ON "Hazard"("lastSeenAt");
CREATE INDEX "Alert_status_createdAt_idx" ON "Alert"("status", "createdAt");
CREATE INDEX "AccessLog_timestamp_idx" ON "AccessLog"("timestamp");
CREATE INDEX "DeviceCommand_deviceId_status_idx" ON "DeviceCommand"("deviceId", "status");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "Camera" ADD CONSTRAINT "Camera_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sensor" ADD CONSTRAINT "Sensor_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Image" ADD CONSTRAINT "Image_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImageAnalysis" ADD CONSTRAINT "ImageAnalysis_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DetectionEvent" ADD CONSTRAINT "DetectionEvent_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PPECheck" ADD CONSTRAINT "PPECheck_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PPECheck" ADD CONSTRAINT "PPECheck_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Hazard" ADD CONSTRAINT "Hazard_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Hazard" ADD CONSTRAINT "Hazard_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "Hazard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "Hazard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RestrictedZone" ADD CONSTRAINT "RestrictedZone_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeviceCommand" ADD CONSTRAINT "DeviceCommand_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
