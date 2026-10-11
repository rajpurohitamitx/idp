import { z } from 'zod';

const isoTs = z.string().datetime({ offset: true }).transform((s) => new Date(s));
export const SENSOR_TYPES = ['GAS', 'SMOKE', 'TEMPERATURE', 'HUMIDITY', 'ELECTRICAL', 'THERMAL', 'OTHER'] as const;
export const DEVICE_TYPES = ['CAMERA', 'ESP32', 'SENSOR_CONTROLLER', 'RFID_READER', 'THERMAL_SENSOR', 'GATEWAY', 'OTHER'] as const;
const opt = <T extends z.ZodTypeAny>(t: T) => t.nullish();

const sanityTs = isoTs.refine((d) => d.getTime() < Date.now() + 24 * 3600_000, 'timestamp is in the future');

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const userCreateSchema = z.object({
  email: z.string().email(), name: z.string().min(1), password: z.string().min(10), role: z.enum(['ADMIN', 'SUPERVISOR', 'OPERATOR']),
});
export const userUpdateSchema = userCreateSchema.partial().extend({ active: z.boolean().optional() });

export const deviceRegisterSchema = z.object({
  deviceId: z.string().min(2).max(64), deviceType: z.enum(DEVICE_TYPES), deviceName: z.string().min(1).max(120),
  locationId: z.string().min(1).max(120), firmwareVersion: z.string().max(40).optional(),
});
export const deviceCreateSchema = z.object({
  deviceId: z.string().min(2).max(64), name: z.string().min(1), type: z.enum(DEVICE_TYPES), location: z.string().min(1),
  firmwareVersion: z.string().optional(), config: z.record(z.any()).optional(),
});
export const deviceUpdateSchema = deviceCreateSchema.partial().extend({ authorized: z.boolean().optional() });
export const heartbeatSchema = z.object({
  deviceId: z.string(), timestamp: sanityTs.optional(), firmwareVersion: z.string().optional(),
  uptimeSeconds: z.number().int().nonnegative().optional(), signalStrength: z.number().int().optional(),
  cameraId: z.string().optional(), sensorId: z.string().optional(), status: z.enum(['OK', 'WARNING']).optional(),
});

export const cameraSchema = z.object({
  cameraId: z.string().min(2).max(64), name: z.string().min(1), location: z.string().min(1), streamUrl: opt(z.string().url()),
  deviceId: opt(z.string()), isEntryCamera: z.boolean().optional(), captureIntervalSeconds: z.number().int().min(1).max(3600).optional(),
});
export const cameraUpdateSchema = cameraSchema.partial();

export const sensorSchema = z.object({
  sensorId: z.string().min(2).max(64), name: z.string().min(1), type: z.enum(SENSOR_TYPES), unit: z.string().min(1).max(16),
  location: z.string().min(1), deviceId: opt(z.string()),
  warningThreshold: opt(z.number()), criticalThreshold: opt(z.number()), lowWarningThreshold: opt(z.number()),
  requiredAbnormalReadings: z.number().int().min(1).max(50).optional(),
  rateOfChangeLimit: opt(z.number().positive()), staleAfterSeconds: z.number().int().min(5).max(86400).optional(),
});
export const sensorUpdateSchema = sensorSchema.partial();

const readingBase = z.object({
  eventId: z.string().min(3).max(100), value: z.number().finite().optional(), unit: z.string().max(16).optional(),
  timestamp: sanityTs,
  grid: z.object({ rows: z.number().int().positive(), columns: z.number().int().positive(), values: z.array(z.number()).max(4096) }).optional(),
}).refine((r) => r.value !== undefined || r.grid, 'value or grid is required');
export const readingBatchSchema = z.object({
  deviceId: z.string(),
  readings: z.array(readingBase.and(z.object({ sensorId: z.string(), sensorType: z.enum(SENSOR_TYPES).optional() }))).min(1).max(200),
});
export const singleReadingSchema = z.object({
  eventId: z.string().min(3).max(100).optional(), value: z.number().finite().optional(), unit: z.string().max(16).optional(),
  timestamp: sanityTs.optional(),
  grid: z.object({ rows: z.number(), columns: z.number(), values: z.array(z.number()).max(4096) }).optional(),
});

export const imageFieldsSchema = z.object({
  cameraId: z.string().min(1), deviceId: z.string().optional(), timestamp: sanityTs, location: z.string().min(1).optional(),
  locationId: z.string().optional(), commandId: z.string().optional(), accessLogId: z.string().optional(),
});

export const accessEventSchema = z.object({
  eventId: z.string().min(3).max(100), deviceId: z.string(), readerId: z.string().optional(),
  rfidUid: z.string().min(4).max(32).regex(/^[A-Za-z0-9]+$/), timestamp: sanityTs,
});

export const workerSchema = z.object({
  employeeId: z.string().min(1), name: z.string().min(1), department: opt(z.string()), designation: opt(z.string()),
  photoUrl: opt(z.string().url()), rfidUid: opt(z.string().regex(/^[A-Za-z0-9]+$/)), status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});
export const workerUpdateSchema = workerSchema.partial();

export const zoneSchema = z.object({
  name: z.string().min(1), location: z.string().min(1), cameraId: z.string().min(1), active: z.boolean().optional(),
  region: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().min(0).max(1), height: z.number().min(0).max(1) }).nullish(),
});
export const zoneUpdateSchema = zoneSchema.partial();

export const incidentCreateSchema = z.object({
  type: z.enum(['NO_HELMET', 'NO_SAFETY_VEST', 'NO_GLOVES', 'NO_SAFETY_SHOES', 'GAS_LEAK', 'SMOKE', 'FIRE', 'HIGH_TEMPERATURE', 'THERMAL_ANOMALY', 'ELECTRICAL_ANOMALY', 'RESTRICTED_ZONE', 'UNKNOWN_HAZARD', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']), location: z.string().min(1), notes: z.string().max(2000).optional(),
});
export const incidentUpdateSchema = z.object({ notes: z.string().max(2000).optional(), severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional() });
export const resolveSchema = z.object({ notes: z.string().max(2000).optional() });

export const commandAckSchema = z.object({
  commandId: z.string(), deviceId: z.string(), status: z.enum(['ACCEPTED', 'RUNNING', 'COMPLETED', 'FAILED']),
  timestamp: isoTs.optional(), result: z.record(z.any()).optional(),
});

export const rangeSchema = z.object({ range: z.enum(['today', '7d', '30d', 'custom']).default('7d'), from: z.string().optional(), to: z.string().optional() });
