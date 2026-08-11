import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const tripNoteWithAuthor = Prisma.validator<Prisma.TripNoteInclude>()({
  createdBy: true,
});

export type TripNoteWithAuthor = Prisma.TripNoteGetPayload<{ include: typeof tripNoteWithAuthor }>;

export const tripNoteRepository = {
  findTripById(id: string) {
    return prisma.trip.findFirst({ where: { id, deletedAt: null } });
  },

  findByTripId(tripId: string) {
    return prisma.tripNote.findMany({
      where: { tripId },
      include: tripNoteWithAuthor,
      orderBy: { createdAt: 'desc' },
    });
  },

  create(data: { tripId: string; note: string; createdById: string }) {
    return prisma.tripNote.create({ data, include: tripNoteWithAuthor });
  },
};
