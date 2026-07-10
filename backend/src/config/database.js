// Connects Mongoose to MongoDB for repository/model data access.
const mongoose = require('mongoose');
const { env } = require('./env');

async function connectDatabase() {
  await mongoose.connect(env.mongodbUri);
  console.log('Connected to MongoDB');
}

module.exports = { connectDatabase };
