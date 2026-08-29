import { Router } from 'express';
import { adBlueEntryController } from '../controllers/adblue-entry.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadAdBlueBill } from '../middlewares/upload.middleware';
import {
  createAdBlueEntrySchema,
  updateAdBlueEntrySchema,
  adBlueEntryIdParamSchema,
  listAdBlueEntriesSchema,
  adBlueSummaryQuerySchema,
  vehicleAdBlueSummaryQuerySchema,
  vehicleAdBlueConsumptionQuerySchema,
} from '../validators/adblue-entry.validator';

const router = Router();
router.use(authenticate);

// Static dashboard paths stay above '/:id' so they are not read as an id.
router.get('/summary', authorize('adblue_entry.view'), validate(adBlueSummaryQuerySchema), adBlueEntryController.summary);
router.get(
  '/vehicle-consumption',
  authorize('adblue_entry.view'),
  validate(vehicleAdBlueConsumptionQuerySchema),
  adBlueEntryController.vehicleConsumption
);
router.get(
  '/vehicle-summary/:vehicleId',
  authorize('adblue_entry.view'),
  validate(vehicleAdBlueSummaryQuerySchema),
  adBlueEntryController.vehicleSummary
);
router.get('/', authorize('adblue_entry.view'), validate(listAdBlueEntriesSchema), adBlueEntryController.list);
router.get('/:id', authorize('adblue_entry.view'), validate(adBlueEntryIdParamSchema), adBlueEntryController.getById);
router.post('/', authorize('adblue_entry.create'), validate(createAdBlueEntrySchema), adBlueEntryController.create);
router.put('/:id', authorize('adblue_entry.edit'), validate(updateAdBlueEntrySchema), adBlueEntryController.update);
router.post(
  '/:id/bill',
  authorize('adblue_entry.edit'),
  validate(adBlueEntryIdParamSchema),
  uploadAdBlueBill,
  adBlueEntryController.uploadBill
);
router.delete('/:id', authorize('adblue_entry.delete'), validate(adBlueEntryIdParamSchema), adBlueEntryController.remove);

export default router;
