import { Request, Response } from 'express';
import { contactService } from '../services/contact.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const contactController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await contactService.create(req.body);
    return sendSuccess(res, 201, { message: 'Thank you — we have received your enquiry.', data: result });
  }),
};
