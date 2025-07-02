// userRoutes.js
// GDPR User Data Access, Erasure, and Export Routes
//
// GDPR Data Minimization & Purpose Limitation:
// - Only exposes endpoints for user data access, erasure, and export.
// - All endpoints require authentication.
import express from 'express';
import { getUserData, eraseUserData, exportUserData } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();


// GET /user/data - Access/Export user data
router.get('/data', authenticateToken, getUserData);

// DELETE /user/data - Erase user data
router.delete('/data', authenticateToken, eraseUserData);

// GET /user/data/export - Export user data as JSON
router.get('/data/export', authenticateToken, exportUserData);

export default router;
