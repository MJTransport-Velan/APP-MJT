import { Router } from 'express';
import { enterpriseAuditController } from '../controllers/enterprise-audit.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { auditQuerySchema } from '../validators/enterprise-audit.validator';

const router = Router();
router.use(authenticate);
router.use(authorize('enterprise_audit.view'));

router.get('/overview', enterpriseAuditController.overview);
router.get('/recent-activity', enterpriseAuditController.recentActivity);
router.get('/login', validate(auditQuerySchema), enterpriseAuditController.loginAudit);
router.get('/configuration', validate(auditQuerySchema), enterpriseAuditController.configurationAudit);
router.get('/exports', validate(auditQuerySchema), enterpriseAuditController.exportAudit);
router.get('/api', validate(auditQuerySchema), enterpriseAuditController.apiAudit);

export default router;
