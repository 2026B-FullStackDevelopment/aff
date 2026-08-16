// Starts the backend server after the database connection is ready.
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { connectDatabase, registerGracefulShutdown } from './config/database.js';
import { env } from './config/env.js';
import { initializeSocketServer } from './realtime/socket.js';

async function startServer() {
  await connectDatabase();
  registerGracefulShutdown();

  const app = createApp();

  // Create one HTTP server for both Express and Socket.IO.
  const httpServer = createServer(app);

  // Attach Socket.IO to the same HTTP server.
  initializeSocketServer(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`AFF backend running on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start AFF backend:', error);
  process.exit(1);
});
