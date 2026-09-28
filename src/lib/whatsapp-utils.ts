import { type PrintOrderData } from '@/components/pos/print-layouts';

/**
 * Normalizes phone numbers to standard E.164 format for WhatsApp.
 * Handles Indian numbers by prefixing 91 if a 10-digit number is provided.
 */
export function formatWhatsAppPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

/**
 * Builds a friendly, structured WhatsApp text message for an optical invoice.
 */
export function buildWhatsAppReceiptMessage(
  order: PrintOrderData,
  storeName = 'Optix Vision Care',
  receiptBaseUrl?: string
): string {
  const baseUrl =
    receiptBaseUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://optical-pos-roan.vercel.app');

  const customerName = order.customer.name || 'Valued Customer';
  const invoiceNum = order.invoiceNumber;
  const grandTotal = order.grandTotal;
  const advance = order.advancePaid;
  const balance = order.balanceDue;

  let rxText = '';
  if (order.prescription) {
    const rx = order.prescription;
    const odCyl = rx.odCylinder && rx.odCylinder !== '0.00' ? ` | CYL ${rx.odCylinder} x ${rx.odAxis}°` : '';
    const osCyl = rx.osCylinder && rx.osCylinder !== '0.00' ? ` | CYL ${rx.osCylinder} x ${rx.osAxis}°` : '';
    const odAdd = rx.odAdd && rx.odAdd !== '0.00' ? ` | ADD ${rx.odAdd}` : '';
    const osAdd = rx.osAdd && rx.osAdd !== '0.00' ? ` | ADD ${rx.osAdd}` : '';

    rxText = `\n📋 *Clinical Prescription:*\n` +
      `• *OD (Right):* SPH ${rx.odSphere || '0.00'}${odCyl}${odAdd}\n` +
      `• *OS (Left):* SPH ${rx.osSphere || '0.00'}${osCyl}${osAdd}\n`;
  }

  const receiptUrl = order.invoiceId
    ? `${baseUrl}/receipt/${order.invoiceId}`
    : `${baseUrl}/receipt/${invoiceNum}`;

  return (
    `👓 *${storeName} — Digital Invoice & Optical Rx*\n\n` +
    `Hello *${customerName}*,\n` +
    `Thank you for visiting us! Your optical eyewear order has been confirmed.\n\n` +
    `📄 *Invoice #:* ${invoiceNum}\n` +
    `💰 *Grand Total:* ₹${grandTotal}\n` +
    `✅ *Advance Paid:* ₹${advance}\n` +
    `⏳ *Balance Due:* ₹${balance}\n` +
    rxText +
    `\n📲 *View & Download Digital Tax Receipt:*\n` +
    `${receiptUrl}\n\n` +
    `_Thank you for choosing ${storeName}!_`
  );
}

/**
 * Generates the full WhatsApp Click-to-Chat deep link.
 */
export function getWhatsAppShareUrl(
  order: PrintOrderData,
  storeName = 'Optix Vision Care',
  receiptBaseUrl?: string
): string {
  const phone = formatWhatsAppPhone(order.customer.phone || '');
  const message = buildWhatsAppReceiptMessage(order, storeName, receiptBaseUrl);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
