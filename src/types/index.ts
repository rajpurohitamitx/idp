export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type HazardSource = 'CAMERA' | 'SENSOR' | 'FUSED' | 'MANUAL';
export type SensorType = 'GAS' | 'SMOKE' | 'TEMPERATURE' | 'HUMIDITY' | 'ELECTRICAL' | 'THERMAL' | 'OTHER';
export type HazardType =
  | 'NO_HELMET' | 'NO_SAFETY_VEST' | 'NO_GLOVES' | 'NO_SAFETY_SHOES'
  | 'GAS_LEAK' | 'SMOKE' | 'FIRE' | 'HIGH_TEMPERATURE' | 'THERMAL_ANOMALY' | 'ELECTRICAL_ANOMALY'
  | 'RESTRICTED_ZONE' | 'UNKNOWN_HAZARD' | 'OTHER';
export type ReadingLevel = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'ANOMALY';

export interface BoundingBox { x: number; y: number; width: number; height: number }
export interface Detection { type: string; confidence: number; boundingBox: BoundingBox }

export interface SystemConfig {
  camera: {
    minimumConfidence: number;
    requiredConsecutiveDetections: number;
    cooldownSeconds: number;
    maxFrameGapSeconds: number;
    entryCheckSingleFrame: boolean;
  };
  sensor: {
    defaultRequiredAbnormalReadings: number;
    criticalBypassesPersistence: boolean;
    anomalyEnabled: boolean;
    anomalyHistorySize: number;
    anomalyMinSamples: number;
    anomalyModifiedZ: number;
    anomalyMinMad: number;
    cooldownSeconds: number;
  };
  fusion: {
    correlationWindowSeconds: number;
    relatedTypes: Partial<Record<HazardType, HazardType[]>>;
  };
  severity: {
    cameraBase: Partial<Record<HazardType, Severity>>;
    lowConfidenceBelow: number;
    criticalMultiplier: number;
    sensorWarning: Severity;
    sensorCritical: Severity;
    sensorAnomaly: Severity;
  };
  heartbeat: {
    intervalSeconds: number;
    timeoutSeconds: number;
    sensorUploadIntervalSeconds: number;
    imageCaptureIntervalSeconds: number;
  };
  commands: { ttlSeconds: number };
  entry: { pendingPpeWindowSeconds: number };
}
