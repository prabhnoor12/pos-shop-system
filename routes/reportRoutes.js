// reportRoutes.js
import express from 'express';
import reportController from '../controllers/reportController.js';

const router = express.Router();
router.get('/sales', reportController.generateSalesReport);
router.get('/inventory', reportController.generateInventoryReport);

export default router;
