
// posController.js
// Handles processing sales at the point of sale
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes and returns sales data necessary for POS operations.
// - Does not return or log unnecessary or sensitive data.
// - All endpoints are documented with their data processing purpose.

import { processSale as processSaleService } from '../services/salesService.js';
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
    if (error) {
        logEvent('POS_SALE_FAIL', { reason: error.details.map(e => e.message).join('; ') });
        return res.status(400).json({ message: error.details.map(e => e.message).join('; '), errors: error.details });
    }
    try {
        // Optionally: attach userId from auth middleware if available
        if (req.user && req.user.id) value.userId = req.user.id;
        const sale = await processSaleService(value);
        logEvent('POS_SALE_SUCCESS', { saleId: sale.id, total: sale.total, storeId: sale.storeId });
        res.status(201).json(sale);
    } catch (err) {
        logEvent('POS_SALE_ERROR', { error: err.message });
        res.status(400).json({ message: err.message });
    }
}

// Default export for compatibility with import posController from ...
export default {
  processSale
};
