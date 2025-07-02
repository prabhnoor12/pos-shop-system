// categoryRoutes.js
import express from 'express';
import categoryController from '../controllers/categoryController.js';

const router = express.Router();
router.post('/', categoryController.createCategory);
router.get('/', categoryController.getCategories);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;
