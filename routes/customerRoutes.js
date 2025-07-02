// customerRoutes.js
import express from 'express';
import customerController from '../controllers/customerController.js';

const router = express.Router();
router.post('/', customerController.createCustomer);
router.get('/', customerController.getCustomers);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

export default router;
