// productController.js
// Handles product CRUD operations
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes and returns product data necessary for business operations.
// - Does not return or log unnecessary or sensitive data.
// - All endpoints are documented with their data processing purpose.

import { PrismaClient } from '@prisma/client';
import { storeContent } from '../services/vaultService.js';
import Joi from 'joi';
import winston from 'winston';
import * as productService from '../services/productService.js';
import { uploadFile } from '../services/gofileService.js';
import formidable from 'formidable';
import fs from 'fs';

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

const productSchema = Joi.object({
    name: Joi.string().min(2).max(128).required(),
    sku: Joi.string().alphanum().min(2).max(32).required(),
    price: Joi.number().precision(2).min(0).required(),
    categoryId: Joi.number().integer().required(),
    supplierId: Joi.number().integer().allow(null),
    description: Joi.string().max(512).allow(''),
    isActive: Joi.boolean().default(true)
});

const productUpdateSchema = Joi.object({
    name: Joi.string().min(2).max(128),
    sku: Joi.string().alphanum().min(2).max(32),
    price: Joi.number().precision(2).min(0),
    categoryId: Joi.number().integer(),
    supplierId: Joi.number().integer().allow(null),
    description: Joi.string().max(512).allow(''),
    isActive: Joi.boolean()
});

function logEvent(event, details) {
    logger.info({ event, ...details });
}

/**
 * Removes non-essential fields before sending product object to client.
 * Purpose: Data minimization for GDPR compliance.
 */
function sanitizeProduct(product) {
    if (!product) return null;
    const { createdAt, updatedAt, ...rest } = product;
    return rest;
}

/**
 * Create a new product
 * Purpose: Only processes and returns product data needed for business operations.
 */
export async function createProduct(req, res) {
    const { error, value } = productSchema.validate(req.body);
    const tenantId = req.tenantId;
    if (error) {
        logEvent('PRODUCT_CREATE_FAIL', { reason: error.details[0].message, tenantId });
        return res.status(400).json({ message: error.details[0].message });
    }
    try {
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        // Check for duplicate SKU in tenant scope
        const exists = await productService.getProducts({ q: value.sku, tenantId });
        if (exists && exists.data && exists.data.some(p => p.sku === value.sku)) {
            logEvent('PRODUCT_CREATE_FAIL', { reason: 'Product SKU already exists', sku: value.sku, tenantId });
            return res.status(409).json({ message: 'Product SKU already exists.' });
        }
        // If sensitive product info provided, store in Vault and save path
        let vaultDocPath = null;
        if (value.sensitiveDoc) {
            const vaultRes = await storeContent(`/tenants/${tenantId}/products/${value.sku}/doc`, value.sensitiveDoc);
            vaultDocPath = vaultRes.data?.path || vaultRes.data?.id || null;
        }
        const product = await productService.createProduct({ ...value, tenantId, vaultDocPath });
        logEvent('PRODUCT_CREATE_SUCCESS', { id: product.id, sku: product.sku, tenantId });
        res.status(201).json(sanitizeProduct(product));
    } catch (err) {
        logEvent('PRODUCT_CREATE_ERROR', { error: err.message, tenantId });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

/**
 * List products
 * Purpose: Only returns product data needed for business operations and selection.
 */
export async function getProducts(req, res) {
    const tenantId = req.tenantId;
    try {
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        const result = await productService.getProducts({ ...req.query, tenantId });
        res.json({
            ...result,
            data: result.data.map(sanitizeProduct)
        });
    } catch (err) {
        logEvent('PRODUCT_LIST_ERROR', { error: err.message, tenantId });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

/**
 * Update a product
 * Purpose: Only updates and returns product data needed for business operations.
 */
export async function updateProduct(req, res) {
    const { id } = req.params;
    const { error, value } = productUpdateSchema.validate(req.body);
    const tenantId = req.tenantId;
    if (error) {
        logEvent('PRODUCT_UPDATE_FAIL', { id, reason: error.details[0].message, tenantId });
        return res.status(400).json({ message: error.details[0].message });
    }
    try {
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        const product = await productService.updateProduct(id, value, tenantId);
        logEvent('PRODUCT_UPDATE_SUCCESS', { id: product.id, tenantId });
        res.json(sanitizeProduct(product));
    } catch (err) {
        logEvent('PRODUCT_UPDATE_ERROR', { id, error: err.message, tenantId });
        res.status(404).json({ message: 'Product not found', error: err.message });
    }
}

/**
 * Soft delete a product (set isActive to false)
 * Purpose: Only updates isActive status, does not delete data. Returns minimal info.
 */
export async function deleteProduct(req, res) {
    const { id } = req.params;
    const tenantId = req.tenantId;
    try {
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        // Soft delete: set isActive to false
        const product = await productService.deleteProduct(id, tenantId);
        logEvent('PRODUCT_DELETE_SUCCESS', { id, tenantId });
        res.status(200).json(sanitizeProduct(product));
    } catch (err) {
        logEvent('PRODUCT_DELETE_ERROR', { id, error: err.message, tenantId });
        res.status(404).json({ message: 'Product not found', error: err.message });
    }
}

// Get product by ID
/**
 * Get product by ID
 * Purpose: Only returns product data needed for business operations and selection.
 */
export async function getProductById(req, res) {
    const { id } = req.params;
    const tenantId = req.tenantId;
    try {
        if (!tenantId) {
            return res.status(403).json({ message: 'Tenant context required.' });
        }
        const product = await productService.getProductById(id, tenantId);
        if (!product) {
            logEvent('PRODUCT_GET_FAIL', { id, reason: 'Not found', tenantId });
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(sanitizeProduct(product));
    } catch (err) {
        logEvent('PRODUCT_GET_ERROR', { id, error: err.message, tenantId });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

/**
 * Upload a product attachment (image, document, etc.) to Gofile
 * POST /products/:id/attachment
 * Field: file
 */
export async function uploadProductAttachment(req, res) {
    const { id } = req.params;
    const tenantId = req.tenantId;
    if (!tenantId) {
        return res.status(403).json({ message: 'Tenant context required.' });
    }
    const form = formidable({ multiples: false, maxFileSize: 200 * 1024 * 1024 });
    form.parse(req, async (err, fields, files) => {
        if (err) {
            return res.status(400).json({ message: 'File upload error', error: err.message });
        }
        const file = files.file;
        if (!file) {
            return res.status(400).json({ message: 'No file provided.' });
        }
        try {
            const fileBuffer = fs.readFileSync(file.filepath);
            const gofileResult = await uploadFile(fileBuffer, file.originalFilename);
            // Optionally: store gofileResult.data.downloadPage or .directLink in your DB, linked to product
            res.json({ gofile: gofileResult });
        } catch (e) {
            res.status(500).json({ message: 'Gofile upload failed', error: e.message });
        } finally {
            if (file && file.filepath) fs.unlink(file.filepath, () => {});
        }
    });
}

// Default export for compatibility with import productController from ...
export default {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductAttachment
};
