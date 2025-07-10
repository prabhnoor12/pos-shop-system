
// customerController.js
// Handles customer CRUD operations
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes and returns customer data necessary for business operations.
// - Does not return or log unnecessary or sensitive data (e.g., masks email in logs).
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


const customerSchema = Joi.object({
    name: Joi.string().min(2).max(64).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^\+?[0-9\- ]{7,20}$/).allow(''),
    address: Joi.string().max(256).allow(''),
    isActive: Joi.boolean().default(true)
});

const customerUpdateSchema = Joi.object({
    name: Joi.string().min(2).max(64),
    email: Joi.string().email(),
    phone: Joi.string().pattern(/^\+?[0-9\- ]{7,20}$/).allow(''),
    address: Joi.string().max(256).allow(''),
    isActive: Joi.boolean()
});

function logEvent(event, details) {
    logger.info({ event, ...details });
}


/**
 * Removes non-essential fields before sending customer object to client.
 * Purpose: Data minimization for GDPR compliance.
 */
function sanitizeCustomer(customer) {
    if (!customer) return null;
    const { createdAt, updatedAt, ...rest } = customer;
    // Optionally mask email or phone for privacy
    return rest;
}

function maskEmail(email) {
    if (!email) return '';
    const [user, domain] = email.split('@');
    return user[0] + '***@' + domain[0] + '***.' + domain.split('.').pop();
}


/**
 * Create a new customer
 * Purpose: Only processes and returns customer data needed for business operations.
 */
export async function createCustomer(req, res) {
    const { error, value } = customerSchema.validate(req.body);
    const tenantId = req.tenantId;
    if (error) {
        logEvent('CUSTOMER_CREATE_FAIL', { reason: error.details[0].message, tenantId });
        return res.status(400).json({ message: error.details[0].message });
    }
    if (!tenantId) {
        return res.status(403).json({ message: 'Tenant context required.' });
    }
    try {
        const exists = await prisma.customer.findFirst({ where: { email: value.email, tenantId } });
        if (exists) {
            logEvent('CUSTOMER_CREATE_FAIL', { reason: 'Customer already exists', email: maskEmail(value.email), tenantId });
            return res.status(409).json({ message: 'Customer already exists.' });
        }
        const customer = await prisma.customer.create({ data: { ...value, tenantId } });
        logEvent('CUSTOMER_CREATE_SUCCESS', { id: customer.id, email: maskEmail(customer.email), tenantId });
        res.status(201).json(sanitizeCustomer(customer));
    } catch (err) {
        logEvent('CUSTOMER_CREATE_ERROR', { error: err.message, tenantId });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// Default export for compatibility with import customerController from ...
export default {
  createCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer
};

/**
 * List customers
 * Purpose: Only returns customer data needed for business operations and selection.
 */
export async function getCustomers(req, res) {
    const tenantId = req.tenantId;
    try {
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        const { active, q, page = 1, limit = 20, sort = 'name', order = 'asc' } = req.query;
        const where = { tenantId };
        if (active !== undefined) {
            where.isActive = active === 'true';
        }
        if (q) {
            where.OR = [
                { name: { contains: q, mode: 'insensitive' }, tenantId },
                { email: { contains: q, mode: 'insensitive' }, tenantId },
                { phone: { contains: q, mode: 'insensitive' }, tenantId }
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [customers, total] = await Promise.all([
            prisma.customer.findMany({ where, skip, take: Number(limit), orderBy: { [sort]: order } }),
            prisma.customer.count({ where })
        ]);
        res.json({
            data: customers.map(sanitizeCustomer),
            page: Number(page),
            limit: Number(limit),
            total
        });
    } catch (err) {
        logEvent('CUSTOMER_LIST_ERROR', { error: err.message, tenantId });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

/**
 * Update a customer
 * Purpose: Only updates and returns customer data needed for business operations.
 */
export async function updateCustomer(req, res) {
    const { id } = req.params;
    const { error, value } = customerUpdateSchema.validate(req.body);
    const tenantId = req.tenantId;
    if (error) {
        logEvent('CUSTOMER_UPDATE_FAIL', { id, reason: error.details[0].message, tenantId });
        return res.status(400).json({ message: error.details[0].message });
    }
    try {
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        // Check for email/phone uniqueness if updating those fields
        if (value.email) {
            const emailExists = await prisma.customer.findFirst({ where: { email: value.email, id: { not: Number(id) }, tenantId } });
            if (emailExists) {
                logEvent('CUSTOMER_UPDATE_FAIL', { id, reason: 'Email already in use', email: maskEmail(value.email), tenantId });
                return res.status(409).json({ message: 'Email already in use.' });
            }
        }
        if (value.phone) {
            const phoneExists = await prisma.customer.findFirst({ where: { phone: value.phone, id: { not: Number(id) }, tenantId } });
            if (phoneExists) {
                logEvent('CUSTOMER_UPDATE_FAIL', { id, reason: 'Phone already in use', phone: value.phone, tenantId });
                return res.status(409).json({ message: 'Phone already in use.' });
            }
        }
        const customer = await prisma.customer.update({
            where: { id: Number(id), tenantId },
            data: value
        });
        logEvent('CUSTOMER_UPDATE_SUCCESS', { id: customer.id, tenantId });
        res.json(sanitizeCustomer(customer));
    } catch (err) {
        logEvent('CUSTOMER_UPDATE_ERROR', { id, error: err.message, tenantId });
        res.status(404).json({ message: 'Customer not found', error: err.message });
    }
}

/**
 * Soft delete a customer (set isActive to false)
 * Purpose: Only updates isActive status, does not delete data. Returns minimal info.
 */
export async function deleteCustomer(req, res) {
    const { id } = req.params;
    const tenantId = req.tenantId;
    try {
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        // Soft delete: set isActive to false
        const customer = await prisma.customer.update({
            where: { id: Number(id), tenantId },
            data: { isActive: false }
        });
        logEvent('CUSTOMER_DELETE_SUCCESS', { id, tenantId });
        res.status(200).json(sanitizeCustomer(customer));
    } catch (err) {
        logEvent('CUSTOMER_DELETE_ERROR', { id, error: err.message, tenantId });
        res.status(404).json({ message: 'Customer not found', error: err.message });
    }
}
