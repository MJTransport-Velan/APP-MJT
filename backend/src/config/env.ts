import dotenv from 'dotenv';

dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: required('DATABASE_URL'),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  // Comma-separated list. More than one origin is now normal: the ERP frontend
  // and the public MJ Express website are separate deployments that both call
  // this API. A bare single origin in CORS_ORIGIN still works.
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Per authenticated user (see app.ts), not per IP. 200 was far too low for
  // real use — that is ~13 requests a minute for an app whose hub pages issue
  // several calls each, so an ordinary session could exhaust it.
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '5000', 10),
  },
  // Sign-in attempts, per IP. Deliberately tight: this is the brute-force
  // control, and successful logins are not counted, so a legitimate user
  // never meets it.
  loginRateLimit: {
    windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10', 10),
  },
  // Limits for the unauthenticated /api/public/* routes, tighter than the
  // global limiter above because those endpoints write rows and burn document
  // numbers. Configurable for the same reason the global one is — staging and
  // load testing need different ceilings from production.
  publicRateLimit: {
    writeWindowMs: parseInt(process.env.PUBLIC_WRITE_WINDOW_MS || '900000', 10),
    writeMax: parseInt(process.env.PUBLIC_WRITE_MAX || '10', 10),
    lookupWindowMs: parseInt(process.env.PUBLIC_LOOKUP_WINDOW_MS || '60000', 10),
    lookupMax: parseInt(process.env.PUBLIC_LOOKUP_MAX || '30', 10),
  },
};
