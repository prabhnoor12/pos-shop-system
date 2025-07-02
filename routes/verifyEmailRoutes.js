
import express from 'express';
import { signup, login } from '../controllers/verifyEmailController.js';

const router = express.Router();

// Signup route (verifies email, then creates user)
router.post('/signup', signup);

// Login route (fetches user and checks password)
router.post('/login', login);

export default router;
