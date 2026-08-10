// Connects Mongoose to MongoDB for repository/model data access.
import mongoose from 'mongoose';
import { env } from './env.js';

async function connectDatabase() {
  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  await mongoose.connect(env.mongoUri, {
    autoIndex: env.nodeEnv === 'development',
  });
  console.log('Connected to MongoDB');
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

export { connectDatabase, shutdown, registerGracefulShutdown };
