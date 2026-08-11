import { Router } from 'express';
import { fuelEntryController } from '../controllers/fuel-entry.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadFuelBill } from '../middlewares/upload.middleware';
import {
  createFuelEntrySchema,
  updateFuelEntrySchema,
  fuelEntryIdParamSchema,
  listFuelEntriesSchema,
  vehicleFuelSummaryQuerySchema,
} from '../validators/fuel-entry.validator';

const router = Router();
router.use(authenticate);

router.get('/vehicle-summary/:vehicleId', authorize('fuel_entry.view'), validate(vehicleFuelSummaryQuerySchema), fuelEntryController.vehicleSummary);
router.get('/advance-balance/:advanceId', authorize('fuel_entry.view'), fuelEntryController.advanceBalance);
router.get('/', authorize('fuel_entry.view'), validate(listFuelEntriesSchema), fuelEntryController.list);
router.get('/:id', authorize('fuel_entry.view'), validate(fuelEntryIdParamSchema), fuelEntryController.getById);
router.post('/', authorize('fuel_entry.create'), validate(createFuelEntrySchema), fuelEntryController.create);
router.put('/:id', authorize('fuel_entry.edit'), validate(updateFuelEntrySchema), fuelEntryController.update);
router.post('/:id/bill', authorize('fuel_entry.edit'), validate(fuelEntryIdParamSchema), uploadFuelBill, fuelEntryController.uploadBill);
router.delete('/:id', authorize('fuel_entry.delete'), validate(fuelEntryIdParamSchema), fuelEntryController.remove);

export default router;
