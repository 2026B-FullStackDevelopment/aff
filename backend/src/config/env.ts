// Reads backend environment variables in one place so modules do not access process.env directly.
import 'dotenv/config';

const env = {
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aff',

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',

  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',

  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,

  emailHost: process.env.EMAIL_HOST,
  emailPort: Number(process.env.EMAIL_PORT || 587),
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,

  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

export { env };
