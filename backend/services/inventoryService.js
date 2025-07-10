
// inventoryService.js
// Handles inventory business logic (production grade)
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes inventory data necessary for business operations.
// - Does not log or store personal or sensitive data.
// - All service functions are documented with their data processing purpose.

import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import redisClient from '../config/redisClient.js';
const prisma = new PrismaClient();

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/inventory-service.log' })
    ]
});

// Add inventory item with logging and duplicate check
/**
 * Add inventory item
 * Purpose: Only processes and stores inventory data needed for business operations. No personal data stored or logged.
 */
export async function addInventory(data) {
    try {
        if (!data.tenantId) throw new Error('Tenant context required');
        // Prevent duplicate inventory for same product/location/store in tenant
        const exists = await prisma.inventory.findFirst({ where: { productId: data.productId, location: data.location, storeId: data.storeId, tenantId: data.tenantId } });
        if (exists) {
            logger.warn({ event: 'INVENTORY_ADD_DUPLICATE', productId: data.productId, location: data.location, storeId: data.storeId, tenantId: data.tenantId });
            throw new Error('Inventory already exists for this product/location/store/tenant');
        }
        const item = await prisma.inventory.create({ data });
        logger.info({ event: 'INVENTORY_ADD', id: item.id, productId: item.productId, storeId: item.storeId, tenantId: data.tenantId });
        await invalidateInventoryCache(data.storeId);
        return item;
    } catch (err) {
        logger.error({ event: 'INVENTORY_ADD_ERROR', error: err.message });
        throw err;
    }
}

// Get inventory with optional filters, pagination, and logging, with Redis caching for hot data
/**
 * Get inventory with optional filters, pagination, and caching
 * Purpose: Only processes and returns inventory data needed for business operations. No personal data stored or logged.
 */
export async function getInventory(query = {}) {
    const { productId, location, isActive, minStockAlert, page = 1, limit = 20, storeId, tenantId } = query;
    if (!tenantId) throw new Error('Tenant context required');
    const where = { tenantId: Number(tenantId) };
    if (productId) where.productId = Number(productId);
    if (location) where.location = location;
    if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
    if (minStockAlert) where.quantity = { lt: { path: 'minStock' } };
    if (storeId) where.storeId = Number(storeId);
    const skip = (Number(page) - 1) * Number(limit);
    // Only cache default query (no filters, first page, specific store, tenant)
    const isDefault = !productId && !location && isActive === undefined && !minStockAlert && Number(page) === 1 && Number(limit) === 20 && !!storeId;
    const INVENTORY_LIST_CACHE_KEY = storeId ? `inventory:list:store:${storeId}:tenant:${tenantId}` : `inventory:list:tenant:${tenantId}`;
    if (isDefault) {
        const cached = await redisClient.get(INVENTORY_LIST_CACHE_KEY);
        if (cached) {
            logger.info({ event: 'INVENTORY_LIST_CACHE_HIT', storeId, tenantId });
            return JSON.parse(cached);
        }
    }
    try {
        const [items, total] = await Promise.all([
            prisma.inventory.findMany({ where, skip, take: Number(limit), orderBy: { productId: 'asc' } }),
            prisma.inventory.count({ where })
        ]);
        logger.info({ event: 'INVENTORY_LIST', count: items.length, storeId, tenantId });
        const result = { data: items, page: Number(page), limit: Number(limit), total };
        if (isDefault) {
            await redisClient.setEx(INVENTORY_LIST_CACHE_KEY, 60 * 5, JSON.stringify(result));
            logger.info({ event: 'INVENTORY_LIST_CACHE_SET', storeId, tenantId });
        }
        return result;
    } catch (err) {
        logger.error({ event: 'INVENTORY_LIST_ERROR', error: err.message, storeId, tenantId });
        throw err;
    }
}

// Update inventory item with logging, adjustment history, and low stock alert
/**
 * Update inventory item
 * Purpose: Only processes and updates inventory data needed for business operations. No personal data stored or logged.
 */
export async function updateInventory(id, data) {
    try {
        if (!data.tenantId) throw new Error('Tenant context required');
        const prev = await prisma.inventory.findFirst({ where: { id: Number(id), tenantId: data.tenantId } });
        if (!prev) throw new Error('Inventory item not found or not in tenant');
        const updated = await prisma.inventory.update({ where: { id: Number(id), tenantId: data.tenantId }, data });
        logger.info({ event: 'INVENTORY_UPDATE', id: updated.id, storeId: updated.storeId, tenantId: data.tenantId });
        // Record adjustment history (if table exists)
        if (typeof prisma.inventoryHistory?.create === 'function' && data.quantity !== undefined && data.quantity !== prev.quantity) {
            await prisma.inventoryHistory.create({
                data: {
                    inventoryId: updated.id,
                    productId: updated.productId,
                    quantityBefore: prev.quantity,
                    quantityAfter: data.quantity,
                    reason: 'update',
                    userId: data.userId || null
                }
            });
            logger.info({ event: 'INVENTORY_ADJUSTMENT_HISTORY', id: updated.id, change: data.quantity - prev.quantity });
        }
        // Low stock alert
        if (updated.quantity < (updated.minStock ?? 0)) {
            logger.warn({ event: 'INVENTORY_LOW_STOCK_ALERT', id: updated.id, productId: updated.productId, quantity: updated.quantity, minStock: updated.minStock });
        }
        await invalidateInventoryCache(updated.storeId);
        return updated;
    } catch (err) {
        logger.error({ event: 'INVENTORY_UPDATE_ERROR', id, error: err.message });
        throw err;
    }
}

/**
 * Invalidate cache on add/update for a specific store
 * Purpose: Only invalidates cache keys related to inventory. No personal data processed.
 */
const invalidateInventoryCache = async (storeId) => {
    if (storeId) {
        await redisClient.del(`inventory:list:store:${storeId}`);
    }
    await redisClient.del('inventory:list');
};
