import { Router } from 'express';
import { assetCategoryController } from '../controllers/asset-category.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listAssetCategoriesSchema,
  assetCategoryIdParamSchema,
  createAssetCategorySchema,
  updateAssetCategorySchema,
} from '../validators/asset-category.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('asset_category.view'), validate(listAssetCategoriesSchema), assetCategoryController.list);
router.get('/:id', authorize('asset_category.view'), validate(assetCategoryIdParamSchema), assetCategoryController.getById);
router.post('/', authorize('asset_category.create'), validate(createAssetCategorySchema), assetCategoryController.create);
router.put('/:id', authorize('asset_category.edit'), validate(updateAssetCategorySchema), assetCategoryController.update);
router.delete('/:id', authorize('asset_category.delete'), validate(assetCategoryIdParamSchema), assetCategoryController.remove);

export default router;
