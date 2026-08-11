import { Router } from 'express';
import { adminCompanyController } from '../controllers/admin-company.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createCompanySchema, updateCompanySchema, companyIdParamSchema } from '../validators/admin-company.validator';
import { uploadProfilePhoto } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticate);

router.get('/', authorize('company.view'), adminCompanyController.list);
router.get('/:id', authorize('company.view'), validate(companyIdParamSchema), adminCompanyController.getById);
router.post('/', authorize('company.create'), validate(createCompanySchema), adminCompanyController.create);
router.put('/:id', authorize('company.edit'), validate(updateCompanySchema), adminCompanyController.update);
router.post(
  '/:id/logo',
  authorize('company.upload_logo'),
  validate(companyIdParamSchema),
  uploadProfilePhoto,
  adminCompanyController.uploadLogo
);
router.patch('/:id/status', authorize('company.edit'), validate(companyIdParamSchema), adminCompanyController.toggleStatus);
router.delete('/:id', authorize('company.delete'), validate(companyIdParamSchema), adminCompanyController.remove);

export default router;
