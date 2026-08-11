import { Router } from 'express';
import { bankChargeInterestController } from '../controllers/bank-charge-interest.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createBankChargeSchema, createInterestSchema } from '../validators/bank-charge-interest.validator';

const bankChargeRouter = Router();
bankChargeRouter.use(authenticate);
bankChargeRouter.post('/', authorize('bankCharge.create'), validate(createBankChargeSchema), bankChargeInterestController.createBankCharge);

const interestRouter = Router();
interestRouter.use(authenticate);
interestRouter.post('/', authorize('interest.create'), validate(createInterestSchema), bankChargeInterestController.createInterest);

export { bankChargeRouter, interestRouter };
