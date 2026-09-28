'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  getPublicReceiptAction,
  type PublicReceiptData,
} from '@/actions/receipt-actions';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Glasses,
  Printer,
  Share2,
  Calendar,
  Building2,
  Store,
  User,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Receipt,
  ArrowLeft,
  Sparkles,
  Download,
  Mail,
  Send,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { sendReceiptEmailAction } from '@/actions/email-actions';

export default function PublicReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<PublicReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('token') || undefined
        : undefined;

    getPublicReceiptAction(id, token).then((res) => {
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.customer?.email) {
          setEmailRecipient(res.data.customer.email);
        }
      } else {
        setError(res.error || 'Invoice not found');
      }
      setLoading(false);
    });
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!data) return;
    const phone = data.customer.phone.replace(/\D/g, '');
    const formattedPhone = phone.length === 10 ? `91${phone}` : phone;
    const storeName = data.organization.name;
    const receiptUrl = window.location.href;

    const message =
      `👓 *${storeName} — Digital Invoice & Optical Rx*\n\n` +
      `Hello *${data.customer.fullName}*,\n` +
      `Here is your optical eyewear tax receipt.\n\n` +
      `📄 *Invoice #:* ${data.invoiceNumber}\n` +
      `💰 *Total:* ₹${data.grandTotal}\n` +
      `✅ *Advance Paid:* ₹${data.advancePaid}\n` +
      `⏳ *Balance Due:* ₹${data.balanceDue}\n\n` +
      `📲 *View & Download Digital Receipt:*\n` +
      `${receiptUrl}\n\n` +
      `_Thank you for choosing ${storeName}!_`;

    const shareUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(shareUrl, '_blank');
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    if (!emailRecipient.trim() || !emailRecipient.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSendingEmail(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const res = await sendReceiptEmailAction(data.id, emailRecipient.trim(), origin);
      if (res.success) {
        toast.success(`Receipt sent to ${emailRecipient.trim()}!`, {
          description: 'Optical prescription and tax invoice dispatched via SMTP.',
        });
        setEmailModalOpen(false);
      } else {
        toast.error(res.error || 'Failed to send receipt email');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error sending receipt email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading digital tax receipt...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    const isTokenOrAuthError =
      error?.toLowerCase().includes('token') ||
      error?.toLowerCase().includes('unauthorized');

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-xl space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {isTokenOrAuthError ? 'Invalid or Expired Receipt Link' : 'Invoice Not Found'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isTokenOrAuthError
              ? 'This optical tax invoice link is invalid, expired, or missing an authorization token. Please use the original link sent by the clinic or store.'
              : "We couldn't locate the requested optical invoice or prescription. Please verify the link or contact the dispensing store."}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isFullyPaid = data.paymentStatus === 'PAID' || parseFloat(data.balanceDue) <= 0;

  return (
    <div className="min-h-screen bg-muted/30 text-foreground py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white print:text-black">
      {/* ── Top Utility Bar (Hidden during print) ── */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>OptixOS Home</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <button
            type="button"
            data-testid="btn-whatsapp-share"
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            data-testid="btn-email-receipt"
            onClick={() => setEmailModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email</span>
          </button>
          <button
            type="button"
            data-testid="btn-print-receipt"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 shadow-xs transition cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* ── Digital Invoice Paper Container ── */}
      <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-xl print:shadow-none print:border-none print:p-0 space-y-6">
        {/* Header: Practice Branding & Invoice Meta */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <Glasses className="h-4 w-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {data.organization.name}
              </h1>
            </div>
            {data.branch && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Store className="h-3.5 w-3.5 text-emerald-500" />
                <span>{data.branch.name} Dispensary</span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Statutory GST Registered Optical Eyewear Practice
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="text-xs uppercase font-mono text-muted-foreground tracking-wider">
              Tax Invoice
            </div>
            <div className="text-lg font-mono font-bold text-primary">
              {data.invoiceNumber}
            </div>
            <div className="flex items-center sm:justify-end gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{new Date(data.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <div>
              {isFullyPaid ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Settled & Paid</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold">
                  <Clock className="h-3 w-3" />
                  <span>Pending Balance</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Customer Information Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-muted/40 p-4 border border-border/60 text-xs">
          <div>
            <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block mb-1">
              Billed To (Patient)
            </span>
            <div className="font-bold text-sm text-foreground">{data.customer.fullName}</div>
            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
              <Phone className="h-3 w-3" />
              <span>{data.customer.phone}</span>
            </div>
            {data.customer.city && (
              <div className="text-muted-foreground">{data.customer.city}</div>
            )}
          </div>

          <div className="sm:text-right">
            <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block mb-1">
              Order Status
            </span>
            <div className="font-bold text-foreground capitalize">
              {data.orderStatus.toLowerCase().replace('_', ' ')}
            </div>
            <span className="text-[11px] text-muted-foreground block mt-0.5">
              Verified by Qualified Optometrist
            </span>
          </div>
        </div>

        {/* Clinical Prescription Table (if attached) */}
        {data.prescription && (
          <div className="space-y-2 border border-border/80 rounded-xl p-4 bg-card/60">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-blue-500" />
                <span>Clinical Eyewear Refraction (Diopters in 0.25 D Steps)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-border/80 text-[10px] uppercase text-muted-foreground bg-muted/50">
                    <th className="py-2 px-3 text-left font-sans font-bold">Eye</th>
                    <th className="py-2 px-3">Sphere</th>
                    <th className="py-2 px-3">Cylinder</th>
                    <th className="py-2 px-3">Axis</th>
                    <th className="py-2 px-3">Add (Near)</th>
                    <th className="py-2 px-3">Pupillary Dist (PD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="py-2.5 px-3 text-left font-sans font-bold text-primary">OD (Right Eye)</td>
                    <td className="py-2.5 px-3 font-semibold">{data.prescription.odSphere || '0.00'}</td>
                    <td className="py-2.5 px-3">{data.prescription.odCylinder || '0.00'}</td>
                    <td className="py-2.5 px-3">{data.prescription.odAxis ? `${data.prescription.odAxis}°` : '—'}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      {data.prescription.odAdd ? `+${data.prescription.odAdd.replace('+', '')}` : '—'}
                    </td>
                    <td className="py-2.5 px-3">{data.prescription.odPd || data.prescription.binocularPd || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-left font-sans font-bold text-blue-500">OS (Left Eye)</td>
                    <td className="py-2.5 px-3 font-semibold">{data.prescription.osSphere || '0.00'}</td>
                    <td className="py-2.5 px-3">{data.prescription.osCylinder || '0.00'}</td>
                    <td className="py-2.5 px-3">{data.prescription.osAxis ? `${data.prescription.osAxis}°` : '—'}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      {data.prescription.osAdd ? `+${data.prescription.osAdd.replace('+', '')}` : '—'}
                    </td>
                    <td className="py-2.5 px-3">{data.prescription.osPd || data.prescription.binocularPd || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Itemized Cart & Spectacles Breakdown */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-emerald-500" />
            <span>Eyewear Items & Lens Specifications</span>
          </h3>

          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-4">Item & Specifications</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-right">GST Rate</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{item.description}</div>
                      {(item.lensType || item.coating || item.lensMaterial) && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 space-x-1.5">
                          {item.lensType && <span>Type: {item.lensType}</span>}
                          {item.coating && <span>• Coating: {item.coating}</span>}
                          {item.lensMaterial && <span>• Material: {item.lensMaterial}</span>}
                        </div>
                      )}
                      {item.isCustomerOwnFrame && (
                        <span className="inline-block mt-0.5 text-[9px] rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 font-semibold">
                          Customer Own Frame
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono text-muted-foreground">₹{item.unitPrice}</td>
                    <td className="py-3 px-3 text-right font-mono text-muted-foreground">{item.taxRate}%</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">₹{item.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ledger & Tax Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
          {/* Payment History & Notes */}
          <div className="space-y-3 sm:w-1/2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Payment Transactions
              </span>
              {data.payments.length > 0 ? (
                <div className="space-y-1">
                  {data.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs rounded-lg border border-border/60 p-2 bg-muted/20">
                      <span className="font-medium text-foreground capitalize">{p.paymentMode.toLowerCase()} Payment</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{p.amount}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">No advance payment recorded.</div>
              )}
            </div>

            {data.notes && (
              <div className="rounded-lg border border-border/60 p-2.5 bg-muted/20 text-xs">
                <span className="font-bold text-muted-foreground text-[10px] uppercase block mb-0.5">Order Remarks:</span>
                <p className="text-foreground">{data.notes}</p>
              </div>
            )}
          </div>

          {/* Grand Totals Box */}
          <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2 sm:w-1/2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span className="font-mono">₹{data.subtotal}</span>
            </div>
            {parseFloat(data.discountAmount) > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discount:</span>
                <span className="font-mono">-₹{data.discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Taxable Value:</span>
              <span className="font-mono">₹{data.taxableValue}</span>
            </div>
            <div className="flex justify-between text-muted-foreground text-[11px]">
              <span>CGST + SGST (Dual Rate):</span>
              <span className="font-mono">₹{data.totalTax}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold text-base text-foreground">
              <span>Grand Total:</span>
              <span className="font-mono text-primary">₹{data.grandTotal}</span>
            </div>
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
              <span>Advance Paid:</span>
              <span className="font-mono font-bold">₹{data.advancePaid}</span>
            </div>
            <div className="flex justify-between text-amber-700 dark:text-amber-400 font-bold border-t border-border pt-1">
              <span>Balance Due:</span>
              <span className="font-mono">₹{data.balanceDue}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-4 text-center text-[11px] text-muted-foreground">
          <p>This is a computer-generated tax invoice and optical prescription. No physical signature required.</p>
          <p className="mt-0.5">Powered by OptixOS Optical Operating Cloud</p>
        </div>
      </div>

      {/* ── Email Receipt Modal ── */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:hidden animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Email Tax Receipt & Rx</h3>
                  <p className="text-[11px] text-muted-foreground">Invoice #{data.invoiceNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="input-customer-email"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Customer Email Address
                </label>
                <input
                  id="input-customer-email"
                  data-testid="input-customer-email"
                  type="email"
                  required
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                />
                <p className="text-[10px] text-muted-foreground">
                  The client will receive an itemized GST breakdown, optical prescription (OD/OS), and live receipt link.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-input text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-email-receipt"
                  disabled={isSendingEmail}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-4 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
