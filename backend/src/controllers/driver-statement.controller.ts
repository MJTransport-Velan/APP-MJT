import { Response } from 'express';
import { driverStatementService } from '../services/driver-statement.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const driverStatementController = {
  getStatement: asyncHandler(async (req, res: Response) => {
    const statement = await driverStatementService.getStatement(req.params.driverId, req.query.from as string | undefined, req.query.to as string | undefined);
    return sendSuccess(res, 200, { message: 'Driver Statement fetched', data: statement });
  }),
};
