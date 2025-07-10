
// cashier.hardware.js
// Hardware integration for POS: receipt printer, barcode scanner, cash drawer

// 1. Receipt Printer Integration (escpos)
import escpos from 'escpos';
import escposUSB from 'escpos-usb';
escpos.USB = escposUSB;

export function printReceipt(textLines = []) {
  const device = new escpos.USB();
  const printer = new escpos.Printer(device);
  device.open(() => {
    textLines.forEach(line => printer.text(line));
    printer.cut().close();
  });
}

// 2. Cash Drawer Integration (via printer)
export function openCashDrawer() {
  const device = new escpos.USB();
  const printer = new escpos.Printer(device);
  device.open(() => {
    printer.cashdraw().close();
  });
}

