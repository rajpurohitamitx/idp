import { prisma } from '../config/db';
import { h, ok, notFound, badRequest } from '../utils/http';
import { audit } from '../utils/audit';
import { cameraSchema, cameraUpdateSchema, imageFieldsSchema } from '../validators';
import { issueCaptureCommand } from '../services/device/commandService';
import { sniffImage } from '../middleware/upload';
import { ingestImage } from '../services/camera/imageIngestService';

const safe = (c: any) => ({ id: c.id, cameraId: c.cameraId, name: c.name, location: c.location, streamUrl: c.streamUrl, status: c.status, deviceId: c.deviceId, isEntryCamera: c.isEntryCamera, captureIntervalSeconds: c.captureIntervalSeconds, lastHeartbeat: c.lastHeartbeat });

export const listCameras = h(async (_req, res) => ok(res, (await prisma.camera.findMany({ orderBy: { createdAt: 'desc' } })).map(safe)));
export const getCamera = h(async (req, res) => {
  const c = await prisma.camera.findUnique({ where: { cameraId: req.params.id }, include: { images: { orderBy: { capturedAt: 'desc' }, take: 1, include: { analysis: true } } } });
  if (!c) throw notFound(); ok(res, { ...safe(c), latestImage: c.images[0] ?? null });
});
export const createCamera = h(async (req, res) => {
  const input = cameraSchema.parse(req.body);
  let deviceDbId: string | undefined;
  if (input.deviceId) { const d = await prisma.device.findUnique({ where: { deviceId: input.deviceId } }); if (!d) throw badRequest('Unknown deviceId'); deviceDbId = d.id; }
  const camera = await prisma.camera.create({ data: { cameraId: input.cameraId, name: input.name, location: input.location, streamUrl: input.streamUrl ?? undefined, isEntryCamera: input.isEntryCamera, captureIntervalSeconds: input.captureIntervalSeconds, deviceId: deviceDbId } });
  await audit(req.user!.email, 'camera_create', { userId: req.user!.id, entity: 'Camera', entityId: camera.id });
  ok(res, safe(camera), 'Camera created', 201);
});
export const updateCamera = h(async (req, res) => {
  const input = cameraUpdateSchema.parse(req.body);
  const camera = await prisma.camera.update({ where: { cameraId: req.params.id }, data: input as any });
  await audit(req.user!.email, 'camera_update', { userId: req.user!.id, entity: 'Camera', entityId: camera.id });
  ok(res, safe(camera), 'Camera updated');
});
export const deleteCamera = h(async (req, res) => {
  await prisma.camera.delete({ where: { cameraId: req.params.id } });
  await audit(req.user!.email, 'camera_delete', { userId: req.user!.id, entity: 'Camera', entityId: req.params.id });
  ok(res, {}, 'Camera deleted');
});

export const cameraHeartbeat = h(async (req, res) => {
  const camera = await prisma.camera.update({ where: { cameraId: req.params.id }, data: { status: 'ONLINE', lastHeartbeat: new Date() } });
  ok(res, { status: camera.status });
});

export const requestCapture = h(async (req, res) => {
  const cmd = await issueCaptureCommand(req.params.id);
  ok(res, { commandId: cmd.commandId, status: cmd.status, expiresAt: cmd.expiresAt }, 'Capture requested', 202);
});

export const analyzeImageUpload = h(async (req, res) => {
  if (!req.file) throw badRequest('image file is required');
  const mime = sniffImage(req.file.buffer);
  if (!mime) throw badRequest('File content does not match an allowed image type (JPEG/PNG/WebP)');
  const fields = imageFieldsSchema.parse(req.body);
  const result = await ingestImage({
    buf: req.file.buffer, mimeType: mime, cameraId: fields.cameraId, deviceId: fields.deviceId ?? req.device?.deviceId,
    capturedAt: fields.timestamp, location: fields.location, purpose: 'MONITORING',
  });
  ok(res, {
    imageId: result.image.imageId, status: result.image.status, overallResult: result.overallResult, ppe: result.ppe,
    hazardsCreated: result.hazards.length,
  }, 'Image analyzed', 201);
});
