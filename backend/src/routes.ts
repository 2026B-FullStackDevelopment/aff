// Registers the AFF API's top-level URLs. Feature-specific paths remain in each module's routes file.
import type { Express, Request, Response } from 'express';

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const foodRoutes = require('./modules/food/food.routes');
const reservationRoutes = require('./modules/reservations/reservation.routes');
const subscriptionRoutes = require('./modules/subscriptions/subscription.routes');
const adminRoutes = require('./modules/admin/admin.routes');

function registerRoutes(app: Express) {
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'aff-backend' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/food', foodRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/admin', adminRoutes);
}

module.exports = { registerRoutes };
