import { Router } from 'express';
import { importController } from '../controllers/import.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadBulkImportFile } from '../middlewares/upload.middleware';
import { runImportSchema, listImportBatchesSchema, importBatchIdParamSchema, sampleImportSchema } from '../validators/import.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('data_import.view'), validate(listImportBatchesSchema), importController.list);
router.get('/sample', authorize('data_import.run'), validate(sampleImportSchema), importController.sample);
router.get('/:id', authorize('data_import.view'), validate(importBatchIdParamSchema), importController.getById);
router.post('/run', authorize('data_import.run'), uploadBulkImportFile, validate(runImportSchema), importController.run);

export default router;
