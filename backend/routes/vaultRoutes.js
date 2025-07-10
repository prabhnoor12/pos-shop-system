// vaultRoutes.js
import express from 'express';
import * as vaultController from '../controllers/vaultController.js';

const router = express.Router();

// POST /api/vault/content/store
router.post('/content/store', vaultController.storeContent);
// GET /api/vault/content/get
router.get('/content/get', vaultController.getContent);
// POST /api/vault/keys/generate
router.post('/keys/generate', vaultController.generateKey);
// POST /api/vault/keys/generate-with-store
router.post('/keys/generate-with-store', vaultController.generateKeyWithStore);
// GET /api/vault/content/list
router.get('/content/list', vaultController.listContent);

export default router;
