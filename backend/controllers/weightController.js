// weightController.js
// Handles weighing scale integration for POS

import { listenForWeight } from '../hardware/weight.hardware.js';

// Example endpoint to start listening for weight (for demo/testing)
// In production, you may want to use WebSocket or event streaming for real-time updates
export function startWeightListener(req, res) {
  let lastWeight = null;
  listenForWeight((weight) => {
    lastWeight = weight;
    // Optionally: broadcast to frontend via WebSocket, etc.
  });
  res.json({ message: 'Weighing scale listener started.' });
}

// Example endpoint to get last weight (for polling demo)
export function getLastWeight(req, res) {
  // In a real app, store lastWeight in a shared location or use event streaming
  res.json({ weight: null, message: 'Polling not implemented. Use WebSocket for real-time.' });
}

export default {
  startWeightListener,
  getLastWeight
};
