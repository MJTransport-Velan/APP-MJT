import { Router } from 'express';
import { openingBalanceController } from '../controllers/opening-balance.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  saveMigrationSchema,
  listOpeningBalancesSchema,
  openingBalanceIdParamSchema,
  createOpeningBalanceSchema,
  updateOpeningBalanceSchema,
  reclassifyOpeningBalanceSchema,
  setOpeningBalanceStatusSchema,
  emptyBodySchema,
} from '../validators/opening-balance.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('opening_balance.view'), validate(listOpeningBalancesSchema), openingBalanceController.list);
router.get('/migration', authorize('opening_balance.view'), openingBalanceController.getMigration);
router.get('/summary', authorize('opening_balance.view'), openingBalanceController.summary);

router.post('/migration', authorize('opening_balance.create'), validate(saveMigrationSchema), openingBalanceController.saveMigration);
// Finalizing locks the opening figures; reopening is the same permission
// because it is the same decision taken back.
router.post('/finalize', authorize('opening_balance.finalize'), validate(emptyBodySchema), openingBalanceController.finalize);
router.post('/reopen', authorize('opening_balance.finalize'), validate(emptyBodySchema), openingBalanceController.reopen);

router.post('/', authorize('opening_balance.create'), validate(createOpeningBalanceSchema), openingBalanceController.create);
router.put('/:id', authorize('opening_balance.edit'), validate(updateOpeningBalanceSchema), openingBalanceController.update);
router.patch('/:id/reclassify', authorize('opening_balance.edit'), validate(reclassifyOpeningBalanceSchema), openingBalanceController.reclassify);
router.patch('/:id/status', authorize('opening_balance.edit'), validate(setOpeningBalanceStatusSchema), openingBalanceController.setStatus);
router.delete('/:id', authorize('opening_balance.delete'), validate(openingBalanceIdParamSchema), openingBalanceController.remove);

export default router;
