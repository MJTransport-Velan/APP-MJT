import { Router } from 'express';
import { financialEntryController } from '../controllers/financial-entry.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listFinancialEntriesSchema,
  financialEntryIdParamSchema,
  createFinancialEntrySchema,
  cancelFinancialEntrySchema,
  reverseFinancialEntrySchema,
  correctFinancialEntrySchema,
} from '../validators/financial-entry.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('financialEntry.view'), validate(listFinancialEntriesSchema), financialEntryController.list);
// Before '/:id', or "kinds" is read as an entry id and 404s.
router.get('/kinds', authorize('financialEntry.view'), financialEntryController.kinds);
router.get('/:id', authorize('financialEntry.view'), validate(financialEntryIdParamSchema), financialEntryController.getById);
router.post('/', authorize('financialEntry.create'), validate(createFinancialEntrySchema), financialEntryController.create);
// Named transactions. The kind validates its own fields, so there is no
// blanket schema here — see services/financial-entry-kinds/.
router.post('/kinds/:kind', authorize('financialEntry.create'), financialEntryController.createFromKind);
router.post('/:id/cancel', authorize('financialEntry.cancel'), validate(cancelFinancialEntrySchema), financialEntryController.cancel);
router.post('/:id/reverse', authorize('financialEntry.reverse'), validate(reverseFinancialEntrySchema), financialEntryController.reverse);
router.post('/:id/correct', authorize('financialEntry.edit'), validate(correctFinancialEntrySchema), financialEntryController.correct);
router.delete('/:id', authorize('financialEntry.delete'), validate(financialEntryIdParamSchema), financialEntryController.remove);

export default router;
