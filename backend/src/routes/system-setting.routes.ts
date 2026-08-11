import { Router } from 'express';
import { systemSettingController } from '../controllers/system-setting.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listSystemSettingsSchema, setSystemSettingSchema } from '../validators/system-setting.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('system_setting.view'), validate(listSystemSettingsSchema), systemSettingController.list);
router.put('/', authorize('system_setting.edit'), validate(setSystemSettingSchema), systemSettingController.set);

export default router;
