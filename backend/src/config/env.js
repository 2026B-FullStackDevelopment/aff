// Reads backend environment variables in one place so modules do not access process.env directly.
require('dotenv').config();

const env = {
  port: Number(process.env.PORT || 5000),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aff',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};

module.exports = { env };
