import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { dashboardEngineService } from '../services/dashboard-engine.service';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { organizationService } from '../services/organization.service';

const router = Router();

router.get('/', authenticate, authorize('dashboard.view'), dashboardController.summary);

// Dashboard Engine — the generic entry point every one of the nine
// existing dashboard routes now runs through internally (see each
// controller's dashboardEngineService.getWidget() call). This is the
// same registry exposed directly, for any new consumer that wants to
// fetch one or several widgets by key instead of a per-domain endpoint.
router.get(
  '/widgets',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const keys = (req.query.keys as string | undefined)?.split(',').map((k) => k.trim()).filter(Boolean) ?? dashboardEngineService.listKeys();
    const data = await dashboardEngineService.getWidgets(keys, { organizationId });
    return sendSuccess(res, 200, { message: 'Dashboard widgets fetched', data });
  })
);

export default router;
