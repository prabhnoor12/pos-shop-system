
// printer.hardware.js
// Receipt printer integration for POS

// Uses escpos for USB/network/serial receipt printers
// npm install escpos escpos-usb

import escpos from 'escpos';
import escposUSB from 'escpos-usb';
escpos.USB = escposUSB;

/**
 * Print a receipt
 * @param {string[]} lines - Array of text lines to print
 */
export function printReceipt(lines = []) {
  const device = new escpos.USB();
  const printer = new escpos.Printer(device);
  device.open(() => {
    lines.forEach(line => printer.text(line));
    printer.cut().close();
  });
}

/**
 * Print a QR code (optional)
 * @param {string} data
 */
export function printQRCode(data) {
  const device = new escpos.USB();
  const printer = new escpos.Printer(device);
  device.open(() => {
    printer.qrimage(data, { type: 'png', mode: 'dhdw' }, () => {
      printer.cut().close();
    });
  });
}
