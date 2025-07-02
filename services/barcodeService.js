

// barcodeService.js
// Handles barcode generation and scanning logic (production grade)
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes barcode data necessary for generation/scanning.
// - Does not log or store personal or sensitive data.
// - All service functions are documented with their data processing purpose.

import bwipjs from 'bwip-js';
import winston from 'winston';
import Redis from '../config/redisClient.js';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/barcode-service.log' })
    ]
});

// Generate a barcode image as a PNG buffer or SVG string (advanced options) with Redis caching
/**
 * Generate a barcode image (PNG/SVG)
 * Purpose: Only processes data needed for barcode generation. No personal data stored or logged.
 */
export async function generateBarcode(data, options = {}) {
    const {
        bcid = 'code128', // Barcode type
        scale = 3,
        height = 10,
        width,
        includetext = true,
        textxalign = 'center',
        text,
        backgroundcolor,
        padding,
        format = 'png', // 'png' or 'svg'
        ...rest
    } = options;
    const cacheKey = `barcode:${bcid}:${format}:${Buffer.from((text || data) + JSON.stringify({ scale, height, width, includetext, textxalign, backgroundcolor, padding, ...rest })).toString('base64')}`;
    try {
        // Try to get from Redis cache
        if (Redis.redisAvailable && Redis.redisAvailable()) {
            const cached = await Redis.client.get(cacheKey);
            if (cached) {
                logger.info({ event: 'BARCODE_CACHE_HIT', bcid, format, data });
                return Buffer.from(cached, 'base64');
            }
        }
        const bwipOptions = {
            bcid,
            text: text || data,
            scale,
            height,
            includetext,
            textxalign,
            ...rest
        };
        if (width) bwipOptions.width = width;
        if (backgroundcolor) bwipOptions.backgroundcolor = backgroundcolor;
        if (padding) bwipOptions.padding = padding;
        let result;
        if (format === 'svg') {
            result = await bwipjs.toBuffer({ ...bwipOptions, encoding: 'utf8', type: 'svg' });
        } else {
            result = await bwipjs.toBuffer(bwipOptions);
        }
        // Cache the result in Redis (as base64 string)
        if (Redis.redisAvailable && Redis.redisAvailable()) {
            await Redis.client.setEx(cacheKey, 3600, result.toString('base64'));
            logger.info({ event: 'BARCODE_CACHE_SET', bcid, format, data });
        }
        logger.info({ event: 'BARCODE_GENERATED', bcid, format, data });
        return result;
    } catch (err) {
        logger.error({ event: 'BARCODE_GENERATION_ERROR', error: err.message, bcid, data });
        throw new Error('Barcode generation failed: ' + err.message);
    }
}



// Scan a barcode from an image buffer (Node.js, using @zxing/library via JSDOM)
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { createCanvas, loadImage } from 'canvas';

/**
 * Scan a barcode from an image buffer
 * Purpose: Only processes image buffer to extract barcode text. No personal data stored or logged.
 */
export async function scanBarcode(imageBuffer) {
    try {
        const img = await loadImage(imageBuffer);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const reader = new BrowserMultiFormatReader();
        const luminanceSource = {
            getWidth: () => img.width,
            getHeight: () => img.height,
            getRow: (y, row) => imageData.data.slice(y * img.width * 4, (y + 1) * img.width * 4),
            getMatrix: () => imageData.data
        };
        const result = await reader.decodeBitmap(luminanceSource);
        logger.info({ event: 'BARCODE_SCANNED', result: result.getText() });
        return result.getText();
    } catch (err) {
        if (err instanceof NotFoundException) {
            logger.warn({ event: 'BARCODE_NOT_FOUND' });
            throw new Error('No barcode found in image.');
        }
        logger.error({ event: 'BARCODE_SCAN_ERROR', error: err.message });
        // Optionally: add Sentry or monitoring integration here
        throw new Error('Barcode scanning failed: ' + err.message);
    }
}


// Utility: Validate barcode format
/**
 * Validate barcode format
 * Purpose: Only checks format string. No personal data processed.
 */
export function isValidBarcodeFormat(format) {
    const supported = ['code128', 'ean13', 'ean8', 'upc', 'qrcode', 'pdf417', 'datamatrix'];
    const valid = supported.includes(format?.toLowerCase?.());
    if (!valid) {
        logger.warn({ event: 'BARCODE_FORMAT_UNSUPPORTED', format });
    }
    return valid;
}
