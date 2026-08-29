import { Request, Response } from 'express';
import { bookingService } from '../services/booking.service';
import { buildLrPdf } from '../utils/lrPdf.util';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middlewares/error.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * Turns an LR number into a safe download filename. The MJT/26-27/0158 series
 * carries slashes, which are path separators on every platform and illegal in
 * a Windows filename — left in the Content-Disposition header they produce a
 * mangled or rejected download. Falls back to the booking number for a
 * booking whose LR was never numbered.
 */
function lrFileName(lrNumber: string | null, bookingNo: string): string {
  const base = (lrNumber || bookingNo).replace(/[\\/:*?"<>|]+/g, '-');
  return `${base}.pdf`;
}

export const bookingController = {
  // ----- Public (no authentication) -------------------------------------

  createPublic: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.createPublic(req.body);
    return sendSuccess(res, 201, { message: 'Booking request received', data: booking });
  }),

  getPublicByBookingNo: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.getPublicByBookingNo(req.params.bookingNo);
    return sendSuccess(res, 200, { message: 'Booking fetched', data: booking });
  }),

  track: asyncHandler(async (req: Request, res: Response) => {
    const shipment = await bookingService.track(req.params.trackingNumber);
    return sendSuccess(res, 200, { message: 'Shipment fetched', data: shipment });
  }),

  // ----- Admin (authenticated) ------------------------------------------

  createCounter: asyncHandler(async (req: AuthRequest, res: Response) => {
    const booking = await bookingService.createCounter(req.body, req);
    return sendSuccess(res, 201, { message: 'Booking created', data: booking });
  }),

  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await bookingService.list(req.query);
    return sendSuccess(res, 200, { message: 'Bookings fetched', data: result.data, meta: result.meta });
  }),

  stats: asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stats = await bookingService.stats();
    return sendSuccess(res, 200, { message: 'Booking stats fetched', data: stats });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const booking = await bookingService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Booking fetched', data: booking });
  }),

  confirm: asyncHandler(async (req: AuthRequest, res: Response) => {
    const booking = await bookingService.confirm(req.params.id, req.body, req);
    return sendSuccess(res, 200, { message: 'Booking confirmed', data: booking });
  }),

  updateRoute: asyncHandler(async (req: AuthRequest, res: Response) => {
    const booking = await bookingService.updateRoute(req.params.id, req.body, req);
    return sendSuccess(res, 200, { message: 'Route saved', data: booking });
  }),

  reject: asyncHandler(async (req: AuthRequest, res: Response) => {
    const booking = await bookingService.reject(req.params.id, req.body.rejectionReason, req);
    return sendSuccess(res, 200, { message: 'Booking rejected', data: booking });
  }),

  assignVehicle: asyncHandler(async (req: AuthRequest, res: Response) => {
    const booking = await bookingService.assignVehicle(req.params.id, req.body, req);
    return sendSuccess(res, 200, { message: 'Vehicle details saved', data: booking });
  }),

  generateLr: asyncHandler(async (req: AuthRequest, res: Response) => {
    const booking = await bookingService.generateLr(req.params.id, req);
    return sendSuccess(res, 200, { message: 'LR generated', data: booking });
  }),

  updateLrDetails: asyncHandler(async (req: AuthRequest, res: Response) => {
    const booking = await bookingService.updateLrDetails(req.params.id, req.body, req);
    return sendSuccess(res, 200, { message: 'LR details saved', data: booking });
  }),

  updateStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const booking = await bookingService.updateStatus(req.params.id, req.body, req);
    return sendSuccess(res, 200, { message: 'Booking status updated', data: booking });
  }),

  /** Backs the on-screen LR preview and the print view. */
  getLr: asyncHandler(async (req: AuthRequest, res: Response) => {
    await bookingService.getLr(req.params.id);
    const booking = await bookingService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'LR fetched', data: booking });
  }),

  downloadLr: asyncHandler(async (req: AuthRequest, res: Response) => {
    const booking = await bookingService.getLr(req.params.id);

    let pdf: Buffer;
    try {
      pdf = await buildLrPdf(booking);
    } catch {
      throw new AppError('Failed to generate the LR PDF. Please try again.', 500);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${lrFileName(booking.lrNumber, booking.bookingNo)}"`);
    res.setHeader('Content-Length', pdf.length);
    return res.end(pdf);
  }),

  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await bookingService.remove(req.params.id, req);
    return sendSuccess(res, 200, { message: 'Booking deleted' });
  }),
};
