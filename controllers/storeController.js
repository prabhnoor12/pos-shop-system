// storeController.js
// Handles store management, permissions, and analytics
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes and returns store data necessary for business operations.
// - Does not return or log unnecessary or sensitive data.
// - All endpoints are documented with their data processing purpose.
// Helper: check if user is global admin (assumes req.user.isAdmin is set by auth middleware)
function isGlobalAdmin(req) {
    return req.user && req.user.isAdmin;
}

// Helper: check if user is store admin/manager (requires StoreUser model in Prisma)
async function isStoreAdmin(userId, storeId) {
    const su = await prisma.storeUser.findFirst({ where: { userId, storeId: Number(storeId), role: { in: ['admin', 'manager'] } } });
    return !!su;
}

// Assign a user to a store with a role
export async function assignUserToStore(req, res) {
    try {
        const { storeId, userId, role } = req.body;
        // Only global admin or store admin can assign
        if (!isGlobalAdmin(req) && !(await isStoreAdmin(req.user.id, storeId))) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const storeUser = await prisma.storeUser.upsert({
            where: { userId_storeId: { userId: Number(userId), storeId: Number(storeId) } },
            update: { role },
            create: { userId: Number(userId), storeId: Number(storeId), role }
        });
        logger.info({ event: 'STORE_USER_ASSIGNED', storeId, userId, role });
        res.status(200).json(storeUser);
    } catch (err) {
        logger.error({ event: 'STORE_ASSIGN_USER_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// Remove a user from a store
export async function removeUserFromStore(req, res) {
    try {
        const { storeId, userId } = req.body;
        if (!isGlobalAdmin(req) && !(await isStoreAdmin(req.user.id, storeId))) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        await prisma.storeUser.delete({ where: { userId_storeId: { userId: Number(userId), storeId: Number(storeId) } } });
        logger.info({ event: 'STORE_USER_REMOVED', storeId, userId });
        res.status(204).send();
    } catch (err) {
        logger.error({ event: 'STORE_REMOVE_USER_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// List users for a store (with roles)
export async function getStoreUsers(req, res) {
    try {
        const { id } = req.params; // storeId
        if (!isGlobalAdmin(req) && !(await isStoreAdmin(req.user.id, id))) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const users = await prisma.storeUser.findMany({
            where: { storeId: Number(id) },
            include: { user: true }
        });
        res.json(users);
    } catch (err) {
        logger.error({ event: 'STORE_GET_USERS_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// Store analytics endpoint
export async function getStoreAnalytics(req, res) {
    try {
        const { id } = req.params; // storeId
        if (!isGlobalAdmin(req) && !(await isStoreAdmin(req.user.id, id))) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        // Example analytics: sales total, inventory value, top products
        const salesTotal = await prisma.sale.aggregate({
            where: { storeId: Number(id) },
            _sum: { total: true }
        });
        const inventoryValue = await prisma.inventory.aggregate({
            where: { storeId: Number(id) },
            _sum: { value: true }
        });
        const topProducts = await prisma.sale.groupBy({
            by: ['productId'],
            where: { storeId: Number(id) },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });
        res.json({
            salesTotal: salesTotal._sum.total || 0,
            inventoryValue: inventoryValue._sum.value || 0,
            topProducts
        });
    } catch (err) {
        logger.error({ event: 'STORE_ANALYTICS_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}
// storeController.js
// Handles store management endpoints
import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import Joi from 'joi';
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

// Validation schema for store
const storeSchema = Joi.object({
    name: Joi.string().min(2).max(128).required(),
    location: Joi.string().max(256).allow('', null),
    isActive: Joi.boolean().default(true)
});

// Create a new store
export async function createStore(req, res) {
    try {
        const { error, value } = storeSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        const tenantId = req.user.tenantId;
        // Prevent duplicate store name in this tenant
        const exists = await prisma.store.findFirst({ where: { name: value.name, tenantId } });
        if (exists) return res.status(409).json({ message: 'Store with this name already exists' });
        const store = await prisma.store.create({ data: { ...value, tenantId } });
        logger.info({ event: 'STORE_CREATED', id: store.id, tenantId });
        res.status(201).json(store);
    } catch (err) {
        logger.error({ event: 'STORE_CREATE_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// Get all stores with filtering, pagination, and search
export async function getStores(req, res) {
    try {
        const { isActive, search, page = 1, limit = 20 } = req.query;
        const tenantId = req.user.tenantId;
        const where = { tenantId };
        if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
        if (search) where.name = { contains: search, mode: 'insensitive' };
        const skip = (Number(page) - 1) * Number(limit);
        const [stores, total] = await Promise.all([
            prisma.store.findMany({ where, skip, take: Number(limit), orderBy: { name: 'asc' } }),
            prisma.store.count({ where })
        ]);
        res.json({ data: stores, page: Number(page), limit: Number(limit), total });
    } catch (err) {
        logger.error({ event: 'STORE_LIST_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// Get a single store by ID
export async function getStoreById(req, res) {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const store = await prisma.store.findFirst({ where: { id: Number(id), tenantId } });
        if (!store) return res.status(404).json({ message: 'Store not found' });
        // Optionally: include inventory and sales summary
        const inventoryCount = await prisma.inventory.count({ where: { storeId: store.id, tenantId } });
        const salesCount = await prisma.sale.count({ where: { storeId: store.id, tenantId } });
        res.json({ ...store, inventoryCount, salesCount });
    } catch (err) {
        logger.error({ event: 'STORE_GET_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// Update a store
export async function updateStore(req, res) {
    try {
        const { id } = req.params;
        const { error, value } = storeSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        const tenantId = req.user.tenantId;
        // Prevent duplicate store name (if changed)
        const existing = await prisma.store.findFirst({ where: { name: value.name, id: { not: Number(id) }, tenantId } });
        if (existing) return res.status(409).json({ message: 'Store with this name already exists' });
        const store = await prisma.store.update({
            where: { id: Number(id) },
            data: value
        });
        res.json(store);
    } catch (err) {
        logger.error({ event: 'STORE_UPDATE_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// Delete a store (with safety check for inventory/sales)
export async function deleteStore(req, res) {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const inventoryCount = await prisma.inventory.count({ where: { storeId: Number(id), tenantId } });
        const salesCount = await prisma.sale.count({ where: { storeId: Number(id), tenantId } });
        if (inventoryCount > 0 || salesCount > 0) {
            return res.status(400).json({ message: 'Cannot delete store with inventory or sales records' });
        }
        await prisma.store.delete({ where: { id: Number(id), tenantId } });
        res.status(204).send();
    } catch (err) {
        logger.error({ event: 'STORE_DELETE_ERROR', error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

export default {
    createStore,
    getStores,
    getStoreById,
    updateStore,
    deleteStore
    ,assignUserToStore
    ,removeUserFromStore
    ,getStoreUsers
    ,getStoreAnalytics
};
