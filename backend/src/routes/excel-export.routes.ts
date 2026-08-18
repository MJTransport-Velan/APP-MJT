import { Router } from 'express';
import { excelExportController } from '../controllers/excel-export.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { exportExcelSchema } from '../validators/excel-export.validator';

const router = Router();

// No extra permission gate beyond being logged in — this only ever turns
// data a list page has already legitimately fetched (and is displaying)
// into a downloadable file; it doesn't grant access to anything new.
router.post('/', authenticate, validate(exportExcelSchema), excelExportController.export);

export default router;
