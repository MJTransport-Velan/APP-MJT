import { tripNoteRepository, TripNoteWithAuthor } from '../repositories/trip-note.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { CreateTripNoteInput } from '../validators/trip-note.validator';

function serialize(note: TripNoteWithAuthor) {
  return {
    id: note.id,
    tripId: note.tripId,
    note: note.note,
    author: note.createdBy ? { id: note.createdBy.id, fullName: note.createdBy.fullName } : null,
    createdAt: note.createdAt,
  };
}

export const tripNoteService = {
  async list(tripId: string) {
    const trip = await tripNoteRepository.findTripById(tripId);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }
    const notes = await tripNoteRepository.findByTripId(tripId);
    return notes.map(serialize);
  },

  async create(input: CreateTripNoteInput, actorId: string) {
    const trip = await tripNoteRepository.findTripById(input.tripId);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    const note = await tripNoteRepository.create({
      tripId: input.tripId,
      note: input.note,
      createdById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'TripNote',
      entityId: note.id,
      description: `Added a note to trip ${trip.tripNumber}`,
    });

    return serialize(note);
  },
};
