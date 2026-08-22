import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { apiRequestLogMiddleware } from './middlewares/apiRequestLog.middleware';
import { uppercaseBody } from './middlewares/uppercaseBody.middleware';

const app: Application = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(uppercaseBody);
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

/**
 * Keyed by authenticated user rather than IP: a whole office behind one NAT
 * would otherwise share a single budget, letting one busy user lock out
 * their colleagues. Falls back to IP for unauthenticated calls.
 *
 * The ceiling is generous because normal ERP use is request-heavy — a hub
 * page issues several calls and a user clicking through modules can reach
 * hundreds within the window. Brute-force protection is the login limiter's
 * job (below), not this one's.
 */
const limiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const payload = JSON.parse(
          Buffer.from(header.split(' ')[1].split('.')[1], 'base64').toString()
        );
        if (payload?.userId) return `user:${payload.userId}`;
      } catch {
        // Unparseable token — fall through to the IP key below.
      }
    }
    return `ip:${req.ip}`;
  },
});

/**
 * Login is the one endpoint worth limiting tightly, and it must stay keyed
 * by IP — keying an unauthenticated endpoint by user is impossible, and the
 * whole point is to slow an attacker guessing many passwords.
 */
const loginLimiter = rateLimit({
  windowMs: env.loginRateLimit.windowMs,
  max: env.loginRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many sign-in attempts. Please try again shortly.' },
});

app.use('/api/auth/login', loginLimiter);
app.use('/api', limiter);
app.use('/api', apiRequestLogMiddleware);

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
