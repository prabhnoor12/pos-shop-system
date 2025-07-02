
// supplierController.js
// Handles supplier CRUD operations
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes and returns supplier data necessary for business operations.
// - Does not return or log unnecessary or sensitive data.
// - All endpoints are documented with their data processing purpose.

import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
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

const supplierSchema = Joi.object({
    name: Joi.string().min(2).max(64).required(),
    email: Joi.string().email().allow(''),
    phone: Joi.string().pattern(/^\+?[0-9\- ]{7,20}$/).allow(''),
    address: Joi.string().max(256).allow(''),
    isActive: Joi.boolean().default(true)
});

const supplierUpdateSchema = Joi.object({
    name: Joi.string().min(2).max(64),
    email: Joi.string().email().allow(''),
    phone: Joi.string().pattern(/^\+?[0-9\- ]{7,20}$/).allow(''),
    address: Joi.string().max(256).allow(''),
    isActive: Joi.boolean()
});

function logEvent(event, details) {
    logger.info({ event, ...details });
}

/**
 * Removes non-essential fields before sending supplier object to client.
 * Purpose: Data minimization for GDPR compliance.
 */
function sanitizeSupplier(supplier) {
    if (!supplier) return null;
    const { createdAt, updatedAt, ...rest } = supplier;
    return rest;
}

export async function createSupplier(req, res) {
    const { error, value } = supplierSchema.validate(req.body);
    if (error) {
        logEvent('SUPPLIER_CREATE_FAIL', { reason: error.details[0].message });
        return res.status(400).json({ message: error.details[0].message });
    }
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        return res.status(403).json({ message: 'Tenant context required.' });
    }
    try {
        const exists = await prisma.supplier.findFirst({ where: { name: value.name, tenantId } });
        if (exists) {
            logEvent('SUPPLIER_CREATE_FAIL', { reason: 'Supplier already exists', name: value.name });
            return res.status(409).json({ message: 'Supplier already exists.' });
        }
        const supplier = await prisma.supplier.create({ data: { ...value, tenantId } });
        logEvent('SUPPLIER_CREATE_SUCCESS', { id: supplier.id, name: supplier.name });
        res.status(201).json(sanitizeSupplier(supplier));
    } catch (err) {
        logEvent('SUPPLIER_CREATE_ERROR', { error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

export async function getSuppliers(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        const { active, q, page = 1, limit = 20, sort = 'name', order = 'asc' } = req.query;
        const where = { tenantId };
        if (active !== undefined) where.isActive = active === 'true';
        if (q) {
            where.name = { contains: q, mode: 'insensitive' };
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [suppliers, total] = await Promise.all([
            prisma.supplier.findMany({ where, skip, take: Number(limit), orderBy: { [sort]: order } }),
            prisma.supplier.count({ where })
        ]);
        res.json({
            data: suppliers.map(sanitizeSupplier),
            page: Number(page),
            limit: Number(limit),
            total
        });
    } catch (err) {
        logEvent('SUPPLIER_LIST_ERROR', { error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

export async function updateSupplier(req, res) {
    const { id } = req.params;
    const { error, value } = supplierUpdateSchema.validate(req.body);
    if (error) {
        logEvent('SUPPLIER_UPDATE_FAIL', { id, reason: error.details[0].message });
        return res.status(400).json({ message: error.details[0].message });
    }
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        const supplier = await prisma.supplier.update({
            where: { id: Number(id), tenantId },
            data: value
        });
        logEvent('SUPPLIER_UPDATE_SUCCESS', { id: supplier.id });
        res.json(sanitizeSupplier(supplier));
    } catch (err) {
        logEvent('SUPPLIER_UPDATE_ERROR', { id, error: err.message });
        res.status(404).json({ message: 'Supplier not found', error: err.message });
    }
}

export async function deleteSupplier(req, res) {
    const { id } = req.params;
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        // Soft delete: set isActive to false
        const supplier = await prisma.supplier.update({
            where: { id: Number(id), tenantId },
            data: { isActive: false }
        });
        logEvent('SUPPLIER_DELETE_SUCCESS', { id });
        res.status(200).json(sanitizeSupplier(supplier));
    } catch (err) {
        logEvent('SUPPLIER_DELETE_ERROR', { id, error: err.message });
        res.status(404).json({ message: 'Supplier not found', error: err.message });
    }
}

// Default export for compatibility with import supplierController from ...
export default {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier
};
