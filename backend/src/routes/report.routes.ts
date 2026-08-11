import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listReportQuerySchema, exportReportQuerySchema } from '../validators/report.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('reports.view'), reportController.listAvailable);
router.get('/operations', authorize('reports.operations'), validate(listReportQuerySchema), reportController.operations);
router.get('/fleet', authorize('reports.fleet'), validate(listReportQuerySchema), reportController.fleet);
router.get('/accounts', authorize('reports.accounts'), validate(listReportQuerySchema), reportController.accounts);
router.get('/management', authorize('reports.management'), validate(listReportQuerySchema), reportController.management);
router.get('/export', authorize('reports.export'), validate(exportReportQuerySchema), reportController.export);

export default router;
