import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { testConnection as testPostgresConnection } from './db/index.js';

dotenv.config();

const port = Number(process.env.PORT || 5000);

async function connectToDatabases() {
  // Test PostgreSQL connection
  await testPostgresConnection();

  // Connect to MongoDB if MONGODB_URI is provided
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.info('Connected to MongoDB (Secondary/Legacy mode).');
    } catch (error) {
      console.error('MongoDB connection failed:', error.message);
    }
  } else {
    console.info('MONGODB_URI not set. Running purely on PostgreSQL.');
  }
}

async function startServer() {
  const [{ default: app }, { initializeCrmRuntime }] = await Promise.all([
    import('./app.js'),
    import('./services/crmRuntime.js'),
  ]);

  await connectToDatabases();

  const { bootstrapAdminUser } = await import('./services/bootstrapUsers.js');
  const { initializeRevisionModels } = await import('./services/revisionRegistry.js');
  await bootstrapAdminUser();
  initializeRevisionModels();

  initializeCrmRuntime();

  app.listen(port, () => {
    console.info(`API server listening on http://localhost:${port}`);
  });
}

startServer();
