import { Router } from 'express';
import { fuelCardAccountController } from '../controllers/fuel-card-account.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listFuelCardTransactionsSchema,
  fuelCardTransactionIdParamSchema,
  rechargeFuelCardAccountSchema,
  refundFuelCardAccountSchema,
  adjustFuelCardAccountSchema,
  updateFuelCardTransactionSchema,
} from '../validators/fuel-card-account.validator';

const router = Router();
router.use(authenticate);

// The diesel card account is a fleet-wide singleton — no account id in any
// of these paths, and no card id either: every card spends the one balance.
router.get('/account', authorize('fuel_card_account.view'), fuelCardAccountController.getAccount);
router.get('/account/summary', authorize('fuel_card_account.view'), fuelCardAccountController.accountSummary);
router.get(
  '/transactions',
  authorize('fuel_card_account.view'),
  validate(listFuelCardTransactionsSchema),
  fuelCardAccountController.listTransactions
);

router.post('/recharge', authorize('fuel_card_account.edit'), validate(rechargeFuelCardAccountSchema), fuelCardAccountController.recharge);
router.post('/refund', authorize('fuel_card_account.edit'), validate(refundFuelCardAccountSchema), fuelCardAccountController.refund);
router.post('/adjust', authorize('fuel_card_account.edit'), validate(adjustFuelCardAccountSchema), fuelCardAccountController.adjust);

// There is no POST /usage on purpose: a drawdown is created by recording
// the fuel entry that was billed to a card, so the fill and the money that
// paid for it are entered once, in one place.
router.patch(
  '/transactions/:id',
  authorize('fuel_card_account.edit'),
  validate(updateFuelCardTransactionSchema),
  fuelCardAccountController.updateTransaction
);
router.delete(
  '/transactions/:id',
  authorize('fuel_card_account.delete'),
  validate(fuelCardTransactionIdParamSchema),
  fuelCardAccountController.deleteTransaction
);

export default router;
