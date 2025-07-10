
// productService.js
// Handles product business logic with Redis caching for hot data
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes product data necessary for business operations.
// - Does not log or store personal or sensitive data.
// - All service functions are documented with their data processing purpose.

import { PrismaClient } from '@prisma/client';
import redisClient, { redisAvailable } from '../config/redisClient.js';
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
        new winston.transports.File({ filename: 'logs/product-service.log' })
    ]
});

const PRODUCT_CACHE_PREFIX = 'product:';
const PRODUCT_LIST_CACHE_KEY = 'product:list';
const PRODUCT_CACHE_TTL = 60 * 5; // 5 minutes

/**
 * Get product by ID
 * Purpose: Only processes and returns product data needed for business operations. No personal data stored or logged.
 */
export async function getProductById(id, tenantId) {
    const cacheKey = PRODUCT_CACHE_PREFIX + id + ':tenant:' + tenantId;
    if (redisAvailable) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            logger.info({ event: 'PRODUCT_CACHE_HIT', id, tenantId });
            return JSON.parse(cached);
        }
    }
    const dbProduct = await prisma.product.findFirst({ where: { id: Number(id), tenantId: Number(tenantId) } });
    if (dbProduct && redisAvailable) {
        await redisClient.setEx(cacheKey, PRODUCT_CACHE_TTL, JSON.stringify(dbProduct));
        logger.info({ event: 'PRODUCT_CACHE_SET', id, tenantId });
    }
    return dbProduct;
}

/**
 * Get products with optional filters, pagination, and caching
 * Purpose: Only processes and returns product data needed for business operations. No personal data stored or logged.
 */
export async function getProducts(query = {}) {
    const { active, q, page = 1, limit = 20, sort = 'name', order = 'asc', tenantId } = query;
    if (!tenantId) throw new Error('Tenant context required');
    // Only cache the default query (no filters, first page, tenant)
    const isDefault = !q && !active && Number(page) === 1 && Number(limit) === 20 && sort === 'name' && order === 'asc';
    const cacheKey = PRODUCT_LIST_CACHE_KEY + ':tenant:' + tenantId;
    if (isDefault && redisAvailable) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            logger.info({ event: 'PRODUCT_LIST_CACHE_HIT', tenantId });
            return JSON.parse(cached);
        }
    }
    const where = { tenantId: Number(tenantId) };
    if (active !== undefined) where.isActive = active === 'true';
    if (q) {
        where.OR = [
            { name: { contains: q, mode: 'insensitive' }, tenantId: Number(tenantId) },
            { sku: { contains: q, mode: 'insensitive' }, tenantId: Number(tenantId) }
        ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
        prisma.product.findMany({ where, skip, take: Number(limit), orderBy: { [sort]: order } }),
        prisma.product.count({ where })
    ]);
    const result = { data: products, page: Number(page), limit: Number(limit), total };
    if (isDefault && redisAvailable) {
        await redisClient.setEx(cacheKey, PRODUCT_CACHE_TTL, JSON.stringify(result));
        logger.info({ event: 'PRODUCT_LIST_CACHE_SET', tenantId });
    }
    return result;
}

/**
 * Create a new product
 * Purpose: Only processes and stores product data needed for business operations. No personal data stored or logged.
 */
export async function createProduct(data) {
    if (!data.tenantId) throw new Error('Tenant context required');
    const createdProduct = await prisma.product.create({ data });
    // Invalidate product list cache for this tenant
    if (redisAvailable) await redisClient.del(PRODUCT_LIST_CACHE_KEY + ':tenant:' + data.tenantId);
    logger.info({ event: 'PRODUCT_CREATE', id: createdProduct.id, tenantId: data.tenantId });
    return createdProduct;
}

/**
 * Update a product
 * Purpose: Only processes and updates product data needed for business operations. No personal data stored or logged.
 */
export async function updateProduct(id, data, tenantId) {
    if (!tenantId) throw new Error('Tenant context required');
    // Only update if product belongs to tenant
    const updatedProduct = await prisma.product.update({
        where: { id: Number(id), tenantId: Number(tenantId) },
        data
    });
    // Invalidate product and list cache for this tenant
    if (redisAvailable) {
        await redisClient.del(PRODUCT_CACHE_PREFIX + id + ':tenant:' + tenantId);
        await redisClient.del(PRODUCT_LIST_CACHE_KEY + ':tenant:' + tenantId);
    }
    logger.info({ event: 'PRODUCT_UPDATE', id, tenantId });
    return updatedProduct;
}

/**
 * Soft delete a product (set isActive to false)
 * Purpose: Only updates isActive status. No personal data stored or logged.
 */
export async function deleteProduct(id, tenantId) {
    if (!tenantId) throw new Error('Tenant context required');
    const deletedProduct = await prisma.product.update({
        where: { id: Number(id), tenantId: Number(tenantId) },
        data: { isActive: false }
    });
    if (redisAvailable) {
        await redisClient.del(PRODUCT_CACHE_PREFIX + id + ':tenant:' + tenantId);
        await redisClient.del(PRODUCT_LIST_CACHE_KEY + ':tenant:' + tenantId);
    }
    logger.info({ event: 'PRODUCT_DELETE', id, tenantId });
    return deletedProduct;
}
