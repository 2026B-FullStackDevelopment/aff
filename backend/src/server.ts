// Starts the backend server after the database connection is ready.
import { createApp } from './app.js';
import { connectDatabase, registerGracefulShutdown } from './config/database.js';
import { env } from './config/env.js';

async function startServer() {
  await connectDatabase();
  registerGracefulShutdown();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`AFF backend running on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start AFF backend:', error);
  process.exit(1);
});
