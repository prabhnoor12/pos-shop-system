// fileRoutes.js
import express from 'express';
import { upload } from '../controllers/fileController.js';

const router = express.Router();

// POST /api/files/upload
router.post('/upload', upload);

export default router;
