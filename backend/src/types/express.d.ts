import type { Role, Device } from '@prisma/client';
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: Role };
      device?: Device;
    }
  }
}
export {};
