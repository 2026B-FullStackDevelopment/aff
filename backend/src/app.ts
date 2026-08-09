// Builds the Express app and wires shared middleware plus module routes.
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { registerRoutes } from './routes.js';

function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(morgan('dev'));
  app.use(express.json());

  registerRoutes(app);

  app.use(errorMiddleware);

  return app;
}

export { createApp };
