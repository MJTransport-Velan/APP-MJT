import { Router } from 'express';
import { tripNoteController } from '../controllers/trip-note.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listTripNotesSchema, createTripNoteSchema } from '../validators/trip-note.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('trip.view'), validate(listTripNotesSchema), tripNoteController.list);
router.post('/', authorize('trip.track'), validate(createTripNoteSchema), tripNoteController.create);

export default router;
