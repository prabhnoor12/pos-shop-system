// productRoutes.js

import express from 'express';
import * as productController from '../controllers/productController.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac } from '../middleware/rbac.middleware.js';

const router = express.Router();

// Only 'admin' and 'manager' can create, update, or delete products
router.post('/', authenticateToken, rbac(['admin', 'manager', 'owner']), productController.createProduct);
router.put('/:id', authenticateToken, rbac(['admin', 'manager', 'owner']), productController.updateProduct);
router.delete('/:id', authenticateToken, rbac(['admin', 'manager', 'owner']), productController.deleteProduct);

// All authenticated roles can view products
router.get('/', authenticateToken, rbac(['admin', 'manager', 'cashier', 'owner']), productController.getProducts);
router.get('/:id', authenticateToken, rbac(['admin', 'manager', 'cashier', 'owner']), productController.getProductById);

export default router;
