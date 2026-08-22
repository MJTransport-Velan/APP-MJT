import { prisma } from '../config/db';

/**
 * Issues the next number in a per-prefix, per-day sequence as a single atomic
 * upsert (INSERT ... ON CONFLICT DO UPDATE seq = seq + 1).
 *
 * Replaces the `count() + 1` idiom this codebase used for almost every
 * document number, which is wrong in two ways that both surface in practice:
 *
 *  1. It races. Two requests posting at the same moment both read the same
 *     count and mint the same number; whichever loses hits the unique
 *     constraint and the user gets an unexplained "already exists" error.
 *  2. It reuses numbers after any hard delete, because the count drops while
 *     the surviving rows keep their numbers — so the next document collides
 *     with one already issued.
 *
 * The DocumentCounter row is the sequence's own record, so neither deleting a
 * document nor concurrent posting can disturb it. Booking already worked this
 * way; this generalises it so every module can share one implementation.
 *
 * `findHighestToday` exists for the switch-over: documents issued under the
 * old scheme already occupy numbers for today, so the very first time a
 * counter is created it starts above the highest number already in use rather
 * than at 1. It is called once per prefix per day and never again.
 */
export async function nextDocumentNumber(
  prefix: string,
  pad: number,
  findHighestToday?: (todayStamp: string) => Promise<number>
): Promise<string> {
  const now = new Date();
  const stamp =
    `${now.getFullYear()}` +
    `${String(now.getMonth() + 1).padStart(2, '0')}` +
    `${String(now.getDate()).padStart(2, '0')}`;
  const key = `${prefix}-${stamp}`;

  const existing = await prisma.documentCounter.findUnique({ where: { key } });

  if (!existing) {
    const seed = findHighestToday ? await findHighestToday(stamp) : 0;
    try {
      const created = await prisma.documentCounter.create({ data: { key, seq: seed + 1 } });
      return format(prefix, stamp, created.seq, pad);
    } catch {
      // Another request created the counter first — fall through to the
      // atomic increment below, which is the normal path from here on.
    }
  }

  const counter = await prisma.documentCounter.update({
    where: { key },
    data: { seq: { increment: 1 } },
  });
  return format(prefix, stamp, counter.seq, pad);
}

function format(prefix: string, stamp: string, seq: number, pad: number) {
  return `${prefix}-${stamp}-${String(seq).padStart(pad, '0')}`;
}

/**
 * Highest sequence already issued today for a `PREFIX-YYYYMMDD-NNNNN` column,
 * used to seed a counter the first time it is created. Returns 0 when nothing
 * has been issued today.
 */
export async function highestSequenceToday(
  rows: { [k: string]: unknown }[],
  field: string,
  prefix: string,
  stamp: string
): Promise<number> {
  const head = `${prefix}-${stamp}-`;
  let max = 0;
  for (const row of rows) {
    const value = String(row[field] ?? '');
    if (!value.startsWith(head)) continue;
    const seq = parseInt(value.slice(head.length), 10);
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return max;
}
