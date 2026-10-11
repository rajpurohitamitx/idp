import { prisma } from '../../config/db';
import { emit } from '../../sockets';
import { newId } from '../../utils/ids';
import type { HazardSource, HazardType, Severity } from '../../types';
import { findCorrelations, fuseConfidence, fusedHazardType, type FusionEvent } from '../fusion/fusionEngine';
import { severityForFusion } from '../hazard/severityEngine';
import { getConfig } from '../../config/settings';

export interface CreateHazardInput {
  type: HazardType; severity: Severity; location: string; source: Exclude<HazardSource, 'FUSED'>;
  cameraId?: string | null; sensorId?: string | null; imageId?: string | null; workerId?: string | null; confidence?: number | null;
  details?: Record<string, unknown>;
}

export async function createHazard(input: CreateHazardInput) {
  const cfg = await getConfig();
  const hazard = await prisma.hazard.create({
    data: {
      hazardId: newId('HZ'), type: input.type, severity: input.severity, location: input.location, source: input.source,
      cameraId: input.cameraId ?? undefined, sensorId: input.sensorId ?? undefined, imageId: input.imageId ?? undefined, workerId: input.workerId ?? undefined,
      confidence: input.confidence ?? undefined, details: (input.details ?? {}) as any,
    },
  });
  emit('hazard_detected', serializeHazard(hazard));

  const oppositeSource = input.source === 'CAMERA' ? 'SENSOR' : 'CAMERA';
  const windowStart = new Date(Date.now() - cfg.fusion.correlationWindowSeconds * 1000);
  const candidates = await prisma.hazard.findMany({
    where: { source: oppositeSource, status: 'ACTIVE', lastSeenAt: { gte: windowStart } },
    orderBy: { lastSeenAt: 'desc' }, take: 25,
  });
  const evt: FusionEvent = { id: hazard.id, source: input.source as 'CAMERA' | 'SENSOR', type: input.type, location: input.location, timestampMs: hazard.lastSeenAt.getTime(), confidence: input.confidence, severity: input.severity };
  const candidateEvts: FusionEvent[] = candidates.map((c) => ({ id: c.id, source: c.source as 'CAMERA' | 'SENSOR', type: c.type as HazardType, location: c.location, timestampMs: c.lastSeenAt.getTime(), confidence: c.confidence, severity: c.severity as Severity }));
  const matches = findCorrelations(evt, candidateEvts, cfg.fusion);

  let alertHazard = hazard;
  if (matches.length) {
    const match = matches[0];
    const matchRow = candidates.find((c) => c.id === match.id)!;
    const fusedType = fusedHazardType(input.source === 'CAMERA' ? input.type : (matchRow.type as HazardType), input.source === 'SENSOR' ? input.type : (matchRow.type as HazardType));
    const fusedSeverity = severityForFusion(input.severity, matchRow.severity as Severity);
    const fusedConfidence = fuseConfidence(input.confidence ?? 0.7, matchRow.confidence ?? 0.7);
    const fused = await prisma.hazard.create({
      data: {
        hazardId: newId('HZ'), type: fusedType, severity: fusedSeverity, location: input.location, source: 'FUSED', confidence: fusedConfidence,
        cameraId: input.source === 'CAMERA' ? input.cameraId ?? undefined : matchRow.cameraId ?? undefined,
        sensorId: input.source === 'SENSOR' ? input.sensorId ?? undefined : matchRow.sensorId ?? undefined,
        imageId: input.imageId ?? undefined,
        details: { cameraEvidence: input.source === 'CAMERA' ? input : matchRow, sensorEvidence: input.source === 'SENSOR' ? input : matchRow, correlatedHazardIds: [hazard.id, matchRow.id] } as any,
      },
    });
    await prisma.hazard.updateMany({ where: { id: { in: [hazard.id, matchRow.id] } }, data: { status: 'RESOLVED', details: { supersededBy: fused.hazardId } as any } });
    emit('hazard_updated', serializeHazard(fused));
    alertHazard = fused;
  }

  const alert = await prisma.alert.create({
    data: {
      kind: 'HAZARD', title: titleFor(alertHazard.type as HazardType, alertHazard.source as HazardSource), message: messageFor(alertHazard), severity: alertHazard.severity as Severity,
      hazardId: alertHazard.id, location: alertHazard.location,
    },
  });
  emit('new_alert', serializeAlert(alert));
  if (alertHazard.type === 'NO_HELMET' || alertHazard.type === 'NO_SAFETY_VEST' || alertHazard.type === 'NO_GLOVES' || alertHazard.type === 'NO_SAFETY_SHOES') {
    emit('ppe_violation', serializeHazard(alertHazard));
  }

  const incident = await prisma.incident.create({
    data: { incidentId: newId('INC'), hazardId: alertHazard.id, severity: alertHazard.severity as Severity, location: alertHazard.location, source: alertHazard.source as HazardSource, imageId: alertHazard.imageId ?? undefined, detectedAt: alertHazard.createdAt },
  });
  emit('incident_created', incident);

  return { hazard: alertHazard, fused: matches.length > 0, alert, incident };
}

function titleFor(type: HazardType, source: HazardSource) {
  const label = type.replace(/_/g, ' ');
  return source === 'FUSED' ? `Correlated hazard: ${label}` : label;
}
function messageFor(h: { type: string; location: string; confidence: number | null }) {
  return `${h.type.replace(/_/g, ' ')} at ${h.location}${h.confidence != null ? ` (confidence ${(h.confidence * 100).toFixed(0)}%)` : ''}`;
}
export const serializeHazard = (h: any) => ({ id: h.id, hazardId: h.hazardId, type: h.type, severity: h.severity, location: h.location, source: h.source, confidence: h.confidence, status: h.status, createdAt: h.createdAt });
export const serializeAlert = (a: any) => ({ id: a.id, kind: a.kind, title: a.title, message: a.message, severity: a.severity, status: a.status, hazardId: a.hazardId, location: a.location, createdAt: a.createdAt });
