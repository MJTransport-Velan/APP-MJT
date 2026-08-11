import { Router } from 'express';
import { adminTeamController } from '../controllers/admin-team.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createTeamSchema,
  updateTeamSchema,
  teamIdParamSchema,
  assignTeamMembersSchema,
} from '../validators/admin-team.validator';

const router = Router();

router.use(authenticate);

router.get('/', authorize('team.view'), adminTeamController.list);
router.get('/:id', authorize('team.view'), validate(teamIdParamSchema), adminTeamController.getById);
router.post('/', authorize('team.create'), validate(createTeamSchema), adminTeamController.create);
router.put('/:id', authorize('team.edit'), validate(updateTeamSchema), adminTeamController.update);
router.delete('/:id', authorize('team.delete'), validate(teamIdParamSchema), adminTeamController.remove);
router.put(
  '/:id/members',
  authorize('team.assign'),
  validate(assignTeamMembersSchema),
  adminTeamController.assignMembers
);

export default router;
