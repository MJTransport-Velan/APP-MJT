import { Router } from 'express';
import { mfaController } from '../controllers/mfa.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { verifyMfaSchema } from '../validators/mfa.validator';

const router = Router();
router.use(authenticate);

router.get('/status', mfaController.status);
router.post('/setup', mfaController.beginSetup);
router.post('/verify', validate(verifyMfaSchema), mfaController.verifyAndEnable);
router.post('/disable', mfaController.disable);

export default router;
