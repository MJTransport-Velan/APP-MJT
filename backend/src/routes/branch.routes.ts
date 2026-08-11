import { Router } from 'express';
import { branchController } from '../controllers/branch.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createBranchSchema, updateBranchSchema, branchIdParamSchema } from '../validators/branch.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('branch.view'), branchController.list);
router.get('/:id', authorize('branch.view'), validate(branchIdParamSchema), branchController.getById);
router.post('/', authorize('branch.create'), validate(createBranchSchema), branchController.create);
router.put('/:id', authorize('branch.edit'), validate(updateBranchSchema), branchController.update);
router.patch('/:id/status', authorize('branch.edit'), validate(branchIdParamSchema), branchController.toggleStatus);
router.delete('/:id', authorize('branch.delete'), validate(branchIdParamSchema), branchController.remove);

export default router;
