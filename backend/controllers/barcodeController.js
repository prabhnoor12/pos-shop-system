
// barcodeController.js
// Handles barcode generation and scanning endpoints
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes barcode data necessary for generation/scanning.
// - Does not store or log any personal or sensitive data.
// - All endpoints are documented with their data processing purpose.

import * as barcodeService from '../services/barcodeService.js';

/**
 * Generate a barcode from provided data
 * Purpose: Only processes the data needed to generate a barcode. Does not store or return extra info.
 */
export async function generate(req, res) {
    try {
        const { data, ...options } = req.body;
        const tenantId = req.tenantId;
        if (!data) return res.status(400).json({ message: 'Missing data for barcode generation' });
        const result = await barcodeService.generateBarcode(data, options);
        // Optionally: log barcode generation event with tenantId
        // logger.info({ event: 'BARCODE_GENERATED', tenantId });
        if (options.format === 'svg') {
            res.set('Content-Type', 'image/svg+xml');
            return res.send(result);
        }
        res.set('Content-Type', 'image/png');
        res.send(result);
    } catch (err) {
        // logger.error({ event: 'BARCODE_GENERATE_ERROR', error: err.message, tenantId: req.tenantId });
        res.status(400).json({ message: err.message });
    }
}

/**
 * Scan a barcode from an uploaded image
 * Purpose: Only processes the image buffer to extract barcode text. Does not store or return extra info.
 */
export async function scan(req, res) {
    try {
        const tenantId = req.tenantId;
        if (!req.file || !req.file.buffer) return res.status(400).json({ message: 'No image uploaded' });
        const text = await barcodeService.scanBarcode(req.file.buffer);
        // Optionally: log barcode scan event with tenantId
        // logger.info({ event: 'BARCODE_SCANNED', tenantId });
        res.json({ text });
    } catch (err) {
        // logger.error({ event: 'BARCODE_SCAN_ERROR', error: err.message, tenantId: req.tenantId });
        res.status(400).json({ message: err.message });
    }
}

/**
 * Validate barcode format
 * Purpose: Only checks the format string. No personal data processed.
 */
export function validateFormat(req, res) {
    const { format } = req.query;
    if (!format) return res.status(400).json({ valid: false, message: 'No format provided' });
    const valid = barcodeService.isValidBarcodeFormat(format);
    res.json({ valid });
}

// Default export for compatibility with import barcodeController from ...
export default {
  generate,
  scan,
  validateFormat
};
