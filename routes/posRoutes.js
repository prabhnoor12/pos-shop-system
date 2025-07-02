// posRoutes.js
import express from 'express';
import posController from '../controllers/posController.js';

const router = express.Router();
router.post('/process', posController.processSale);

export default router;
