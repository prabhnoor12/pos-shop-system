
// reportController.js
// Handles generating various reports
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes and returns report data necessary for business operations.
// - Does not return or log unnecessary or sensitive data.
// - All endpoints are documented with their data processing purpose.

import { PrismaClient } from '@prisma/client';
import winston from 'winston';
const prisma = new PrismaClient();

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

function logEvent(event, details) {
    logger.info({ event, ...details });
}

/**
 * Generate sales report
 * Purpose: Only returns sales data needed for business reporting. Avoids unnecessary or sensitive fields.
 */
export async function generateSalesReport(req, res) {
    try {
        const { startDate, endDate } = req.query;
        const where = {};
        if (startDate || endDate) {
            where.saleDate = {};
            if (startDate) where.saleDate.gte = new Date(startDate);
            if (endDate) where.saleDate.lte = new Date(endDate);
        }
        const sales = await prisma.sale.findMany({
            where,
            include: {
                items: true,
                customer: true
            },
            orderBy: { saleDate: 'desc' }
        });
        logEvent('REPORT_SALES_SUCCESS', { count: sales.length });
        res.json({ data: sales });
    } catch (err) {
        logEvent('REPORT_SALES_ERROR', { error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

/**
 * Generate inventory report
 * Purpose: Only returns inventory data needed for business reporting. Avoids unnecessary or sensitive fields.
 */
export async function generateInventoryReport(req, res) {
    try {
        const { lowStock = false } = req.query;
        const where = {};
        if (lowStock === 'true') {
            where.quantity = { lte: prisma.inventory.fields.minStock };
        }
        const inventory = await prisma.inventory.findMany({
            where,
            include: { product: true },
            orderBy: { productId: 'asc' }
        });
        logEvent('REPORT_INVENTORY_SUCCESS', { count: inventory.length });
        res.json({ data: inventory });
    } catch (err) {
        logEvent('REPORT_INVENTORY_ERROR', { error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// Default export for compatibility with import reportController from ...
export default {
  generateSalesReport,
  generateInventoryReport
};
