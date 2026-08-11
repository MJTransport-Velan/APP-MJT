import { Response } from 'express';
import { aiInsightService } from '../services/ai-insight.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const aiInsightController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await aiInsightService.list(req.query as { type?: string; page?: string; pageSize?: string });
    return sendSuccess(res, 200, { message: 'AI insights fetched', data: result.data, meta: result.meta });
  }),
  generate: asyncHandler(async (req, res: Response) => {
    const { type, periodsAhead } = req.body as { type: string; periodsAhead?: number };
    let data;
    switch (type) {
      case 'OUTSTANDING_PREDICTION':
        data = await aiInsightService.generateOutstandingPrediction(periodsAhead);
        break;
    }
    return sendSuccess(res, 201, { message: 'AI insight generated', data });
  }),
};
