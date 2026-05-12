import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
<<<<<<< HEAD
import adminRoutes from './routes/adminRoutes.js';
import pageRoutes from './routes/pageRoutes.js';
import unsubscribeRoutes from './routes/unsubscribeRoutes.js';

const __filename = fileURLToPath(import.meta.url);
=======
import pageRoutes from './routes/pageRoutes.js';


>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53
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
<<<<<<< HEAD
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
=======
  })
);
app.use(express.json());
>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: process.env.MONGODB_URI ? 'mongodb-enabled' : 'filesystem-fallback',
  });
});

<<<<<<< HEAD
app.use('/api/admin', adminRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/unsubscribe', unsubscribeRoutes);

=======
app.use('/api/pages', pageRoutes);
>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53

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
<<<<<<< HEAD
  res.status(error.status || 500).json({
    message: error.status ? error.message : 'Internal server error.',
=======
  res.status(500).json({
    message: 'Internal server error.',
>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53
  });
});

export default app;

