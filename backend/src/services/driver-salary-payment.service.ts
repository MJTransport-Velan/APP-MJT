import { driverSalaryPaymentRepository } from '../repositories/driver-salary-payment.repository';
import { AppError } from '../middlewares/error.middleware';

export const driverSalaryPaymentService = {
  /** Paid-month history for one driver — written only by financial-entry.service.ts's delegateToDriverSalaryPayment, this is a read-only view. */
  async listForDriver(driverId: string) {
    const driver = await driverSalaryPaymentRepository.findDriverById(driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    const payments = await driverSalaryPaymentRepository.findManyForDriver(driverId);
    return payments.map((p) => ({
      id: p.id,
      driverId: p.driverId,
      year: p.year,
      month: p.month,
      amount: p.amount,
      paidDate: p.paidDate,
      createdAt: p.createdAt,
    }));
  },
};
