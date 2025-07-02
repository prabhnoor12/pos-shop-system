// supplierRoutes.js
import express from 'express';
import supplierController from '../controllers/supplierController.js';

const router = express.Router();
router.post('/', supplierController.createSupplier);
router.get('/', supplierController.getSuppliers);
router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

export default router;
