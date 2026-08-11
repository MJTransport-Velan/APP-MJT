import { Router } from 'express';
import { assetDisposalController } from '../controllers/asset-disposal.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listAssetDisposalsSchema,
  assetDisposalIdParamSchema,
  raiseAssetDisposalSchema,
  approveAssetDisposalSchema,
  rejectAssetDisposalSchema,
} from '../validators/asset-disposal.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('asset_disposal.view'), validate(listAssetDisposalsSchema), assetDisposalController.list);
router.get('/:id', authorize('asset_disposal.view'), validate(assetDisposalIdParamSchema), assetDisposalController.getById);
router.post('/', authorize('asset_disposal.create'), validate(raiseAssetDisposalSchema), assetDisposalController.raise);
router.patch('/:id/approve', authorize('asset_disposal.approve'), validate(approveAssetDisposalSchema), assetDisposalController.approve);
router.patch('/:id/reject', authorize('asset_disposal.approve'), validate(rejectAssetDisposalSchema), assetDisposalController.reject);

export default router;
