// Registers the AFF API's top-level URLs. Feature-specific paths remain in each module's routes file.
// Path/module list matches docs/api_design.md's Endpoint Quick Reference (§1.1).
import type { Express, Request, Response } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import mediaRoutes from './modules/media/media.routes.js';
import listingRoutes from './modules/listings/listing.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import subscriptionRoutes, { recipientPreferencesRoutes } from './modules/subscriptions/subscription.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import deliveryRoutes from './modules/delivery/delivery.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';

function registerRoutes(app: Express) {
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'aff-backend' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/listings', listingRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/recipients', recipientPreferencesRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/deliveries', deliveryRoutes);
  app.use('/api/webhooks', paymentsRoutes);
}

export { registerRoutes };
