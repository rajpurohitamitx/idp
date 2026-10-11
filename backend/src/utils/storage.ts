import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';

export interface ImageStorage {
  save(key: string, data: Buffer): Promise<string>;
  read(storagePath: string): Promise<Buffer>;
}

class LocalImageStorage implements ImageStorage {
  private root = path.resolve(env.IMAGE_STORAGE_PATH);
  async save(key: string, data: Buffer) {
    const safe = key.replace(/[^a-zA-Z0-9._-]/g, '_');
    const day = new Date().toISOString().slice(0, 10);
    const rel = path.join(day, safe);
    const full = path.join(this.root, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    return rel;
  }
  async read(storagePath: string) {
    const full = path.resolve(this.root, storagePath);
    if (!full.startsWith(this.root)) throw new Error('Invalid storage path');
    return fs.readFile(full);
  }
}
export const imageStorage: ImageStorage = new LocalImageStorage();
