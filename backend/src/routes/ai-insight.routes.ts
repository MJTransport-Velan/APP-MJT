import { Router } from 'express';
import { aiInsightController } from '../controllers/ai-insight.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listAiInsightsSchema, generateInsightSchema } from '../validators/ai-insight.validator';

const router = Router();
router.use(authenticate);
router.use(authorize('ai_insight.view'));

router.get('/', validate(listAiInsightsSchema), aiInsightController.list);
router.post('/generate', validate(generateInsightSchema), aiInsightController.generate);

export default router;
