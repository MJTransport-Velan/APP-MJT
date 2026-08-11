/**
 * Generic CRUD factory for "simple lookup" master modules — entities whose
 * shape is uniformly { name, code, ...a few extra fields, isActive } with
 * soft delete + audit logging. Used for Vehicle Types, Trailer Types,
 * Materials, Expense Categories, Fuel Stations, Banks, Payment Modes,
 * Tyres, Service Categories, Designations, and GST Masters.
 *
 * Modules with real relations or file uploads (Companies, Branches,
 * Locations, Transport Routes, Vehicles, Drivers, Suppliers) are NOT
 * built with this factory — they get their own bespoke
 * controller/service/repository/validator/routes files, same as every
 * Phase 2 Administration module.
 *
 * This still respects Repository Pattern / Service Layer separation —
 * the layers exist as named function groups within the factory — it's
 * just parameterized instead of duplicated per module, per the "no
 * duplicated code" / SOLID requirement.
 */
import { Router, Request, Response } from 'express';
import { z, ZodRawShape, ZodTypeAny } from 'zod';
import { prisma } from '../config/db';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from './asyncHandler';
import { sendSuccess } from './response';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from '../services/audit.service';
import { parsePagination, buildPaginationMeta } from './pagination';

// A generic dynamic factory that operates on any Prisma delegate sharing
// the { name, code, isActive, deletedAt, createdById, updatedById } shape
// cannot be expressed in Prisma's generated static types, so the delegate
// itself is intentionally typed loosely here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaDelegate = any;

export interface MasterFieldConfig {
  key: string;
  zod: ZodTypeAny;
  requiredOnCreate?: boolean;
}

export interface MasterModuleConfig {
  /** Prisma client delegate name, e.g. 'vehicleType' for prisma.vehicleType */
  modelName: string;
  /** Human label used in messages/audit descriptions, e.g. 'Vehicle Type' */
  entityLabel: string;
  /** Permission prefix, e.g. 'vehicle_type' -> vehicle_type.view/create/edit/delete */
  permissionPrefix: string;
  /** Fields included in text search (in addition to name/code) */
  searchFields?: string[];
  /** Extra fields beyond the universal name/code/isActive */
  fields?: MasterFieldConfig[];
  /** Set true if `name` should not be required (e.g. entities keyed by a different label field) */
  nameFieldKey?: string;
  /** Set if the unique code column isn't literally named `code` (e.g. FuelCard's `cardNumber` doubles as both name and code) */
  codeFieldKey?: string;
  /** Set if the model has a boolean "system-defined, protect from deletion" column (e.g. CostCategory.isSystemCategory) */
  systemFlagField?: string;
}

export function createMasterCrudRouter(config: MasterModuleConfig): Router {
  const router = Router();
  const delegate: PrismaDelegate = (prisma as unknown as Record<string, PrismaDelegate>)[config.modelName];
  const nameKey = config.nameFieldKey || 'name';
  const codeKey = config.codeFieldKey || 'code';
  const searchFields = config.searchFields || [nameKey, codeKey];
  const extraFields = config.fields || [];

  const createShape: ZodRawShape = {
    [nameKey]: z.string().min(1, `${config.entityLabel} name is required`),
  };
  const updateShape: ZodRawShape = {
    [nameKey]: z.string().min(1).optional(),
  };
  // When name and code are the same physical column (e.g. FuelCard.cardNumber
  // doubles as both), don't declare it twice.
  if (codeKey !== nameKey) {
    createShape[codeKey] = z.string().min(1, `${config.entityLabel} code is required`).toUpperCase();
    updateShape[codeKey] = z.string().min(1).toUpperCase().optional();
  }

  for (const field of extraFields) {
    createShape[field.key] = field.requiredOnCreate ? field.zod : field.zod.optional();
    updateShape[field.key] = field.zod.optional();
  }

  const createBodySchema = z.object(createShape);
  const updateBodySchema = z.object(updateShape);

  const createSchema = z.object({
    body: createBodySchema,
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  });
  const updateSchema = z.object({
    body: updateBodySchema,
    query: z.object({}).optional(),
    params: z.object({ id: z.string().uuid('Invalid id') }),
  });
  const idParamSchema = z.object({
    body: z.object({}).optional(),
    query: z.object({}).optional(),
    params: z.object({ id: z.string().uuid('Invalid id') }),
  });
  const listQuerySchema = z.object({
    body: z.object({}).optional(),
    params: z.object({}).optional(),
    query: z.object({
      page: z.string().optional(),
      pageSize: z.string().optional(),
      search: z.string().optional(),
      isActive: z.enum(['true', 'false']).optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    }),
  });

  function buildSearchWhere(search?: string) {
    if (!search) return {};
    return {
      OR: searchFields.map((field) => ({ [field]: { contains: search, mode: 'insensitive' } })),
    };
  }

  router.use(authenticate);

  // LIST (search, filter, sort, paginate)
  router.get(
    '/',
    authorize(`${config.permissionPrefix}.view`),
    validate(listQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, skip, take } = parsePagination(req.query);
      const search = req.query.search as string | undefined;
      const isActive =
        req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const where = {
        deletedAt: null,
        ...(isActive !== undefined ? { isActive } : {}),
        ...buildSearchWhere(search),
      };

      const [rows, total] = await Promise.all([
        delegate.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take }),
        delegate.count({ where }),
      ]);

      return sendSuccess(res, 200, {
        message: `${config.entityLabel} list fetched`,
        data: rows,
        meta: buildPaginationMeta(page, pageSize, total),
      });
    })
  );

  // VIEW BY ID
  router.get(
    '/:id',
    authorize(`${config.permissionPrefix}.view`),
    validate(idParamSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const record = await delegate.findFirst({ where: { id: req.params.id, deletedAt: null } });
      if (!record) {
        throw new AppError(`${config.entityLabel} not found`, 404);
      }
      return sendSuccess(res, 200, { message: `${config.entityLabel} fetched`, data: record });
    })
  );

  // CREATE
  router.post(
    '/',
    authorize(`${config.permissionPrefix}.create`),
    validate(createSchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const codeValue = req.body[codeKey];
      const codeTaken = await delegate.findFirst({ where: { [codeKey]: codeValue, deletedAt: null } });
      if (codeTaken) {
        throw new AppError(`${config.entityLabel} code already exists`, 409);
      }

      const record = await delegate.create({
        data: { ...req.body, createdById: req.user!.userId, updatedById: req.user!.userId },
      });

      await auditService.record({
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: config.entityLabel,
        entityId: record.id,
        description: `Created ${config.entityLabel} ${record[nameKey]}`,
      });

      return sendSuccess(res, 201, { message: `${config.entityLabel} created`, data: record });
    })
  );

  // UPDATE
  router.put(
    '/:id',
    authorize(`${config.permissionPrefix}.edit`),
    validate(updateSchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const existing = await delegate.findFirst({ where: { id: req.params.id, deletedAt: null } });
      if (!existing) {
        throw new AppError(`${config.entityLabel} not found`, 404);
      }

      const newCodeValue = req.body[codeKey];
      if (newCodeValue && newCodeValue !== existing[codeKey]) {
        const codeTaken = await delegate.findFirst({ where: { [codeKey]: newCodeValue, deletedAt: null } });
        if (codeTaken) {
          throw new AppError(`${config.entityLabel} code already exists`, 409);
        }
      }

      const record = await delegate.update({
        where: { id: req.params.id },
        data: { ...req.body, updatedById: req.user!.userId },
      });

      await auditService.record({
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: config.entityLabel,
        entityId: record.id,
        description: `Updated ${config.entityLabel} ${record[nameKey]}`,
      });

      return sendSuccess(res, 200, { message: `${config.entityLabel} updated`, data: record });
    })
  );

  // STATUS TOGGLE (activate/deactivate)
  router.patch(
    '/:id/status',
    authorize(`${config.permissionPrefix}.edit`),
    validate(idParamSchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const existing = await delegate.findFirst({ where: { id: req.params.id, deletedAt: null } });
      if (!existing) {
        throw new AppError(`${config.entityLabel} not found`, 404);
      }

      const record = await delegate.update({
        where: { id: req.params.id },
        data: { isActive: !existing.isActive, updatedById: req.user!.userId },
      });

      await auditService.record({
        userId: req.user!.userId,
        action: record.isActive ? 'ACTIVATE' : 'DEACTIVATE',
        entityType: config.entityLabel,
        entityId: record.id,
        description: `${record.isActive ? 'Activated' : 'Deactivated'} ${config.entityLabel} ${record[nameKey]}`,
      });

      return sendSuccess(res, 200, { message: `${config.entityLabel} status updated`, data: record });
    })
  );

  // DELETE (soft delete — sets deletedAt + isActive false; record is excluded
  // from all queries above but not physically removed, satisfying both the
  // "Delete" and "Soft Delete" requirements with one consistent behavior)
  router.delete(
    '/:id',
    authorize(`${config.permissionPrefix}.delete`),
    validate(idParamSchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const existing = await delegate.findFirst({ where: { id: req.params.id, deletedAt: null } });
      if (!existing) {
        throw new AppError(`${config.entityLabel} not found`, 404);
      }
      if (config.systemFlagField && existing[config.systemFlagField]) {
        throw new AppError(`${config.entityLabel} "${existing[nameKey]}" is system-defined and cannot be deleted`, 409);
      }

      await delegate.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date(), isActive: false, updatedById: req.user!.userId },
      });

      await auditService.record({
        userId: req.user!.userId,
        action: 'DELETE',
        entityType: config.entityLabel,
        entityId: req.params.id,
        description: `Deleted ${config.entityLabel} ${existing[nameKey]}`,
      });

      return sendSuccess(res, 200, { message: `${config.entityLabel} deleted` });
    })
  );

  return router;
}
