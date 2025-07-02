
// categoryController.js
// Handles product category management
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes and returns category data necessary for product management.
// - Does not return or log unnecessary or sensitive data.
// - All endpoints are documented with their data processing purpose.


import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import winston from 'winston';


const prisma = new PrismaClient();

// Winston logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        // You can add file transports here for persistent logs
        // new winston.transports.File({ filename: 'category.log' })
    ]
});

// Utility to sanitize category output
/**
 * Removes non-essential fields before sending category object to client.
 * Purpose: Data minimization for GDPR compliance.
 */
function sanitizeCategory(category) {
    if (!category) return null;
    const { createdAt, updatedAt, ...rest } = category;
    return rest;
}


const categorySchema = Joi.object({
    name: Joi.string().min(2).max(64).required(),
    description: Joi.string().max(256).allow(''),
    isActive: Joi.boolean().default(true)
});

function logEvent(event, details) {
    logger.info({ event, ...details });
}

/**
 * Create a new category
 * Purpose: Only processes and returns category data needed for product organization.
 */
export async function createCategory(req, res) {
    const { error, value } = categorySchema.validate(req.body);
    if (error) {
        logEvent('CATEGORY_CREATE_FAIL', { reason: error.details[0].message });
        return res.status(400).json({ message: error.details[0].message });
    }
    try {
        const exists = await prisma.category.findUnique({ where: { name: value.name } });
        if (exists) {
            logEvent('CATEGORY_CREATE_FAIL', { reason: 'Category already exists', name: value.name });
            return res.status(409).json({ message: 'Category already exists.' });
        }
        const category = await prisma.category.create({ data: value });
        logEvent('CATEGORY_CREATE_SUCCESS', { id: category.id, name: category.name });
        res.status(201).json(sanitizeCategory(category));
    } catch (err) {
        logEvent('CATEGORY_CREATE_ERROR', { error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// Default export for compatibility with import categoryController from ...
export default {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory
};

/**
 * List categories
 * Purpose: Only returns category data needed for product organization and selection.
 */
export async function getCategories(req, res) {
    try {
        const { active, q, page = 1, limit = 20 } = req.query;
        const where = {};
        if (active !== undefined) {
            where.isActive = active === 'true';
        }
        if (q) {
            where.name = { contains: q, mode: 'insensitive' };
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [categories, total] = await Promise.all([
            prisma.category.findMany({ where, skip, take: Number(limit), orderBy: { name: 'asc' } }),
            prisma.category.count({ where })
        ]);
        res.json({
            data: categories.map(sanitizeCategory),
            page: Number(page),
            limit: Number(limit),
            total
        });
    } catch (err) {
        logEvent('CATEGORY_LIST_ERROR', { error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

/**
 * Update a category
 * Purpose: Only updates and returns category data needed for product organization.
 */
export async function updateCategory(req, res) {
    const { id } = req.params;
    const { error, value } = categorySchema.validate(req.body);
    if (error) {
        logEvent('CATEGORY_UPDATE_FAIL', { id, reason: error.details[0].message });
        return res.status(400).json({ message: error.details[0].message });
    }
    try {
        const category = await prisma.category.update({
            where: { id: Number(id) },
            data: value
        });
        logEvent('CATEGORY_UPDATE_SUCCESS', { id: category.id });
        res.json(sanitizeCategory(category));
    } catch (err) {
        logEvent('CATEGORY_UPDATE_ERROR', { id, error: err.message });
        res.status(404).json({ message: 'Category not found', error: err.message });
    }
}

/**
 * Soft delete a category (set isActive to false)
 * Purpose: Only updates isActive status, does not delete data. Returns minimal info.
 */
export async function deleteCategory(req, res) {
    const { id } = req.params;
    try {
        // Soft delete: set isActive to false
        const category = await prisma.category.update({
            where: { id: Number(id) },
            data: { isActive: false }
        });
        logEvent('CATEGORY_DELETE_SUCCESS', { id });
        res.status(200).json(sanitizeCategory(category));
    } catch (err) {
        logEvent('CATEGORY_DELETE_ERROR', { id, error: err.message });
        res.status(404).json({ message: 'Category not found', error: err.message });
    }
}
