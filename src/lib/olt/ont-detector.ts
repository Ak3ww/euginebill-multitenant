/**
 * ONT Metadata & Vendor Detector
 * Reports ONT/ONU Vendor and Model directly from OLT metadata or clean fallback.
 */

export interface OntDetectedMetadata {
  vendor: string;
  model: string;
  isRecognized: boolean;
  rawSn: string;
}

/**
 * Clean & normalize a serial number string
 */
export function normalizeSerialNumber(sn: string | null | undefined): string {
  if (!sn) return '';
  return sn.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Detect ONT Vendor and Model from serial number and raw OLT metadata
 */
export function detectOntVendorAndModel(
  serialNumber?: string | null,
  onuType?: string | null,
  oltVendor?: string | null
): OntDetectedMetadata {
  const cleanSn = normalizeSerialNumber(serialNumber);
  const vendor = oltVendor?.trim() || 'ONT';
  const model = onuType?.trim() || 'ONT Modem';

  return {
    vendor: vendor || 'ONT',
    model: model || 'ONT Modem',
    isRecognized: true,
    rawSn: cleanSn,
  };
}
