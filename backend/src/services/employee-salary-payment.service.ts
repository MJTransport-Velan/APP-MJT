import { employeeSalaryPaymentRepository } from '../repositories/employee-salary-payment.repository';
import { AppError } from '../middlewares/error.middleware';

export const employeeSalaryPaymentService = {
  /** Paid-month history for one employee — written only by financial-entry.service.ts's delegateToEmployeeSalaryPayment, this is a read-only view. */
  async listForEmployee(employeeId: string) {
    const employee = await employeeSalaryPaymentRepository.findEmployeeById(employeeId);
    if (!employee) throw new AppError('Employee not found', 404);

    const payments = await employeeSalaryPaymentRepository.findManyForEmployee(employeeId);
    return payments.map((p) => ({
      id: p.id,
      employeeId: p.employeeId,
      year: p.year,
      month: p.month,
      amount: p.amount,
      paidDate: p.paidDate,
      createdAt: p.createdAt,
    }));
  },
};
