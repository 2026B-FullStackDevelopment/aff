// Connects Mongoose to MongoDB for repository/model data access.
import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Builds every index declared on every registered model, dropping any index
 * that is no longer in a schema.
 *
 * This runs explicitly rather than through Mongoose's `autoIndex`, and in
 * every environment rather than only development, because several of this
 * application's correctness guarantees *are* indexes rather than application
 * logic:
 *
 * - `DELIVERY { courierId }` unique partial enforces one active Delivery per
 *   Courier (E3/E4). Without it, `claimDelivery`'s duplicate-key branch is
 *   dead code and a Courier can hold two jobs.
 * - `DELIVERY { orderId }` unique makes `createForOrder` idempotent (E12).
 *   Without it, the Stripe webhook's at-least-once delivery can create two
 *   Deliveries for one Order.
 * - `USER { email }` unique is the real guard behind registration's 409.
 * - `REVOKED_TOKEN { expiresAt }` TTL is what stops that collection growing
 *   without bound.
 *
 * Errors deliberately propagate: booting an API whose uniqueness constraints
 * are missing is worse than failing to boot, because the resulting corruption
 * is silent and permanent.
 *
 * Ordering note: this relies on every model having been registered by import
 * time. `server.ts` statically imports `app.ts`, which transitively imports
 * every route, controller, service, repository and model, so the whole model
 * graph is evaluated before `startServer()` runs. Converting any of those to a
 * dynamic `await import(...)` would silently reduce what gets synced — the
 * "syncing N models" log line is there to make that visible.
 */
async function syncIndexes(): Promise<void> {
  const modelNames = mongoose.modelNames();

  if (modelNames.length === 0) return;

  console.log(`Syncing indexes for ${modelNames.length} models...`);

  const results = await Promise.all(
    modelNames.map(async (name) => ({
      name,
      dropped: await mongoose.model(name).syncIndexes(),
    })),
  );

  // syncIndexes drops indexes that are not in the schema. Log them: a drop is
  // usually intended (a schema changed), but an unexpected one means somebody
  // created an index by hand that this code has just removed.
  for (const { name, dropped } of results) {
    if (dropped?.length) {
      console.warn(`Dropped indexes not declared in ${name}: ${dropped.join(', ')}`);
    }
  }

  console.log('Indexes are in sync');
}

async function connectDatabase() {
  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  // autoIndex is off everywhere so index creation is one explicit, observable
  // step rather than a silent side effect that behaves differently per
  // environment. See syncIndexes above.
  await mongoose.connect(env.mongoUri, {
    autoIndex: false,
  });
  console.log('Connected to MongoDB');

  await syncIndexes();
}

async function shutdown(signal: string, exit: (code: number) => void = process.exit) {
  console.log(`Received ${signal}, closing MongoDB connection...`);
  await mongoose.disconnect();
  exit(0);
}

function registerGracefulShutdown() {
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

export { connectDatabase, syncIndexes, shutdown, registerGracefulShutdown };
