import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { bookingController } from '../controllers/booking.controller';
import { contactController } from '../controllers/contact.controller';
import { validate } from '../middlewares/validate.middleware';
import {
  createBookingSchema,
  bookingNoParamSchema,
  trackingNumberParamSchema,
} from '../validators/booking.validator';
import { createContactEnquirySchema } from '../validators/contact.validator';
import { env } from '../config/env';

/**
 * The public intake surface for the MJ Express website, which has no backend of
 * its own. These are the only unauthenticated business routes in the API, so
 * each carries its own rate limit on top of the global `/api` limiter: the
 * write endpoints create rows (and a booking burns a booking number), and the
 * lookups are unauthenticated reads worth protecting against enumeration.
 *
 * Nothing here may ever be given `authenticate` — the website calls it
 * anonymously. Admin-side booking routes live in booking.routes.ts.
 */
const router = Router();

const writeLimiter = rateLimit({
  windowMs: env.publicRateLimit.writeWindowMs,
  max: env.publicRateLimit.writeMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
});

const lookupLimiter = rateLimit({
  windowMs: env.publicRateLimit.lookupWindowMs,
  max: env.publicRateLimit.lookupMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many lookups. Please try again shortly.' },
});

router.post('/bookings', writeLimiter, validate(createBookingSchema), bookingController.createPublic);
router.get('/bookings/:bookingNo', lookupLimiter, validate(bookingNoParamSchema), bookingController.getPublicByBookingNo);
router.get('/tracking/:trackingNumber', lookupLimiter, validate(trackingNumberParamSchema), bookingController.track);
router.post('/contact', writeLimiter, validate(createContactEnquirySchema), contactController.create);

export default router;
