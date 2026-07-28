// Builds the Express app and wires shared middleware plus module routes.
const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const { errorMiddleware } = require('./middleware/error.middleware');
const { registerRoutes } = require('./routes');

function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());

  registerRoutes(app);

  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };
