import dotenv from 'dotenv';
import mongoose from 'mongoose';
<<<<<<< HEAD
=======
import app from './app.js';
>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53

dotenv.config();

const port = Number(process.env.PORT || 5000);

async function connectToDatabase() {
  if (!process.env.MONGODB_URI) {
    console.info('MONGODB_URI not set. Serving pages from parsed legacy files.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.info('Connected to MongoDB.');
  } catch (error) {
    console.error('MongoDB connection failed. Continuing in fallback mode.');
    console.error(error);
  }
}

async function startServer() {
<<<<<<< HEAD
  const [{ default: app }, { initializeCampaignRuntime }] = await Promise.all([
    import('./app.js'),
    import('./services/campaignService.js'),
  ]);

  await connectToDatabase();
  initializeCampaignRuntime();
=======
  await connectToDatabase();
>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53

  app.listen(port, () => {
    console.info(`API server listening on http://localhost:${port}`);
  });
}

startServer();
<<<<<<< HEAD
=======

>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53
