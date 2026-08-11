import { AttachmentStatus } from '@prisma/client';
import { attachmentRepository } from '../repositories/attachment.repository';
import { AppError } from '../middlewares/error.middleware';

export interface UploadedFile {
  filename: string;
  path: string;
  mimetype: string;
  size: number;
}

/**
 * Generic, entity-scoped file storage — replaces the two independent
 * implementations this used to be (VoucherAttachment, TripDocument) with
 * one table and one service (architecture optimization pass). Callers
 * own their own domain rules (a POSTED voucher's attachments are
 * immutable; a POD upload flips Trip.podStatus) and call through to this
 * for the actual storage/verification mechanics.
 */
export const attachmentService = {
  listForEntity(entityType: string, entityId: string) {
    return attachmentRepository.findForEntity(entityType, entityId);
  },

  async upload(entityType: string, entityId: string, category: string, file: UploadedFile, uploadedById: string, filePathPrefix = '/uploads/documents/') {
    return attachmentRepository.create({
      entityType,
      entityId,
      category,
      fileName: file.filename,
      filePath: `${filePathPrefix}${file.filename}`,
      fileType: file.mimetype,
      fileSizeBytes: file.size,
      uploadedById,
    });
  },

  /** For callers (like Trip documents) that already have a resolved fileUrl rather than a raw multer file. */
  async uploadFromUrl(entityType: string, entityId: string, category: string, fileUrl: string, uploadedById: string, remarks?: string, status: AttachmentStatus = 'PENDING_VERIFICATION') {
    return attachmentRepository.create({
      entityType,
      entityId,
      category,
      filePath: fileUrl,
      remarks,
      status,
      uploadedById,
    });
  },

  async findOwned(id: string, entityType: string, entityId: string) {
    const attachment = await attachmentRepository.findById(id);
    if (!attachment || attachment.entityType !== entityType || attachment.entityId !== entityId) {
      throw new AppError('Attachment not found', 404);
    }
    return attachment;
  },

  async remove(id: string) {
    return attachmentRepository.softDelete(id);
  },

  async verify(id: string, status: 'VERIFIED' | 'REJECTED', remarks: string | undefined, verifiedById: string) {
    const attachment = await attachmentRepository.findById(id);
    if (!attachment) throw new AppError('Attachment not found', 404);
    return attachmentRepository.setStatus(id, status, remarks, verifiedById);
  },
};
