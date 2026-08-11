import { Router } from 'express';
import { apiKeyController } from '../controllers/api-key.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { apiKeyAuth } from '../middlewares/apiKeyAuth.middleware';
import { createApiKeySchema, apiKeyIdParamSchema } from '../validators/api-key.validator';

const router = Router();

// Machine-to-machine proof-of-flow — authenticated via X-API-Key, not JWT.
router.get('/whoami', apiKeyAuth, apiKeyController.whoami);

router.use(authenticate);
router.get('/', authorize('api_key.manage'), apiKeyController.list);
router.post('/', authorize('api_key.manage'), validate(createApiKeySchema), apiKeyController.create);
router.patch('/:id/revoke', authorize('api_key.manage'), validate(apiKeyIdParamSchema), apiKeyController.revoke);

export default router;
