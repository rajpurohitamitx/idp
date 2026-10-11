export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type OnlineStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'PROCESSING';
export type HazardSource = 'CAMERA' | 'SENSOR' | 'FUSED' | 'MANUAL';
export interface Camera { id: string; cameraId: string; name: string; location: string; status: OnlineStatus; isEntryCamera: boolean; lastHeartbeat: string | null }
export interface Sensor { id: string; sensorId: string; name: string; type: string; unit: string; location: string; status: OnlineStatus; warningThreshold: number | null; criticalThreshold: number | null; lastValue: number | null; lastReadingAt: string | null; history?: Array<{ value: number | null; timestamp: string; level: string }> }
export interface Device { id: string; deviceId: string; name: string; type: string; location: string; status: OnlineStatus; lastHeartbeat: string | null }
export interface BoundingBox { x: number; y: number; width: number; height: number }
export interface Detection { type: string; confidence: number; boundingBox: BoundingBox }
export interface PpeSummary { helmet: string; vest: string; gloves: string; shoes: string; personDetected: boolean; violations: string[] }
export interface Hazard { id: string; hazardId: string; type: string; severity: Severity; location: string; source: HazardSource; confidence: number | null; status: string; createdAt: string }
export interface Alert { id: string; kind: string; title: string; message: string; severity: Severity; status: string; location: string | null; hazardId: string | null; createdAt: string }
export interface Incident { id: string; incidentId: string; severity: Severity; location: string; source: HazardSource; status: string; detectedAt: string; resolvedAt: string | null }
export interface Worker { id: string; employeeId: string; name: string; department: string | null; designation: string | null; rfidUid: string | null; status: string }
export interface DashboardSnapshot {
  activeAlerts: number; activeHazards: number; onlineCameras: number; onlineSensors: number; onlineDevices: number;
  workersMonitored: number; ppeCompliance: number | null;
  latestImage: { imageId: string; location: string; capturedAt: string; storagePath: string; camera: Camera; analysis: { detections: Detection[]; ppeSummary: PpeSummary; overallResult: string; confidence: number } | null } | null;
  latestReadings: Array<{ sensorId: string; value: number | null; unit: string; timestamp: string; sensor: Sensor }>;
}
