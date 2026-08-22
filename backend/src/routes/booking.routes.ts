import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listBookingsSchema,
  bookingIdParamSchema,
  createCounterBookingSchema,
  confirmBookingSchema,
  updateBookingRouteSchema,
  rejectBookingSchema,
  assignVehicleSchema,
  updateBookingStatusSchema,
} from '../validators/booking.validator';

/**
 * Admin-side Booking & LR workflow. The public intake counterpart lives in
 * booking-public.routes.ts and is deliberately kept in a separate file so that
 * `router.use(authenticate)` here can never be bypassed by accident.
 */
const router = Router();
router.use(authenticate);

router.post('/', authorize('booking.create'), validate(createCounterBookingSchema), bookingController.createCounter);
router.get('/', authorize('booking.view'), validate(listBookingsSchema), bookingController.list);
router.get('/stats', authorize('booking.view'), bookingController.stats);
router.get('/:id', authorize('booking.view'), validate(bookingIdParamSchema), bookingController.getById);

router.patch('/:id/confirm', authorize('booking.confirm'), validate(confirmBookingSchema), bookingController.confirm);

router.patch('/:id/route', authorize('booking.confirm'), validate(updateBookingRouteSchema), bookingController.updateRoute);
router.patch('/:id/reject', authorize('booking.reject'), validate(rejectBookingSchema), bookingController.reject);
router.patch('/:id/vehicle', authorize('booking.assign_vehicle'), validate(assignVehicleSchema), bookingController.assignVehicle);
router.patch('/:id/generate-lr', authorize('booking.generate_lr'), validate(bookingIdParamSchema), bookingController.generateLr);
router.patch('/:id/status', authorize('booking.track'), validate(updateBookingStatusSchema), bookingController.updateStatus);

router.get('/:id/lr', authorize('booking.view'), validate(bookingIdParamSchema), bookingController.getLr);
router.get('/:id/lr/download', authorize('booking.view'), validate(bookingIdParamSchema), bookingController.downloadLr);

router.delete('/:id', authorize('booking.delete'), validate(bookingIdParamSchema), bookingController.remove);

export default router;
