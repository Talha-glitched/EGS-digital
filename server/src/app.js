import path from 'path';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import adminRoutes from './routes/adminRoutes.js';
import pageRoutes from './routes/pageRoutes.js';
import trackRoutes from './routes/trackRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';

import { UPLOADS_DIR } from './utils/uploadPath.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(serverRoot, '..');
const clientDistDir = path.join(projectRoot, 'client', 'dist');
const clientIndexPath = path.join(clientDistDir, 'index.html');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || false,
    credentials: true,
  })
);
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: process.env.MONGODB_URI ? 'mongodb-enabled' : 'filesystem-fallback',
  });
});

app.get('/api/health/uploads-debug', (_req, res) => {
  try {
    const contents = existsSync(UPLOADS_DIR) ? readdirSync(UPLOADS_DIR) : [];
    const inventoryDir = path.join(UPLOADS_DIR, 'inventory');
    const inventoryContents = existsSync(inventoryDir) ? readdirSync(inventoryDir) : [];
    res.json({
      ok: true,
      cwd: process.cwd(),
      uploadsDir: UPLOADS_DIR,
      uploadsDirExists: existsSync(UPLOADS_DIR),
      uploadsContents: contents,
      inventoryDir,
      inventoryContents,
      env: {
        CLIENT_URL: process.env.CLIENT_URL || null,
        VITE_API_URL: process.env.VITE_API_URL || null,
        UPLOADS_DIR: process.env.UPLOADS_DIR || null,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use('/api/admin', adminRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/webhooks', webhookRoutes);

if (existsSync(clientDistDir) && existsSync(clientIndexPath)) {
  app.use(express.static(clientDistDir));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    return res.sendFile(clientIndexPath);
  });
}

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.path}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.status ? error.message : 'Internal server error.',
  });
});

export default app;
