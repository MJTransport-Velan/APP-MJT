import { Router } from 'express';
import { assetTransferController } from '../controllers/asset-transfer.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listAssetTransfersSchema, assetTransferIdParamSchema, requestAssetTransferSchema, rejectAssetTransferSchema } from '../validators/asset-transfer.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('asset_transfer.view'), validate(listAssetTransfersSchema), assetTransferController.list);
router.get('/:id', authorize('asset_transfer.view'), validate(assetTransferIdParamSchema), assetTransferController.getById);
router.post('/', authorize('asset_transfer.create'), validate(requestAssetTransferSchema), assetTransferController.request);
router.patch('/:id/approve', authorize('asset_transfer.approve'), validate(assetTransferIdParamSchema), assetTransferController.approve);
router.patch('/:id/reject', authorize('asset_transfer.approve'), validate(rejectAssetTransferSchema), assetTransferController.reject);

export default router;
