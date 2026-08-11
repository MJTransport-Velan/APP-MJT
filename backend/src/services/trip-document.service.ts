import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { attachmentService } from './attachment.service';
import { attachmentRepository } from '../repositories/attachment.repository';
import { UploadTripDocumentInput } from '../validators/trip-document.validator';

const ENTITY_TYPE = 'TRIP';

/**
 * Trip-specific rules (POD upload flips Trip.podStatus) live here; the
 * actual storage/verification mechanics delegate to the generic
 * attachmentService (architecture optimization pass — this used to own
 * its own TripDocument table). The API's status vocabulary
 * (PENDING/VERIFIED/REJECTED) is preserved exactly as before — internally
 * a fresh upload is Attachment.status='PENDING_VERIFICATION', translated
 * to 'PENDING' on the way out so no frontend contract changes.
 */
function serialize(doc: {
  id: string;
  entityId: string;
  category: string;
  filePath: string;
  remarks: string | null;
  status: string;
  verifiedAt: Date | null;
  uploadedAt: Date;
}) {
  return {
    id: doc.id,
    tripId: doc.entityId,
    type: doc.category,
    fileUrl: doc.filePath,
    remarks: doc.remarks,
    status: doc.status === 'PENDING_VERIFICATION' ? 'PENDING' : doc.status,
    verifiedAt: doc.verifiedAt,
    createdAt: doc.uploadedAt,
  };
}

export const tripDocumentService = {
  async list(tripId?: string, type?: string) {
    if (tripId) {
      const docs = await attachmentService.listForEntity(ENTITY_TYPE, tripId);
      return docs.filter((d) => !type || d.category === type).map(serialize);
    }
    // No tripId filter — list across every trip (admin/reporting view).
    const docs = await prisma.attachment.findMany({
      where: { entityType: ENTITY_TYPE, deletedAt: null, ...(type ? { category: type } : {}) },
      orderBy: { uploadedAt: 'desc' },
    });
    return docs.map(serialize);
  },

  async upload(input: UploadTripDocumentInput, fileUrl: string, actorId: string) {
    const trip = await prisma.trip.findFirst({ where: { id: input.tripId, deletedAt: null } });
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    const doc = await attachmentService.uploadFromUrl(ENTITY_TYPE, input.tripId, input.type, fileUrl, actorId, input.remarks);

    if (input.type === 'POD') {
      await prisma.trip.update({ where: { id: input.tripId }, data: { podStatus: 'UPLOADED' } });
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'TripDocument',
      entityId: doc.id,
      description: `Uploaded ${input.type} for trip ${trip.tripNumber}`,
    });

    return serialize(doc);
  },

  async verify(id: string, status: 'VERIFIED' | 'REJECTED', remarks: string | undefined, actorId: string) {
    const doc = await attachmentRepository.findById(id);
    if (!doc || doc.entityType !== ENTITY_TYPE) {
      throw new AppError('Document not found', 404);
    }

    const updated = await attachmentService.verify(id, status, remarks, actorId);

    if (doc.category === 'POD' && status === 'VERIFIED') {
      await prisma.trip.update({ where: { id: doc.entityId }, data: { podStatus: 'VERIFIED' } });
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'TripDocument',
      entityId: id,
      description: `${status === 'VERIFIED' ? 'Verified' : 'Rejected'} ${doc.category} document`,
    });

    return serialize(updated);
  },
};
