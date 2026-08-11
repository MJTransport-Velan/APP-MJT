import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema, refreshSchema, updateProfileSchema, changePasswordSchema } from '../validators/auth.validator';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadProfilePhoto } from '../middlewares/upload.middleware';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.get('/me', authenticate, authController.me);

// Self-service Profile (Administration > Profile page)
router.put('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.put('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.post('/photo', authenticate, uploadProfilePhoto, authController.uploadPhoto);

export default router;
