import { Prisma } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';

/**
 * Runs a hard delete — the row physically leaves the database, no deletedAt
 * tombstone — and turns the two failures Postgres reports into answers a user
 * can act on rather than a 500.
 *
 * P2003 is a foreign key still pointing at the row: a bank account that has
 * cheques, a cheque book with cheques issued from it. The delete is refused
 * by the database, which is the outcome we want; this only replaces the raw
 * driver error with a sentence naming what to clear first.
 *
 * Callers that own balance side effects (a transfer that moved money, a
 * capital transaction that changed a fund account) must reverse those
 * themselves before calling — nothing here knows what the row did.
 */
export async function hardDelete<T>(
  label: string,
  run: () => Promise<T>,
  hint?: string
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw new AppError(
          hint ?? `This ${label} is still referenced by other records, so it cannot be deleted. Remove those first.`,
          409
        );
      }
      if (error.code === 'P2025') {
        throw new AppError(`${label} not found`, 404);
      }
    }
    throw error;
  }
}
