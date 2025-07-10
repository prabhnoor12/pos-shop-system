
// weight.hardware.js
// Weighing scale integration for POS (serial/USB scales)

// Example: Serial port scale (e.g., Dymo, CAS, Mettler Toledo)
// npm install serialport

import { SerialPort } from 'serialport';

const SCALE_PORT = process.env.SCALE_PORT || 'COM4'; // or '/dev/ttyUSB1' on Linux
const SCALE_BAUD = 9600;

let scalePort;
try {
  scalePort = new SerialPort({ path: SCALE_PORT, baudRate: SCALE_BAUD }, (err) => {
    if (err) {
      console.warn('Weighing scale not connected:', err.message);
      scalePort = null;
    }
  });
  scalePort.on('error', (err) => {
    console.warn('Weighing scale error:', err.message);
    scalePort = null;
  });
} catch (e) {
  console.warn('Weighing scale not connected:', e.message);
  scalePort = null;
}

/**
 * Read weight from the scale (async, event-based)
 * @param {function(number):void} onWeight - Callback for weight value (grams)
 */
export function listenForWeight(onWeight) {
  if (!scalePort || !scalePort.isOpen) return;
  scalePort.on('data', (data) => {
    // Parse data buffer to weight (depends on scale protocol)
    // Example: ASCII string '  123.45 g\r\n'
    const str = data.toString();
    const match = str.match(/([0-9.]+)\s*g/);
    if (match) {
      onWeight(parseFloat(match[1]));
    }
  });
}
