/**
 * FuelCard and SparePart are simple lookup-style catalogs introduced by
 * Phase 4. Reuses the existing generic createMasterCrudRouter factory
 * (from Phase 3's Masters work) — no Masters files are touched, this
 * just imports the shared utility, same as Phase 3 itself did for its
 * 12 lookup modules.
 */
import { Router } from 'express';
import { z } from 'zod';
import { createMasterCrudRouter, MasterModuleConfig } from '../utils/masterCrudFactory';

const configs: MasterModuleConfig[] = [
  {
    modelName: 'fuelCard',
    entityLabel: 'Fuel Card',
    permissionPrefix: 'fuel_card',
    nameFieldKey: 'cardNumber',
    codeFieldKey: 'cardNumber',
    searchFields: ['cardNumber', 'issuedTo'],
    fields: [{ key: 'issuedTo', zod: z.string() }],
  },
  {
    modelName: 'sparePart',
    entityLabel: 'Spare Part',
    permissionPrefix: 'spare_part',
    fields: [
      { key: 'unit', zod: z.string() },
      { key: 'stockQuantity', zod: z.number().int().nonnegative() },
      { key: 'reorderLevel', zod: z.number().int().nonnegative() },
    ],
  },
];

const routePaths: Record<string, string> = {
  fuel_card: 'fuel-cards',
  spare_part: 'spare-parts',
};

const router = Router();

for (const config of configs) {
  router.use(`/${routePaths[config.permissionPrefix]}`, createMasterCrudRouter(config));
}

export default router;
