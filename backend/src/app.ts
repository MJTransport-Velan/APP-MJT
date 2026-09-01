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
import { verifyAccessToken } from './utils/jwt';
import { sendError } from './utils/response';

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
        // Verified, not merely decoded. The JWT payload is attacker-controlled
        // until the signature is checked, so reading userId out of an
        // unverified token let anyone mint a fresh bucket per request — or
        // spend someone else's — simply by editing the middle segment.
        const payload = verifyAccessToken(header.slice(7));
        if (payload?.userId) return `user:${payload.userId}`;
      } catch {
        // Invalid or expired token — fall through to the IP key below.
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

/**
 * Uploaded files are business documents — vehicle RC and insurance, driver
 * licences, supplier and bill documents, PODs, bank statements. Serving them
 * as open static files made every one of them readable by anyone who could
 * reach the host, with no login and (being outside /api) no rate limit
 * either.
 *
 * They are still served statically, but only to a caller holding a valid
 * access token. The token is accepted from the Authorization header for API
 * clients, and from a `token` query parameter because the browser cannot
 * attach a header to an <img src> or a target="_blank" link — the two ways
 * the UI actually opens these files.
 */
app.use(
  '/uploads',
  (req, res, next) => {
    const header = req.headers.authorization;
    const raw = header?.startsWith('Bearer ') ? header.slice(7) : (req.query.token as string | undefined);
    if (!raw) return sendError(res, 401, 'Authentication required to access this file');
    try {
      verifyAccessToken(raw);
      return next();
    } catch {
      return sendError(res, 401, 'Invalid or expired token');
    }
  },
  express.static(path.join(__dirname, '..', 'uploads'))
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
