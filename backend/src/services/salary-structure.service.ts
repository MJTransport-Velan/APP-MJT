import { salaryStructureRepository, SalaryStructureWithRelations } from '../repositories/salary-structure.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { CreateSalaryStructureInput } from '../validators/salary-structure.validator';

function serialize(s: SalaryStructureWithRelations) {
  return {
    id: s.id,
    employeeId: s.employeeId,
    effectiveFrom: s.effectiveFrom,
    effectiveTo: s.effectiveTo,
    isActive: s.isActive,
    employee: { id: s.employee.id, name: s.employee.name, employeeCode: s.employee.employeeCode },
    components: s.components.map((c) => ({
      id: c.id,
      componentType: c.componentType,
      name: c.name,
      calculationType: c.calculationType,
      value: c.value,
      isEarning: c.isEarning,
    })),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export const salaryStructureService = {
  async listForEmployee(employeeId: string) {
    const structures = await salaryStructureRepository.findManyForEmployee(employeeId);
    return structures.map(serialize);
  },

  async getActiveForEmployee(employeeId: string) {
    const structure = await salaryStructureRepository.findActiveForEmployee(employeeId);
    if (!structure) throw new AppError('This employee has no active salary structure', 404);
    return serialize(structure);
  },

  async getById(id: string) {
    const structure = await salaryStructureRepository.findById(id);
    if (!structure) throw new AppError('Salary Structure not found', 404);
    return serialize(structure);
  },

  /** Exactly one active structure per employee at a time — creating a new one deactivates the prior (versioned, not overwritten; design doc §8). */
  async create(input: CreateSalaryStructureInput, actorId: string) {
    const employee = await salaryStructureRepository.findEmployeeById(input.employeeId);
    if (!employee) throw new AppError('Employee not found', 404);
    if (!employee.isActive) throw new AppError('Cannot set a salary structure for an inactive employee', 409);
    if (input.components.length === 0) throw new AppError('At least one salary component is required', 422);

    await salaryStructureRepository.deactivateAllForEmployee(input.employeeId, actorId);

    const structure = await salaryStructureRepository.create({
      employeeId: input.employeeId,
      effectiveFrom: new Date(input.effectiveFrom),
      createdById: actorId,
      updatedById: actorId,
    });

    await salaryStructureRepository.createComponents(
      input.components.map((c) => ({
        salaryStructureId: structure.id,
        componentType: c.componentType,
        name: c.name,
        calculationType: c.calculationType ?? 'FIXED_AMOUNT',
        value: c.value,
        isEarning: c.isEarning,
      }))
    );

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'SalaryStructure',
      entityId: structure.id,
      description: `Created salary structure for ${employee.name}, effective ${input.effectiveFrom}`,
    });

    return salaryStructureService.getById(structure.id);
  },

  async remove(id: string, actorId: string) {
    const existing = await salaryStructureRepository.findById(id);
    if (!existing) throw new AppError('Salary Structure not found', 404);

    await salaryStructureRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'SalaryStructure', entityId: id, description: `Deleted salary structure for ${existing.employee.name}` });
  },
};
