// storeRoutes.js
import express from 'express';
import storeController from '../controllers/storeController.js';

const router = express.Router();


// Store CRUD
router.post('/', storeController.createStore);
router.get('/', storeController.getStores);
router.get('/:id', storeController.getStoreById);
router.put('/:id', storeController.updateStore);
router.delete('/:id', storeController.deleteStore);

// Store user management
router.post('/:id/users', storeController.assignUserToStore); // assign user to store (body: userId, role)
router.delete('/:id/users', storeController.removeUserFromStore); // remove user from store (body: userId)
router.get('/:id/users', storeController.getStoreUsers); // list users for store

// Store analytics
router.get('/:id/analytics', storeController.getStoreAnalytics);

export default router;
