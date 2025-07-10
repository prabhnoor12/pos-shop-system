
// posController.js
// Handles processing sales at the point of sale
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes and returns sales data necessary for POS operations.
// - Does not return or log unnecessary or sensitive data.
// - All endpoints are documented with their data processing purpose.

import { processSale as processSaleService } from '../services/salesService.js';
import { printReceipt, openCashDrawer } from '../hardware/cashier.hardware.js';
import { printQRCode } from '../hardware/printer.hardware.js';
import { showOnDisplay } from '../hardware/display.hardware.js';
import Joi from 'joi';
import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

const saleSchema = Joi.object({
    customerId: Joi.number().integer().allow(null),
    storeId: Joi.number().integer().required(),
    items: Joi.array().items(
        Joi.object({
            productId: Joi.number().integer().required(),
            quantity: Joi.number().integer().min(1).required(),
            price: Joi.number().precision(2).min(0).required()
        })
    ).min(1).required(),
    total: Joi.number().precision(2).min(0).required(),
    paymentType: Joi.string().valid('cash', 'card', 'mobile', 'other').required(),
    paid: Joi.boolean().default(true)
});

function logEvent(event, details) {
    logger.info({ event, ...details });
}

/**
 * Process a sale at the point of sale
 * Purpose: Only processes and returns sales data needed for POS operations.
 */
export async function processSale(req, res) {
    const { error, value } = saleSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    const tenantId = req.tenantId;
    if (error) {
        logEvent('POS_SALE_FAIL', { reason: error.details.map(e => e.message).join('; '), tenantId });
        return res.status(400).json({ message: error.details.map(e => e.message).join('; '), errors: error.details });
    }
    try {
        // Optionally: attach userId from auth middleware if available
        if (req.user && req.user.id) value.userId = req.user.id;
        value.tenantId = tenantId;
        const sale = await processSaleService(value);
        logEvent('POS_SALE_SUCCESS', { saleId: sale.id, total: sale.total, storeId: sale.storeId, tenantId });

        // Prepare detailed receipt lines
        const lines = [];
        lines.push('      POS RECEIPT      ');
        lines.push('--------------------------');
        lines.push(`Date: ${(new Date(sale.saleDate)).toLocaleString()}`);
        if (sale.storeId) lines.push(`Store: ${sale.storeId}`);
        if (sale.registerId) lines.push(`Register: ${sale.registerId}`);
        if (sale.userId) lines.push(`Cashier: ${sale.userId}`);
        lines.push('--------------------------');
        sale.items.forEach(item => {
          lines.push(`${item.productId} x${item.quantity}  @${item.price.toFixed(2)}`);
        });
        lines.push('--------------------------');
        lines.push(`TOTAL: $${sale.total.toFixed(2)}`);
        lines.push(`Paid: $${sale.paid ? sale.total.toFixed(2) : '0.00'}`);
        lines.push(`Payment: ${sale.paymentType}`);
        lines.push('--------------------------');
        lines.push('Thank you for shopping!');

        // Print receipt, open cash drawer, show on display, print QR (optional)
        try {
          printReceipt(lines);
          if (sale.paymentType && sale.paymentType.toLowerCase() === 'cash') {
            openCashDrawer();
          }
          // Show total on customer display
          showOnDisplay('TOTAL', `$${sale.total.toFixed(2)}`);
          // Optionally print QR code for digital receipt (uncomment if needed)
          // printQRCode(`https://yourdomain.com/receipt/${sale.id}`);
        } catch (hwErr) {
          logEvent('HARDWARE_ERROR', { error: hwErr.message, tenantId });
        }

        res.status(201).json(sale);
    } catch (err) {
        logEvent('POS_SALE_ERROR', { error: err.message, tenantId });
        res.status(400).json({ message: err.message });
    }
}

// Default export for compatibility with import posController from ...
export default {
  processSale
};
