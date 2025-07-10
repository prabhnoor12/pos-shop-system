
// display.hardware.js
// Customer display integration for POS

// Example: Serial/USB customer display (2-line VFD or LCD)
// You may need to install 'serialport' for serial displays:
// npm install serialport

import { SerialPort } from 'serialport';
import logger from '../config/logger.js';


// Configure your display's serial port and baud rate
const DISPLAY_PORT = process.env.DISPLAY_PORT || 'COM3'; // or '/dev/ttyUSB0' on Linux
const DISPLAY_BAUD = 9600;
const DISPLAY_WIDTH = 20;



let port = null;
let displayAvailable = false;
let portOpen = false;

function setupPort() {
  try {
    port = new SerialPort({ path: DISPLAY_PORT, baudRate: DISPLAY_BAUD, autoOpen: false });
    port.on('open', () => {
      displayAvailable = true;
      portOpen = true;
      logger.info('Customer display connected.');
    });
    port.on('close', () => {
      displayAvailable = false;
      portOpen = false;
      logger.warn('Customer display port closed.');
    });
    port.on('error', (err) => {
      logger.warn('Customer display error:', err.message);
      port = null;
      displayAvailable = false;
      portOpen = false;
    });
    port.open((err) => {
      if (err) {
        logger.warn('Customer display not connected:', err.message);
        port = null;
        displayAvailable = false;
        portOpen = false;
      }
    });
  } catch (e) {
    logger.warn('Customer display not connected:', e.message);
    port = null;
    displayAvailable = false;
    portOpen = false;
  }
}

setupPort();

// Graceful shutdown
process.on('exit', () => {
  if (port && portOpen) {
    port.close();
    logger.info('Customer display port closed on exit.');
  }
});
process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());

/**
 * Check if the customer display is available
 * @returns {boolean}
 */
export function isDisplayAvailable() {
  return !!(port && portOpen && displayAvailable);
}

/**
 * Show text on the customer display (2 lines)
 * @param {string} line1
 * @param {string} line2
 * @returns {boolean} Success status
 */
export function showOnDisplay(line1 = '', line2 = '') {
  if (!isDisplayAvailable()) {
    logger.warn('Attempted to write to unavailable customer display.');
    return false;
  }
  try {
    port.write(Buffer.from([0x0C]));
    port.write(line1.padEnd(DISPLAY_WIDTH).slice(0, DISPLAY_WIDTH));
    port.write('\n');
    port.write(line2.padEnd(DISPLAY_WIDTH).slice(0, DISPLAY_WIDTH));
    return true;
  } catch (err) {
    logger.error('Failed to write to customer display:', err.message);
    return false;
  }
}

/**
 * Clear the customer display
 * @returns {boolean} Success status
 */
export function clearDisplay() {
  if (!isDisplayAvailable()) {
    logger.warn('Attempted to clear unavailable customer display.');
    return false;
  }
  try {
    port.write(Buffer.from([0x0C]));
    return true;
  } catch (err) {
    logger.error('Failed to clear customer display:', err.message);
    return false;
  }
}

/**
 * For testing: mock or stub SerialPort as needed in your test suite.
 */
