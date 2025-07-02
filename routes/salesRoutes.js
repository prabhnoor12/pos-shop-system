// salesRoutes.js
import express from 'express';
import salesController from '../controllers/salesController.js';
import { validateSale } from '../middleware/sales.validation.js';

const router = express.Router();


// Multi-store, multi-register, and offline sync support
router.get('/', salesController.getSales);
router.get('/:id', salesController.getSaleById);
router.post('/', validateSale, salesController.processSale);
router.post('/sync', salesController.syncSales);

export default router;
