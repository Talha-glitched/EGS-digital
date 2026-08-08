import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getUploadsDir() {
  if (process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_DIR);
  }

  // Priority for Docker / Coolify environments
  if (existsSync('/app/uploads')) {
    return '/app/uploads';
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

  // Fallback for Docker container starting up for the first time
  if (process.cwd().startsWith('/app')) {
    const appUploads = '/app/uploads';
    if (!existsSync(appUploads)) {
      try {
        mkdirSync(appUploads, { recursive: true });
      } catch {
        // ignore if permissions handled by container mount
      }
    }
    return appUploads;
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
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      // ignore
    }
  }
  return dir;
}
