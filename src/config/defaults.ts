import type { SystemConfig } from '../types';

export const DEFAULT_CONFIG: SystemConfig = {
  camera: {
    minimumConfidence: 0.6,
    requiredConsecutiveDetections: 3,
    cooldownSeconds: 60,
    maxFrameGapSeconds: 15,
    entryCheckSingleFrame: true,
  },
  sensor: {
    defaultRequiredAbnormalReadings: 2,
    criticalBypassesPersistence: true,
    anomalyEnabled: true,
    anomalyHistorySize: 12,
    anomalyMinSamples: 5,
    anomalyModifiedZ: 6,
    anomalyMinMad: 0.5,
    cooldownSeconds: 60,
  },
  fusion: {
    correlationWindowSeconds: 30,
    relatedTypes: {
      SMOKE: ['SMOKE', 'GAS_LEAK', 'FIRE'],
      GAS_LEAK: ['SMOKE', 'GAS_LEAK'],
      FIRE: ['FIRE', 'SMOKE', 'HIGH_TEMPERATURE', 'THERMAL_ANOMALY'],
      HIGH_TEMPERATURE: ['FIRE', 'HIGH_TEMPERATURE', 'THERMAL_ANOMALY'],
      THERMAL_ANOMALY: ['FIRE', 'HIGH_TEMPERATURE', 'THERMAL_ANOMALY'],
      ELECTRICAL_ANOMALY: ['FIRE', 'THERMAL_ANOMALY', 'ELECTRICAL_ANOMALY'],
    },
  },
  severity: {
    cameraBase: {
      NO_HELMET: 'HIGH', NO_SAFETY_VEST: 'MEDIUM', NO_GLOVES: 'MEDIUM', NO_SAFETY_SHOES: 'MEDIUM',
      RESTRICTED_ZONE: 'HIGH', SMOKE: 'HIGH', FIRE: 'CRITICAL', UNKNOWN_HAZARD: 'LOW', OTHER: 'LOW',
    },
    lowConfidenceBelow: 0.7,
    criticalMultiplier: 1.25,
    sensorWarning: 'MEDIUM',
    sensorCritical: 'HIGH',
    sensorAnomaly: 'MEDIUM',
  },
  heartbeat: {
    intervalSeconds: 30,
    timeoutSeconds: 90,
    sensorUploadIntervalSeconds: 5,
    imageCaptureIntervalSeconds: 10,
  },
  commands: { ttlSeconds: 30 },
  entry: { pendingPpeWindowSeconds: 60 },
};
