// salesController.js
// Handles sales CRUD and reporting
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes and returns sales data necessary for business operations.
// - Does not return or log unnecessary or sensitive data.
// - All endpoints are documented with their data processing purpose.
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Sync sales from offline clients
export async function syncSales(req, res) {
    const tenantId = req.tenantId;
    const { sales } = req.body; // sales: array of sales objects
    if (!tenantId || !Array.isArray(sales) || sales.length === 0) {
        return res.status(400).json({ message: 'Invalid sync payload.' });
    }
    try {
        const results = [];
        for (const sale of sales) {
            // Use unique offlineId to avoid duplicates
            const existing = await prisma.sale.findFirst({ where: { offlineId: sale.offlineId, tenantId } });
            if (existing) {
                results.push({ offlineId: sale.offlineId, status: 'duplicate' });
                continue;
            }
            const created = await prisma.sale.create({ data: { ...sale, tenantId, synced: true, source: 'offline' } });
            results.push({ id: created.id, offlineId: sale.offlineId, status: 'synced' });
        }
        res.json({ results });
    } catch (err) {
        logEvent('SALES_SYNC_ERROR', { error: err.message, tenantId });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}
// salesController.js
// Handles retrieving sales data

import { getSales as getSalesService, getSaleById as getSaleByIdService, processSale as processSaleService } from '../services/salesService.js';
import { printReceipt, openCashDrawer } from '../hardware/cashier.hardware.js';
// Process a sale (POST /sales)
export async function processSale(req, res) {
    try {
        const tenantId = req.tenantId;
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        const sale = await processSaleService({ ...req.body, tenantId });

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

        // Print receipt and open cash drawer
        try {
          printReceipt(lines);
          if (sale.paymentType && sale.paymentType.toLowerCase() === 'cash') {
            openCashDrawer();
          }
        } catch (hwErr) {
          logEvent('HARDWARE_ERROR', { error: hwErr.message, tenantId });
        }

        res.status(201).json(sale);
    } catch (err) {
        logEvent('SALE_PROCESS_ERROR', { error: err.message, tenantId });
        res.status(400).json({ message: err.message });
    }
}
import winston from 'winston';
import { sendWhatsApp, sendEmail } from '../services/smsService.js';
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

export async function getSales(req, res) {
    try {
        const tenantId = req.tenantId;
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        const { customerId, startDate, endDate, page = 1, limit = 20, storeId, registerId } = req.query;
        // Map to service query keys
        const query = {
            customerId,
            from: startDate,
            to: endDate,
            page,
            limit,
            tenantId,
            ...(storeId ? { storeId: Number(storeId) } : {}),
            ...(registerId ? { registerId: Number(registerId) } : {})
        };
        const result = await getSalesService(query);
        res.json(result);
        // Send notifications for every sales query
        const recipientPhone = process.env.NOTIFY_WHATSAPP_TO;
        const recipientEmail = process.env.NOTIFY_EMAIL_TO;
        const msg = `Sales data queried. Customer: ${customerId || 'all'}, Store: ${storeId || 'all'}, Register: ${registerId || 'all'}, Date range: ${startDate || 'any'} - ${endDate || 'any'}`;
        if (recipientPhone) {
          sendWhatsApp(recipientPhone, msg).catch(e => logger.error({ event: 'WHATSAPP_SEND_ERROR', error: e.message, tenantId }));
        }
        if (recipientEmail) {
          sendEmail(recipientEmail, 'Sales Queried', msg, `<p>${msg}</p>`).catch(e => logger.error({ event: 'EMAIL_SEND_ERROR', error: e.message, tenantId }));
        }
    } catch (err) {
        logEvent('SALES_LIST_ERROR', { error: err.message, tenantId });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

export async function getSaleById(req, res) {
    const { id } = req.params;
    try {
        const tenantId = req.tenantId;
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        const sale = await getSaleByIdService(id, tenantId);
        if (!sale) {
            return res.status(404).json({ message: 'Sale not found' });
        }
        res.json(sale);
        // Send notifications for every sale detail query
        const recipientPhone = process.env.NOTIFY_WHATSAPP_TO;
        const recipientEmail = process.env.NOTIFY_EMAIL_TO;
        const msg = `Sale detail queried. Sale ID: ${id}`;
        if (recipientPhone) {
          sendWhatsApp(recipientPhone, msg).catch(e => logger.error({ event: 'WHATSAPP_SEND_ERROR', error: e.message, tenantId }));
        }
        if (recipientEmail) {
          sendEmail(recipientEmail, 'Sale Queried', msg, `<p>${msg}</p>`).catch(e => logger.error({ event: 'EMAIL_SEND_ERROR', error: e.message, tenantId }));
        }
    } catch (err) {
        logEvent('SALE_GET_ERROR', { id, error: err.message, tenantId });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// Default export for compatibility with import salesController from ...
export default {
  getSales,
  getSaleById,
  processSale
  ,syncSales
};
