import { Router } from 'express';
import { chequeBookController } from '../controllers/cheque-book.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createChequeBookSchema,
  updateChequeBookSchema,
  chequeBookIdParamSchema,
  listChequeBooksSchema,
} from '../validators/cheque-book.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('chequeBook.view'), validate(listChequeBooksSchema), chequeBookController.list);
router.post('/', authorize('chequeBook.create'), validate(createChequeBookSchema), chequeBookController.create);
router.get('/:id/next-available', authorize('chequeBook.view'), validate(chequeBookIdParamSchema), chequeBookController.nextAvailable);
router.put('/:id', authorize('chequeBook.edit'), validate(updateChequeBookSchema), chequeBookController.update);
router.patch('/:id/status', authorize('chequeBook.edit'), validate(chequeBookIdParamSchema), chequeBookController.toggleStatus);
router.delete('/:id', authorize('chequeBook.delete'), validate(chequeBookIdParamSchema), chequeBookController.remove);

export default router;
