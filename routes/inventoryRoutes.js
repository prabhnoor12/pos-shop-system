// Multi-Store & Multi-Register
router.get('/registers', inventoryController.listRegisters); // List all registers for a store/tenant
router.post('/registers', inventoryController.createRegister); // Create a new register

// Offline Mode Sync
router.post('/sync/sales', inventoryController.syncSales); // Sync sales from offline clients
router.post('/sync/inventory', inventoryController.syncInventory); // Sync inventory changes from offline clients
// inventoryRoutes.js
import express from 'express';
import inventoryController from '../controllers/inventoryController.js';

const router = express.Router();

// Inventory CRUD
router.post('/', inventoryController.addInventory);
router.get('/', inventoryController.getInventory);
router.put('/:id', inventoryController.updateInventory);
router.post('/batch', inventoryController.batchUpdateInventory);

// Warehouses
router.get('/warehouses', inventoryController.listWarehouses); // List all warehouses

// Stock transfer
router.post('/stock/transfer', inventoryController.transferStock); // Transfer stock between warehouses

// Batches and serial numbers
router.post('/batch-serial', inventoryController.addBatchOrSerial); // Add batch or serial
// (Optional) List batches/serials for a product or inventory (not yet implemented)

// Stock movement history
router.get('/stock/history', inventoryController.getStockMovementHistory);

// Low-stock and expiry alerts
router.get('/stock/low', inventoryController.getLowStockAlerts);
router.get('/stock/expiring', inventoryController.getExpiringProducts);

export default router;
