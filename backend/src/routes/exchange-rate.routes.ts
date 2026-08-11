import { Router } from 'express';
import { exchangeRateController } from '../controllers/exchange-rate.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createExchangeRateSchema,
  updateExchangeRateSchema,
  exchangeRateIdParamSchema,
  listExchangeRatesSchema,
} from '../validators/exchange-rate.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('currency.view'), validate(listExchangeRatesSchema), exchangeRateController.list);
router.post('/', authorize('currency.edit'), validate(createExchangeRateSchema), exchangeRateController.create);
router.put('/:id', authorize('currency.edit'), validate(updateExchangeRateSchema), exchangeRateController.update);
router.delete(
  '/:id',
  authorize('currency.edit'),
  validate(exchangeRateIdParamSchema),
  exchangeRateController.remove
);

export default router;
