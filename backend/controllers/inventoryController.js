// --- Multi-Store & Multi-Register Management ---
// List all registers for a store (and tenant)
export async function listRegisters(req, res) {
    try {
        const tenantId = req.tenantId;
        const storeId = req.query.storeId ? Number(req.query.storeId) : undefined;
        if (!tenantId) return res.status(403).json({ message: 'Tenant context required.' });
        const where = { tenantId, ...(storeId ? { storeId } : {}) };
        const registers = await prisma.register.findMany({ where });
        res.json({ data: registers });
    } catch (err) {
        logger.error({ event: 'REGISTER_LIST_ERROR', error: err.message, tenantId: req.tenantId });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// Create a new register for a store
export async function createRegister(req, res) {
    try {
        const tenantId = req.tenantId;
        const { storeId, name, description } = req.body;
        if (!tenantId || !storeId || !name) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }
        const register = await prisma.register.create({
            data: { tenantId, storeId: Number(storeId), name, description: description || '' }
        });
        res.status(201).json({ data: register });
    } catch (err) {
        logger.error({ event: 'REGISTER_CREATE_ERROR', error: err.message, tenantId: req.tenantId });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// --- Offline Mode Sync Endpoints ---
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
        logger.error({ event: 'SALES_SYNC_ERROR', error: err.message, tenantId: req.tenantId });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// Sync inventory changes from offline clients
export async function syncInventory(req, res) {
    const tenantId = req.tenantId;
    const { inventoryUpdates } = req.body; // inventoryUpdates: array of updates
    if (!tenantId || !Array.isArray(inventoryUpdates) || inventoryUpdates.length === 0) {
        return res.status(400).json({ message: 'Invalid sync payload.' });
    }
    try {
        const results = [];
        for (const update of inventoryUpdates) {
            // Use unique offlineId to avoid duplicates
            const existing = await prisma.inventoryHistory.findFirst({ where: { offlineId: update.offlineId, tenantId } });
            if (existing) {
                results.push({ offlineId: update.offlineId, status: 'duplicate' });
                continue;
            }
            // Update inventory and record adjustment
            const inventory = await prisma.inventory.findFirst({ where: { id: update.inventoryId, tenantId } });
            if (!inventory) {
                results.push({ offlineId: update.offlineId, status: 'not found' });
                continue;
            }
            await prisma.inventory.update({ where: { id: update.inventoryId }, data: { quantity: update.quantity } });
            await prisma.inventoryHistory.create({
                data: {
                    inventoryId: update.inventoryId,
                    productId: update.productId,
                    quantityBefore: inventory.quantity,
                    quantityAfter: update.quantity,
                    reason: update.reason || 'offline sync',
                    userId: update.userId || null,
                    offlineId: update.offlineId,
                    tenantId,
                    synced: true,
                    source: 'offline'
                }
            });
            results.push({ offlineId: update.offlineId, status: 'synced' });
        }
        res.json({ results });
    } catch (err) {
        logger.error({ event: 'INVENTORY_SYNC_ERROR', error: err.message, tenantId: req.tenantId });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// inventoryController.js
// Handles inventory management
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes and returns inventory data necessary for business operations.
// - Does not return or log unnecessary or sensitive data.
// - All endpoints are documented with their data processing purpose.
import { PrismaClient } from '@prisma/client';
import * as inventoryService from '../services/inventoryService.js';
import Joi from 'joi';
import winston from 'winston';
import { sendWhatsApp, sendEmail } from '../services/smsService.js';
import { notifyLowStock } from '../services/notificationService.js';
const prisma = new PrismaClient();

// Winston logger with file transport for audit logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/inventory-audit.log' })
    ]
});
// Inventory adjustment history model: assumes a table exists in your schema
// with fields: id, inventoryId, productId, quantityBefore, quantityAfter, reason, userId, createdAt

async function recordAdjustment({ inventoryId, productId, quantityBefore, quantityAfter, reason, userId }) {
    try {
        await prisma.inventoryHistory.create({
            data: {
                inventoryId,
                productId,
                quantityBefore,
                quantityAfter,
                reason,
                userId: userId || null
            }
        });
        logger.info({ event: 'INVENTORY_ADJUSTMENT', inventoryId, productId, quantityBefore, quantityAfter, reason, userId });
    } catch (err) {
        logger.error({ event: 'INVENTORY_ADJUSTMENT_ERROR', error: err.message });
    }
}
// Batch inventory update
export async function batchUpdateInventory(req, res) {
    const { updates, userId } = req.body; // updates: [{ id, quantity, reason }]
    const tenantId = req.tenantId;
    if (!tenantId) {
        return res.status(403).json({ message: 'Tenant context required.' });
    }
    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ message: 'No updates provided.' });
    }
    try {
        const results = [];
        for (const update of updates) {
            const item = await prisma.inventory.findFirst({ where: { id: Number(update.id), tenantId } });
            if (!item) {
                logger.warn({ event: 'BATCH_UPDATE_FAIL', id: update.id, reason: 'Not found or not in tenant', tenantId });
                results.push({ id: update.id, status: 'not found' });
                continue;
            }
            const updated = await prisma.inventory.update({
                where: { id: Number(update.id), tenantId },
                data: { quantity: update.quantity }
            });
            await recordAdjustment({
                inventoryId: updated.id,
                productId: updated.productId,
                quantityBefore: item.quantity,
                quantityAfter: update.quantity,
                reason: update.reason || 'batch update',
                userId
            });
            logger.info({ event: 'BATCH_UPDATE_SUCCESS', id: updated.id, tenantId });
            // Send notifications for every inventory change
            const recipientPhone = process.env.NOTIFY_WHATSAPP_TO;
            const recipientEmail = process.env.NOTIFY_EMAIL_TO;
            const msg = `Inventory updated for product ${updated.productId}: ${item.quantity} -> ${update.quantity}`;
            if (recipientPhone) {
              sendWhatsApp(recipientPhone, msg).catch(e => logger.error({ event: 'WHATSAPP_SEND_ERROR', error: e.message, tenantId }));
            }
            if (recipientEmail) {
              sendEmail(recipientEmail, 'Inventory Updated', msg, `<p>${msg}</p>`).catch(e => logger.error({ event: 'EMAIL_SEND_ERROR', error: e.message, tenantId }));
            }
            results.push({ id: updated.id, status: 'updated' });
        }
        res.json({ results });
    } catch (err) {
        logger.error({ event: 'BATCH_UPDATE_ERROR', error: err.message, tenantId });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}


// Use a single logger instance with both console and file transports
// (already defined above)


const inventorySchema = Joi.object({
    productId: Joi.number().integer().required(),
    quantity: Joi.number().integer().min(0).required(),
    location: Joi.string().max(128).allow(''),
    minStock: Joi.number().integer().min(0).default(0),
    maxStock: Joi.number().integer().min(0).allow(null),
    isActive: Joi.boolean().default(true),
    storeId: Joi.number().integer().required()
});


function logEvent(event, details) {
    logger.info({ event, ...details });
}

/**
 * Removes non-essential fields before sending inventory object to client.
 * Purpose: Data minimization for GDPR compliance.
 */
function sanitizeInventory(item) {
    if (!item) return null;
    const { createdAt, updatedAt, ...rest } = item;
    return rest;
}

// Controller: Add inventory
/**
 * Add inventory
 * Purpose: Only processes and returns inventory data needed for business operations.
 */
export async function addInventory(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        const { error, value } = inventorySchema.validate(req.body);
        if (error) {
            logger.warn({ event: 'INVENTORY_ADD_FAIL', reason: error.details[0].message });
            return res.status(400).json({ message: error.details[0].message });
        }
        const item = await inventoryService.addInventory({ ...value, tenantId });
        res.status(201).json(sanitizeInventory(item));
        // Send notifications for every inventory addition
        const recipientPhone = process.env.NOTIFY_WHATSAPP_TO;
        const recipientEmail = process.env.NOTIFY_EMAIL_TO;
        const msg = `Inventory added for product ${item.productId}: quantity ${item.quantity}`;
        if (recipientPhone) {
          sendWhatsApp(recipientPhone, msg).catch(e => logger.error({ event: 'WHATSAPP_SEND_ERROR', error: e.message }));
        }
        if (recipientEmail) {
          sendEmail(recipientEmail, 'Inventory Added', msg, `<p>${msg}</p>`).catch(e => logger.error({ event: 'EMAIL_SEND_ERROR', error: e.message }));
        }
    } catch (err) {
        logger.error({ event: 'INVENTORY_ADD_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// Controller: Get inventory
/**
 * List inventory
 * Purpose: Only returns inventory data needed for business operations and selection.
 */
export async function getInventory(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        const result = await inventoryService.getInventory({ ...req.query, tenantId });
        result.data = result.data.map(sanitizeInventory);
        res.json(result);
    } catch (err) {
        logEvent('INVENTORY_LIST_ERROR', { error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// Controller: Update inventory
/**
 * Update inventory
 * Purpose: Only updates and returns inventory data needed for business operations.
 */
export async function updateInventory(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        const { id } = req.params;
        const { error, value } = inventorySchema.validate(req.body);
        if (error) {
            logger.warn({ event: 'INVENTORY_UPDATE_FAIL', id, reason: error.details[0].message });
            return res.status(400).json({ message: error.details[0].message });
        }
        const updated = await inventoryService.updateInventory(id, { ...value, tenantId });
        res.json(sanitizeInventory(updated));
        // Send notifications for every inventory update
        const recipientPhone = process.env.NOTIFY_WHATSAPP_TO;
        const recipientEmail = process.env.NOTIFY_EMAIL_TO;
        const msg = `Inventory updated for product ${updated.productId}: new quantity ${updated.quantity}`;
        if (recipientPhone) {
          sendWhatsApp(recipientPhone, msg).catch(e => logger.error({ event: 'WHATSAPP_SEND_ERROR', error: e.message }));
        }
        if (recipientEmail) {
          sendEmail(recipientEmail, 'Inventory Updated', msg, `<p>${msg}</p>`).catch(e => logger.error({ event: 'EMAIL_SEND_ERROR', error: e.message }));
        }
    } catch (err) {
        logger.error({ event: 'INVENTORY_UPDATE_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}


// (Removed duplicate controller bodies from previous refactor)

// Default export for compatibility with import inventoryController from ...
// --- Advanced Inventory Management Features ---

// 1. Multi-warehouse support: List all warehouses
// List all warehouses for the current tenant
export async function listWarehouses(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return res.status(403).json({ message: 'Tenant context required.' });
        const warehouses = await prisma.warehouse.findMany({ where: { tenantId } });
        res.json({ data: warehouses });
    } catch (err) {
        logger.error({ event: 'WAREHOUSE_LIST_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// 2. Stock transfer between warehouses
// Transfer stock between warehouses
export async function transferStock(req, res) {
    const { productId, fromWarehouseId, toWarehouseId, quantity, userId, reason } = req.body;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ message: 'Tenant context required.' });
    if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }
    try {
        // Find inventory records for both warehouses
        const fromInv = await prisma.inventory.findFirst({ where: { productId, warehouseId: fromWarehouseId, tenantId } });
        const toInv = await prisma.inventory.findFirst({ where: { productId, warehouseId: toWarehouseId, tenantId } });
        if (!fromInv || fromInv.quantity < quantity) {
            return res.status(400).json({ message: 'Insufficient stock in source warehouse.' });
        }
        // Transaction: decrement from source, increment to destination
        await prisma.$transaction(async (tx) => {
            await tx.inventory.update({ where: { id: fromInv.id }, data: { quantity: { decrement: quantity } } });
            if (toInv) {
                await tx.inventory.update({ where: { id: toInv.id }, data: { quantity: { increment: quantity } } });
            } else {
                await tx.inventory.create({ data: { productId, warehouseId: toWarehouseId, tenantId, quantity } });
            }
            await tx.stockMovement.create({
                data: {
                    productId,
                    fromWarehouseId,
                    toWarehouseId,
                    quantity,
                    reason: reason || 'transfer',
                    userId: userId || null
                }
            });
        });
        res.json({ message: 'Stock transferred successfully.' });
    } catch (err) {
        logger.error({ event: 'STOCK_TRANSFER_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// 3. Batch/serial number tracking
// Add batch or serial number to inventory
export async function addBatchOrSerial(req, res) {
    const { productId, batchNumber, serialNumber, expiryDate, warehouseId, quantity } = req.body;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ message: 'Tenant context required.' });
    if (!productId || !warehouseId || (!batchNumber && !serialNumber)) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }
    try {
        const inventory = await prisma.inventory.findFirst({ where: { productId, warehouseId, tenantId } });
        if (!inventory) return res.status(404).json({ message: 'Inventory record not found.' });
        let result;
        if (batchNumber) {
            result = await prisma.batch.create({
                data: {
                    inventoryId: inventory.id,
                    batchNumber,
                    expiryDate: expiryDate ? new Date(expiryDate) : null,
                    quantity: quantity || 0
                }
            });
        } else if (serialNumber) {
            result = await prisma.serialNumber.create({
                data: {
                    inventoryId: inventory.id,
                    serialNumber,
                    expiryDate: expiryDate ? new Date(expiryDate) : null
                }
            });
        }
        res.status(201).json({ message: 'Batch/Serial added', data: result });
    } catch (err) {
        logger.error({ event: 'BATCH_SERIAL_ADD_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// 4. Low-stock and out-of-stock alerts
// Get low-stock and out-of-stock alerts for the tenant
export async function getLowStockAlerts(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ message: 'Tenant context required.' });
    try {
        const lowStock = await prisma.inventory.findMany({
            where: {
                tenantId,
                isActive: true,
                OR: [
                    { quantity: { lte: { minStock: true } } },
                    { quantity: { lte: 0 } }
                ]
            },
            include: { product: true, store: true }
        });
        // Notify in real-time if any low stock found
        if (lowStock && lowStock.length > 0) {
            lowStock.forEach(item => notifyLowStock(item));
        }
        res.json({ data: lowStock });
    } catch (err) {
        logger.error({ event: 'LOW_STOCK_ALERT_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// 5. Manual inventory adjustment (corrections, audits)
// Manual inventory adjustment (corrections, audits)
export async function manualInventoryAdjustment(req, res) {
    const { inventoryId, newQuantity, reason, userId } = req.body;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ message: 'Tenant context required.' });
    if (!inventoryId || typeof newQuantity !== 'number') {
        return res.status(400).json({ message: 'Missing required fields.' });
    }
    try {
        const inventory = await prisma.inventory.findFirst({ where: { id: Number(inventoryId), tenantId } });
        if (!inventory) return res.status(404).json({ message: 'Inventory record not found.' });
        const before = inventory.quantity;
        const updated = await prisma.inventory.update({ where: { id: inventory.id }, data: { quantity: newQuantity } });
        await prisma.inventoryHistory.create({
            data: {
                inventoryId: inventory.id,
                productId: inventory.productId,
                quantityBefore: before,
                quantityAfter: newQuantity,
                reason: reason || 'manual adjustment',
                userId: userId || null
            }
        });
        logger.info({ event: 'MANUAL_INVENTORY_ADJUSTMENT', inventoryId, productId: inventory.productId, before, after: newQuantity, reason, userId });
        res.json({ message: 'Inventory adjusted', data: sanitizeInventory(updated) });
    } catch (err) {
        logger.error({ event: 'MANUAL_ADJUSTMENT_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// 6. Stock movement history (audit trail)
// Retrieve stock movement history (audit trail)
export async function getStockMovementHistory(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ message: 'Tenant context required.' });
    const { productId, warehouseId, from, to } = req.query;
    const where = {
        product: { tenantId: Number(tenantId) },
        ...(productId ? { productId: Number(productId) } : {}),
        ...(warehouseId ? {
            OR: [
                { fromWarehouseId: Number(warehouseId) },
                { toWarehouseId: Number(warehouseId) }
            ]
        } : {}),
        ...(from || to ? { createdAt: {} } : {}),
    };
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
    try {
        const history = await prisma.stockMovement.findMany({
            where,
            include: {
                product: true,
                fromWarehouse: true,
                toWarehouse: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ data: history });
    } catch (err) {
        logger.error({ event: 'STOCK_MOVEMENT_HISTORY_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// 7. Expiry date tracking (for perishable goods)
// Get products/batches/serials expiring within X days in a warehouse or all warehouses
export async function getExpiringProducts(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ message: 'Tenant context required.' });
    const daysUntilExpiry = parseInt(req.query.daysUntilExpiry) || 30;
    const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
    const now = new Date();
    const expiryLimit = new Date(now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000);
    try {
        // Find expiring batches
        const batchWhere = {
            expiryDate: { lte: expiryLimit, gte: now },
            inventory: {
                tenantId,
                ...(warehouseId ? { warehouseId } : {})
            }
        };
        const expiringBatches = await prisma.batch.findMany({
            where: batchWhere,
            include: {
                inventory: { include: { product: true, store: true } }
            }
        });
        // Find expiring serial numbers
        const serialWhere = {
            expiryDate: { lte: expiryLimit, gte: now },
            inventory: {
                tenantId,
                ...(warehouseId ? { warehouseId } : {})
            }
        };
        const expiringSerials = await prisma.serialNumber.findMany({
            where: serialWhere,
            include: {
                inventory: { include: { product: true, store: true } }
            }
        });
        res.json({
            expiringBatches,
            expiringSerials
        });
    } catch (err) {
        logger.error({ event: 'EXPIRY_TRACKING_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// 8. Inventory valuation methods (FIFO, LIFO, Average Cost)
export async function getInventoryValuation(req, res) {
    // TODO: Implement inventory valuation logic
    // req.query: { method: 'FIFO' | 'LIFO' | 'AVG', warehouseId }
    res.status(501).json({ message: 'Not implemented: getInventoryValuation' });
}

// Default export for compatibility with import inventoryController from ...
export default {
  batchUpdateInventory,
  addInventory,
  getInventory,
  updateInventory,
  listWarehouses,
  transferStock,
  addBatchOrSerial,
  getLowStockAlerts,
  manualInventoryAdjustment,
  getStockMovementHistory,
  getExpiringProducts,
  getInventoryValuation
  ,listRegisters
  ,createRegister
  ,syncSales
  ,syncInventory
};
