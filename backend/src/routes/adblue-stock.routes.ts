import { Router } from 'express';
import { adBlueStockController } from '../controllers/adblue-stock.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listAdBlueStockTransactionsSchema,
  adBlueStockTransactionIdParamSchema,
  purchaseAdBlueStockSchema,
  returnAdBlueStockSchema,
  adjustAdBlueStockSchema,
  updateAdBlueStockTransactionSchema,
} from '../validators/adblue-stock.validator';

const router = Router();
router.use(authenticate);

// The AdBlue store is a fleet-wide singleton — no stock id in any of these
// paths, and no vehicle id either: every truck draws from the one store.
router.get('/stock', authorize('adblue_stock.view'), adBlueStockController.getStock);
router.get('/stock/summary', authorize('adblue_stock.view'), adBlueStockController.stockSummary);
router.get(
  '/transactions',
  authorize('adblue_stock.view'),
  validate(listAdBlueStockTransactionsSchema),
  adBlueStockController.listTransactions
);

router.post('/purchase', authorize('adblue_stock.edit'), validate(purchaseAdBlueStockSchema), adBlueStockController.purchase);
router.post('/return', authorize('adblue_stock.edit'), validate(returnAdBlueStockSchema), adBlueStockController.returnToSupplier);
router.post('/adjust', authorize('adblue_stock.edit'), validate(adjustAdBlueStockSchema), adBlueStockController.adjust);

// There is no POST /issue on purpose: a withdrawal is created by recording
// the AdBlue entry that was filled from stock, so the top-up and the litres
// it consumed are entered once, in one place.
router.patch(
  '/transactions/:id',
  authorize('adblue_stock.edit'),
  validate(updateAdBlueStockTransactionSchema),
  adBlueStockController.updateTransaction
);
router.delete(
  '/transactions/:id',
  authorize('adblue_stock.delete'),
  validate(adBlueStockTransactionIdParamSchema),
  adBlueStockController.deleteTransaction
);

export default router;
