// barcodeRoutes.js
import express from 'express';
import multer from 'multer';
import * as barcodeController from '../controllers/barcodeController.js';

const router = express.Router();
const upload = multer();

// POST /api/barcode/generate
router.post('/generate', barcodeController.generate);
// POST /api/barcode/scan (multipart/form-data, file: image)
router.post('/scan', upload.single('image'), barcodeController.scan);
// GET /api/barcode/validate-format?format=code128
router.get('/validate-format', barcodeController.validateFormat);

export default router;
