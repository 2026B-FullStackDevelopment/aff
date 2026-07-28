// Builds the Express app and wires shared middleware plus module routes.
const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const { errorMiddleware } = require('./middleware/error.middleware');
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const foodRoutes = require('./modules/food/food.routes');
const reservationRoutes = require('./modules/reservations/reservation.routes');
const subscriptionRoutes = require('./modules/subscriptions/subscription.routes');
const adminRoutes = require('./modules/admin/admin.routes');

function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'aff-backend' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/food', foodRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };
