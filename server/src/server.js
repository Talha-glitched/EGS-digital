import dotenv from 'dotenv';
import { testConnection as testPostgresConnection } from './db/index.js';

dotenv.config();

const port = Number(process.env.PORT || 5000);

async function startServer() {
  const [{ default: app }, { initializeCrmRuntime }] = await Promise.all([
    import('./app.js'),
    import('./services/crmRuntime.js'),
  ]);

  // Verify PostgreSQL connection
  await testPostgresConnection();

  const { bootstrapAdminUser } = await import('./services/bootstrapUsers.js');
  await bootstrapAdminUser();

  initializeCrmRuntime();

  app.listen(port, () => {
    console.info(`API server listening on http://localhost:${port}`);
  });
}

startServer();
