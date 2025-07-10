// displayController.js
// Handles customer display integration for POS

import { showOnDisplay, clearDisplay } from '../hardware/display.hardware.js';

// Show text on customer display (2 lines)
export function showText(req, res) {
  const { line1, line2 } = req.body;
  showOnDisplay(line1 || '', line2 || '');
  res.json({ message: 'Text sent to customer display.' });
}

// Clear the customer display
export function clear(req, res) {
  clearDisplay();
  res.json({ message: 'Customer display cleared.' });
}

export default {
  showText,
  clear
};
