import { Response } from 'express';
import { assetCategoryService } from '../services/asset-category.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const assetCategoryController = {
  list: asyncHandler(async (req, res: Response) => {
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const categories = await assetCategoryService.list(isActive);
    return sendSuccess(res, 200, { message: 'Asset Categories fetched', data: categories });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const category = await assetCategoryService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Asset Category fetched', data: category });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const category = await assetCategoryService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Asset Category created', data: category });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const category = await assetCategoryService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Asset Category updated', data: category });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await assetCategoryService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Asset Category deleted' });
  }),
};
