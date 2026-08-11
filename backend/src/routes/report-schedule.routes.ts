import { Router } from 'express';
import { reportScheduleController } from '../controllers/report-schedule.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listReportSchedulesSchema,
  reportScheduleIdParamSchema,
  createReportScheduleSchema,
  updateReportScheduleSchema,
} from '../validators/report-schedule.validator';
import { reportScheduleExecutorService } from '../services/report-schedule-executor.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('report_schedule.view'), validate(listReportSchedulesSchema), reportScheduleController.list);
router.get('/:id', authorize('report_schedule.view'), validate(reportScheduleIdParamSchema), reportScheduleController.getById);
router.post('/', authorize('report_schedule.create'), validate(createReportScheduleSchema), reportScheduleController.create);
router.put('/:id', authorize('report_schedule.edit'), validate(updateReportScheduleSchema), reportScheduleController.update);
router.delete('/:id', authorize('report_schedule.delete'), validate(reportScheduleIdParamSchema), reportScheduleController.remove);

// Phase 14 (docs Phase 8) — the executor this schedule definition never had. Manual "Run Now" alongside the automated version driven by AutomationRule's RUN_REPORT_SCHEDULE action.
router.post(
  '/:id/execute',
  authorize('report_schedule.create'),
  validate(reportScheduleIdParamSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const data = await reportScheduleExecutorService.execute(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: `Report generated (${data.rowCount} rows)`, data });
  })
);

export default router;
