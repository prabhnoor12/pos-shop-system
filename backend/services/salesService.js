
// salesService.js
// Handles sales business logic (production grade)
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes sales data necessary for business operations.
// - Does not log or store personal or sensitive data.
// - All service functions are documented with their data processing purpose.

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
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/sales-service.log' })
    ]
});

// Process a sale (transactional) with logging
/**
 * Process a sale (transactional)
 * Purpose: Only processes and stores sales data needed for business operations. No personal data stored or logged.
 */
export async function processSale(data) {
    const { customerId, items, total, paymentType, paid, tenantId, userId, storeId, registerId, offlineId, synced, source } = data;
    if (!tenantId) throw new Error('Tenant context required');
    try {
        // Idempotency for offline sync: check offlineId
        if (offlineId) {
            const existing = await prisma.sale.findFirst({ where: { offlineId, tenantId } });
            if (existing) return existing;
        }
        const sale = await prisma.$transaction(async (tx) => {
            const saleRecord = await tx.sale.create({
                data: {
                    customerId,
                    total,
                    paymentType,
                    paid,
                    saleDate: new Date(),
                    tenantId,
                    userId,
                    storeId,
                    registerId,
                    offlineId: offlineId || null,
                    synced: synced || false,
                    source: source || 'online',
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                },
                include: { items: true }
            });
            for (const item of items) {
                const inventory = await tx.inventory.findFirst({ where: { productId: item.productId, tenantId, storeId } });
                if (!inventory || inventory.quantity < item.quantity) {
                    logger.warn({ event: 'SALE_INSUFFICIENT_INVENTORY', productId: item.productId, tenantId, storeId });
                    throw new Error(`Insufficient inventory for product ${item.productId}`);
                }
                await tx.inventory.update({
                    where: { id: inventory.id, tenantId },
                    data: { quantity: inventory.quantity - item.quantity }
                });
            }
            return saleRecord;
        });
        logger.info({ event: 'SALE_PROCESSED', saleId: sale.id, total, tenantId, storeId, registerId });
        return sale;
    } catch (err) {
        logger.error({ event: 'SALE_PROCESS_ERROR', error: err.message, tenantId, storeId, registerId });
        throw err;
    }
}

// Get sales with optional filters, pagination, and logging
/**
 * Get sales with optional filters, pagination, and logging
 * Purpose: Only processes and returns sales data needed for business operations. No personal data stored or logged.
 */
export async function getSales(query = {}) {
    const { customerId, from, to, page = 1, limit = 20, tenantId, storeId, registerId } = query;
    if (!tenantId) throw new Error('Tenant context required');
    const where = { tenantId: Number(tenantId) };
    if (customerId) where.customerId = Number(customerId);
    if (storeId) where.storeId = Number(storeId);
    if (registerId) where.registerId = Number(registerId);
    if (from || to) where.saleDate = {};
    if (from) where.saleDate.gte = new Date(from);
    if (to) where.saleDate.lte = new Date(to);
    const skip = (Number(page) - 1) * Number(limit);
    try {
        const [items, total] = await Promise.all([
            prisma.sale.findMany({ where, skip, take: Number(limit), orderBy: { saleDate: 'desc' }, include: { items: true } }),
            prisma.sale.count({ where })
        ]);
        logger.info({ event: 'SALES_LIST', count: items.length, tenantId, storeId, registerId });
        return { data: items, page: Number(page), limit: Number(limit), total };
    } catch (err) {
        logger.error({ event: 'SALES_LIST_ERROR', error: err.message, tenantId, storeId, registerId });
        throw err;
    }
}
// Get sale by ID with tenant isolation
/**
 * Get sale by ID with tenant isolation
 * Purpose: Only processes and returns sales data needed for business operations. No personal data stored or logged.
 */
export async function getSaleById(id, tenantId) {
    if (!tenantId) throw new Error('Tenant context required');
    try {
        const sale = await prisma.sale.findFirst({ where: { id: Number(id), tenantId: Number(tenantId) }, include: { items: true } });
        if (!sale) {
            logger.warn({ event: 'SALE_NOT_FOUND', id, tenantId });
        }
        return sale;
    } catch (err) {
        logger.error({ event: 'SALE_GET_ERROR', id, tenantId, error: err.message });
        throw err;
    }
}

