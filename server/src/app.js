import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import pageRoutes from './routes/pageRoutes.js';


const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(serverRoot, '..');
const uploadsDir = path.join(projectRoot, 'uploads');
const clientDistDir = path.join(projectRoot, 'client', 'dist');
const clientIndexPath = path.join(clientDistDir, 'index.html');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
  })
);
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: process.env.MONGODB_URI ? 'mongodb-enabled' : 'filesystem-fallback',
  });
});

app.use('/api/pages', pageRoutes);

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
  res.status(500).json({
    message: 'Internal server error.',
  });
});

export default app;

