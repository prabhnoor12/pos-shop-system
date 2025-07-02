// Health check endpoint for monitoring
import express from 'express';
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    message: 'POS Shop System is healthy',
  });
});

export default router;
