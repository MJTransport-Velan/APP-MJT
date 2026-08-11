import { Router } from 'express';
import { pettyCashRequestController } from '../controllers/petty-cash-request.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createPettyCashRequestSchema,
  decidePettyCashRequestSchema,
  disbursePettyCashRequestSchema,
  closePettyCashRequestSchema,
  pettyCashRequestIdParamSchema,
  listPettyCashRequestsSchema,
} from '../validators/petty-cash-request.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('pettyCashRequest.view'), validate(listPettyCashRequestsSchema), pettyCashRequestController.list);
router.get('/:id', authorize('pettyCashRequest.view'), validate(pettyCashRequestIdParamSchema), pettyCashRequestController.getById);
router.post('/', authorize('pettyCashRequest.create'), validate(createPettyCashRequestSchema), pettyCashRequestController.create);
router.post('/:id/decide', authorize('pettyCashRequest.approve'), validate(decidePettyCashRequestSchema), pettyCashRequestController.decide);
router.post('/:id/disburse', authorize('pettyCashRequest.disburse'), validate(disbursePettyCashRequestSchema), pettyCashRequestController.disburse);
router.post('/:id/close', authorize('pettyCashRequest.disburse'), validate(closePettyCashRequestSchema), pettyCashRequestController.close);

export default router;
