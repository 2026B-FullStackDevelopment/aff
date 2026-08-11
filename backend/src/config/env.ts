// Reads backend environment variables in one place so modules do not access process.env directly.
import 'dotenv/config';

function requireVar(vars: NodeJS.ProcessEnv, key: string): string {
  const value = vars[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function loadEnv(vars: NodeJS.ProcessEnv = process.env) {
  return {
    mongoUri: requireVar(vars, 'MONGO_URI'),

    jwtSecret: requireVar(vars, 'JWT_SECRET'),
    jwtExpiresIn: vars.JWT_EXPIRES_IN || '1h',

    bcryptRounds: Number(vars.BCRYPT_ROUNDS || 12),
    loginMaxAttempts: Number(vars.LOGIN_MAX_ATTEMPTS || 5),
    loginWindowSeconds: Number(vars.LOGIN_WINDOW_SECONDS || 60),
    lockoutMinutes: Number(vars.LOCKOUT_MINUTES || 5),

    port: Number(vars.PORT || 5000),
    nodeEnv: vars.NODE_ENV || 'development',

    stripeSecretKey: vars.STRIPE_SECRET_KEY,
    stripeWebhookSecret: vars.STRIPE_WEBHOOK_SECRET,

    supabaseUrl: vars.SUPABASE_URL,
    supabaseServiceKey: vars.SUPABASE_SERVICE_KEY,

    emailHost: vars.EMAIL_HOST,
    emailPort: Number(vars.EMAIL_PORT || 587),
    emailUser: vars.EMAIL_USER,
    emailPass: vars.EMAIL_PASS,

    clientUrl: vars.CLIENT_URL || 'http://localhost:5173',
  };
}

const env = loadEnv();

export { env, loadEnv };
