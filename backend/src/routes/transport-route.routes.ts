import { Router } from 'express';
import { transportRouteController } from '../controllers/transport-route.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createRouteSchema, updateRouteSchema, routeIdParamSchema } from '../validators/transport-route.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('route.view'), transportRouteController.list);
router.get('/:id', authorize('route.view'), validate(routeIdParamSchema), transportRouteController.getById);
router.post('/', authorize('route.create'), validate(createRouteSchema), transportRouteController.create);
router.put('/:id', authorize('route.edit'), validate(updateRouteSchema), transportRouteController.update);
router.patch('/:id/status', authorize('route.edit'), validate(routeIdParamSchema), transportRouteController.toggleStatus);
router.delete('/:id', authorize('route.delete'), validate(routeIdParamSchema), transportRouteController.remove);

export default router;
