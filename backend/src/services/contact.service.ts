import { prisma } from '../config/db';
import { auditService } from './audit.service';
import { CreateContactEnquiryInput } from '../validators/contact.validator';

export const contactService = {
  /** Records an enquiry from the public website's contact form. */
  async create(input: CreateContactEnquiryInput) {
    const enquiry = await prisma.contactEnquiry.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email || undefined,
        message: input.message,
      },
    });

    await auditService.record({
      action: 'CREATE',
      entityType: 'ContactEnquiry',
      entityId: enquiry.id,
      description: `Contact enquiry received from ${enquiry.name}`,
    });

    // Nothing about the stored row is echoed back — the public caller only
    // needs to know the enquiry landed.
    return { received: true };
  },
};
