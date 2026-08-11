import { Router } from 'express';
import { kpiController } from '../controllers/kpi.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();
router.use(authenticate);
router.use(authorize('kpi.view'));

router.get('/definitions', kpiController.listDefinitions);
router.get('/executive-dashboard', kpiController.executiveDashboard);
router.post('/compute-snapshots', kpiController.computeSnapshots);

export default router;
