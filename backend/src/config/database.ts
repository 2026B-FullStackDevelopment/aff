// Connects Mongoose to MongoDB for repository/model data access.
import mongoose from 'mongoose';
import { env } from './env.js';

async function connectDatabase() {
  await mongoose.connect(env.mongodbUri);
  console.log('Connected to MongoDB');
}

export { connectDatabase };
