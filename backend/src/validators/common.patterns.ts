import { z } from 'zod';

/**
 * Shared regex patterns and reusable Zod field validators — previously
 * redefined independently in ledger/supplier/driver/organization/
 * admin-company validators. Import from here instead of re-declaring.
 */
export const gstRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/;
export const panRegex = /^[A-Z]{5}\d{4}[A-Z]{1}$/;
export const tanRegex = /^[A-Z]{4}\d{5}[A-Z]{1}$/;
export const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const indianMobileRegex = /^[6-9]\d{9}$/;

export const zGstNumber = () => z.string().regex(gstRegex, 'Invalid GST number');
export const zPanNumber = () => z.string().regex(panRegex, 'Invalid PAN number');
export const zTanNumber = () => z.string().regex(tanRegex, 'Invalid TAN number');
export const zIfsc = () => z.string().regex(ifscRegex, 'Invalid IFSC code');
export const zIndianMobile = () => z.string().regex(indianMobileRegex, 'Phone must be a valid 10-digit number');
