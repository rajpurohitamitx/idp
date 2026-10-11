import multer from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/http';

export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.IMAGE_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED_MIME.includes(file.mimetype) ? cb(null, true) : cb(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG or WebP images are allowed')),
});

export function sniffImage(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}
