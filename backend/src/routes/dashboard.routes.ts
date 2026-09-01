import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { dashboardEngineService } from '../services/dashboard-engine.service';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';
import { organizationService } from '../services/organization.service';
import { parseDateRange } from '../utils/dateRange';

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
  asyncHandler(async (req: AuthRequest, res) => {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const requested =
      (req.query.keys as string | undefined)?.split(',').map((k) => k.trim()).filter(Boolean) ??
      dashboardEngineService.listKeys();

    // This endpoint returns the same data as each dashboard's own route, so
    // it has to demand the same permission each of those routes demands.
    // Asking for a widget you cannot read is refused outright rather than
    // silently dropped — a dashboard that quietly omits a tile is worse to
    // debug than one that says why.
    const user = req.user!;
    const isSuperAdmin = user.roles.includes('SUPER_ADMIN');
    const denied = isSuperAdmin
      ? []
      : requested.filter((key) => {
          const permission = dashboardEngineService.permissionFor(key);
          return !permission || !user.permissions.includes(permission);
        });

    if (denied.length) {
      return sendError(
        res,
        403,
        `You do not have permission to view: ${denied.join(', ')}`
      );
    }

    const data = await dashboardEngineService.getWidgets(requested, {
      organizationId,
      range: parseDateRange(req.query),
    });
    return sendSuccess(res, 200, { message: 'Dashboard widgets fetched', data });
  })
);

export default router;
