import { Router } from 'express';
import { fastTagController } from '../controllers/fasttag.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadFastTagAttachment } from '../middlewares/upload.middleware';
import {
  listFastTagTransactionsSchema,
  fastTagTransactionIdParamSchema,
  rechargeFastTagSchema,
  logFastTagUsageSchema,
  refundFastTagSchema,
  adjustFastTagSchema,
  updateFastTagTransactionSchema,
  updateFastTagTransactionStatusSchema,
} from '../validators/fasttag.validator';

const router = Router();
router.use(authenticate);

// The wallet is a fleet-wide singleton — no account id in any of these paths.
router.get('/wallet', authorize('fasttag.view'), fastTagController.getWallet);
router.get('/wallet/summary', authorize('fasttag.view'), fastTagController.walletSummary);
router.get('/transactions', authorize('fasttag.view'), validate(listFastTagTransactionsSchema), fastTagController.listTransactions);
router.post('/recharge', authorize('fasttag.edit'), validate(rechargeFastTagSchema), fastTagController.recharge);
router.post('/usage', authorize('fasttag.edit'), validate(logFastTagUsageSchema), fastTagController.logUsage);
router.post('/refund', authorize('fasttag.edit'), validate(refundFastTagSchema), fastTagController.refund);
router.post('/adjust', authorize('fasttag.edit'), validate(adjustFastTagSchema), fastTagController.adjust);
router.patch('/transactions/:id', authorize('fasttag.edit'), validate(updateFastTagTransactionSchema), fastTagController.updateTransaction);
router.delete('/transactions/:id', authorize('fasttag.delete'), validate(fastTagTransactionIdParamSchema), fastTagController.deleteTransaction);
router.patch(
  '/transactions/:id/status',
  authorize('fasttag.edit'),
  validate(updateFastTagTransactionStatusSchema),
  fastTagController.updateTransactionStatus
);
router.post(
  '/transactions/:id/attachment',
  authorize('fasttag.edit'),
  validate(fastTagTransactionIdParamSchema),
  uploadFastTagAttachment,
  fastTagController.uploadAttachment
);

export default router;
