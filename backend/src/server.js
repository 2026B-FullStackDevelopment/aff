// Starts the backend server after the database connection is ready.
const { createApp } = require('./app');
const { connectDatabase } = require('./config/database');
const { env } = require('./config/env');

async function startServer() {
  await connectDatabase();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`AFF backend running on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start AFF backend:', error);
  process.exit(1);
});
