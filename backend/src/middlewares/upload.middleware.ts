import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const profilePhotoDir = path.join(__dirname, '..', '..', 'uploads', 'profile-photos');

if (!fs.existsSync(profilePhotoDir)) {
  fs.mkdirSync(profilePhotoDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, profilePhotoDir);
  },
  filename: (req: Request, file, cb) => {
    const authUserId = (req as Request & { user?: { userId?: string } }).user?.userId;
    const userId = req.params.id || authUserId || 'unknown';
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${Date.now()}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, or WEBP images are allowed'));
  }
}

export const uploadProfilePhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
}).single('photo');

// --- Generic document upload (Vehicle RC/Insurance/Permit, Driver License,
// Supplier documents) — stored under uploads/documents, accepts PDFs and
// images since these are typically scanned certificates.
const documentsDir = path.join(__dirname, '..', '..', 'uploads', 'documents');

if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, documentsDir);
  },
  filename: (req: Request, file, cb) => {
    const entityId = req.params.id || 'new';
    const ext = path.extname(file.originalname);
    const safeField = file.fieldname.replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${entityId}-${safeField}-${Date.now()}${ext}`);
  },
});

const ALLOWED_DOCUMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function documentFileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP, or PDF files are allowed'));
  }
}

const documentUpload = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/** Vehicle documents: rcDocument, insuranceDocument, permitDocument (each optional, single file) */
export const uploadVehicleDocuments = documentUpload.fields([
  { name: 'rcDocument', maxCount: 1 },
  { name: 'insuranceDocument', maxCount: 1 },
  { name: 'permitDocument', maxCount: 1 },
]);

/** Driver license document (single file) */
export const uploadDriverLicense = documentUpload.single('licenseDocument');

/** Supplier document (single file) */
export const uploadSupplierDocument = documentUpload.single('document');

/** Vehicle Fitness Certificate (single file) */
export const uploadFitnessCertificate = documentUpload.single('fitnessDocument');

/** Vehicle PUC Certificate (single file) */
export const uploadPucCertificate = documentUpload.single('pucDocument');

/** Maintenance / Repair / Service bill, or Accident photo (single file, reused across both) */
export const uploadMaintenanceAttachment = documentUpload.single('attachment');

/** Generic expense bill document (single file) */
export const uploadExpenseBill = documentUpload.single('billDocument');

/** FASTag transaction attachment — toll receipt / NHAI statement excerpt (single file) */
export const uploadFastTagAttachment = documentUpload.single('attachment');

/** Diesel/Fuel entry bill document (single file) */
export const uploadFuelBill = documentUpload.single('billDocument');

/** AdBlue entry bill document (single file) */
export const uploadAdBlueBill = documentUpload.single('billDocument');

/** Trip documents: POD / LR Copy / Invoice Copy / Delivery Proof / Other (single file per upload) */
export const uploadTripDocument = documentUpload.single('file');

/** Voucher attachments: invoice/bill/receipt/cheque image/POD/supporting docs (single file per upload) */
export const uploadVoucherAttachment = documentUpload.single('file');

// --- Bank statement import (foundation only — CSV/Excel upload + raw
// storage; no parser implementation, per the Phase 9 design doc §6.11) ---
const statementImportDir = path.join(__dirname, '..', '..', 'uploads', 'bank-statements');

if (!fs.existsSync(statementImportDir)) {
  fs.mkdirSync(statementImportDir, { recursive: true });
}

const statementImportStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, statementImportDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `stmt-${Date.now()}${ext}`);
  },
});

const ALLOWED_STATEMENT_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function statementFileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (ALLOWED_STATEMENT_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV or Excel files are allowed'));
  }
}

export const uploadBankStatement = multer({
  storage: statementImportStorage,
  fileFilter: statementFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('file');

// Phase 14 (docs Phase 8) — Import Framework. Memory storage: the file is
// parsed row-by-row by exceljs and each row is handed to the target
// entity's own existing create() service, so nothing needs to persist the
// raw upload to disk once the batch finishes.
export const uploadBulkImportFile = multer({
  storage: multer.memoryStorage(),
  fileFilter: statementFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('file');
