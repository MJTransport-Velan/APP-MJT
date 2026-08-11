import { Router } from 'express';
import { fixedAssetController } from '../controllers/fixed-asset.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listFixedAssetsSchema,
  fixedAssetIdParamSchema,
  createFixedAssetSchema,
  approveFixedAssetSchema,
  rejectFixedAssetSchema,
} from '../validators/fixed-asset.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('asset.view'), validate(listFixedAssetsSchema), fixedAssetController.list);
router.get('/dashboard', authorize('asset.view'), fixedAssetController.dashboard);
router.get('/:id', authorize('asset.view'), validate(fixedAssetIdParamSchema), fixedAssetController.getById);
router.get('/:id/cost-summary', authorize('asset.view'), validate(fixedAssetIdParamSchema), fixedAssetController.costSummary);
router.post('/', authorize('asset.create'), validate(createFixedAssetSchema), fixedAssetController.register);
router.patch('/:id/approve', authorize('asset.approve'), validate(approveFixedAssetSchema), fixedAssetController.approve);
router.patch('/:id/reject', authorize('asset.approve'), validate(rejectFixedAssetSchema), fixedAssetController.reject);
router.delete('/:id', authorize('asset.delete'), validate(fixedAssetIdParamSchema), fixedAssetController.remove);

export default router;
