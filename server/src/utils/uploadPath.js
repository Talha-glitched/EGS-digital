import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getUploadsDir() {
  if (process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_DIR);
  }

  const candidates = [
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(process.cwd(), '../uploads'),
    path.resolve(__dirname, '../../../uploads'),
    path.resolve(__dirname, '../../uploads'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  const defaultDir = path.resolve(process.cwd(), 'uploads');
  if (!existsSync(defaultDir)) {
    mkdirSync(defaultDir, { recursive: true });
  }
  return defaultDir;
}

export const UPLOADS_DIR = getUploadsDir();

export function getUploadSubdir(subpath) {
  const dir = path.join(UPLOADS_DIR, subpath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}
