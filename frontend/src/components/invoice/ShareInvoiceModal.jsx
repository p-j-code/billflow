import { useState, useEffect } from 'react';
import { Modal, Spinner } from '@/components/ui';
import api from '@/api/client';
import {
  Link, Copy, Check, MessageCircle,
  RefreshCw, Trash2, ExternalLink, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShareInvoiceModal({ open, onClose, invoice }) {
  const [shareData, setShareData] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [copied,    setCopied]    = useState(false);

  useEffect(() => {
    if (open && invoice?.shareToken && invoice?.shareTokenExpiry) {
      const url = `${window.location.origin}/invoice/view/${invoice.shareToken}`;
      setShareData({ shareToken: invoice.shareToken, shareUrl: url, expiresAt: invoice.shareTokenExpiry });
    } else {
      setShareData(null);
    }
  }, [open, invoice]);

  const generate = async () => {
    setLoading(true);
    try {
      const r = await api.patch(`/invoices/${invoice._id}/share`, { action: 'generate' });
      setShareData(r.data.data);
      toast.success('Share link generated!');
    } catch { toast.error('Failed to generate link'); }
    finally { setLoading(false); }
  };

  const revoke = async () => {
    setLoading(true);
    try {
      await api.patch(`/invoices/${invoice._id}/share`, { action: 'revoke' });
      setShareData(null);
      toast.success('Share link revoked.');
    } catch { toast.error('Failed to revoke link'); }
    finally { setLoading(false); }
  };

  const copyLink = async () => {
    if (!shareData?.shareUrl) return;
    await navigator.clipboard.writeText(shareData.shareUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsApp = () => {
    if (!shareData?.shareUrl || !invoice) return;
    const biz   = invoice.partySnapshot?.name || 'Customer';
    const total = Number(invoice.totals?.grandTotal || 0).toLocaleString('en-IN');
    const msg = encodeURIComponent(
      `Dear ${biz},\n\nPlease find your invoice *${invoice.invoiceNo}* for ₹${total}.\n\nView & Download: ${shareData.shareUrl}\n\nThank you for your business!`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

  return (
    <Modal open={open} onClose={onClose} title="Share Invoice" size="sm">
      {/* Invoice info */}
      {invoice && (
        <div className="bg-surface border border-border rounded-xl p-3 mb-5 flex items-center justify-between">
          <div>
            <p className="font-mono font-bold text-amber-400">{invoice.invoiceNo}</p>
            <p className="text-xs text-secondary">{invoice.partySnapshot?.name}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-primary">₹{Number(invoice.totals?.grandTotal || 0).toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted">{fmtD(invoice.invoiceDate)}</p>
          </div>
        </div>
      )}

      {!shareData ? (
        /* No link yet */
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Link size={22} className="text-amber-500" />
          </div>
          <p className="font-semibold text-primary mb-1">Generate Share Link</p>
          <p className="text-sm text-secondary mb-5 max-w-xs mx-auto">
            Create a secure public link valid for 30 days. Anyone with the link can view and download this invoice.
          </p>
          <button onClick={generate} disabled={loading}
            className="btn-primary flex items-center gap-2 mx-auto">
            {loading ? <Spinner size={14} /> : <Link size={14} />}
            Generate Link
          </button>
        </div>
      ) : (
        /* Link generated */
        <div className="space-y-4">
          {/* URL display */}
          <div>
            <p className="label mb-2">Share Link</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 font-mono text-xs text-secondary truncate">
                {shareData.shareUrl}
              </div>
              <button onClick={copyLink}
                className={`p-2.5 rounded-lg border transition-all ${copied ? 'bg-success/10 border-success/30 text-success' : 'bg-card border-border text-muted hover:text-primary'}`}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
              <a href={shareData.shareUrl} target="_blank" rel="noreferrer"
                className="p-2.5 rounded-lg border border-border bg-card text-muted hover:text-primary transition-all">
                <ExternalLink size={15} />
              </a>
            </div>
            <p className="text-xs text-muted mt-1.5 flex items-center gap-1">
              <Clock size={10} /> Expires {fmtD(shareData.expiresAt)}
            </p>
          </div>

          {/* WhatsApp button */}
          <button onClick={whatsApp}
            className="w-full flex items-center justify-center gap-3 py-3 bg-[#25D366] hover:bg-[#22c35e] text-white rounded-xl font-semibold text-sm transition-colors">
            <MessageCircle size={18} />
            Send via WhatsApp
          </button>

          {/* Message preview */}
          <div className="bg-surface border border-border rounded-xl p-3">
            <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-2">Message Preview</p>
            <div className="bg-[#DCF8C6] rounded-xl p-3 text-xs text-gray-800 leading-relaxed font-sans">
              <p>Dear <strong>{invoice?.partySnapshot?.name || 'Customer'}</strong>,</p>
              <p className="mt-1">Please find your invoice <strong>{invoice?.invoiceNo}</strong> for ₹{Number(invoice?.totals?.grandTotal || 0).toLocaleString('en-IN')}.</p>
              <p className="mt-1 text-blue-600 underline break-all">{shareData.shareUrl}</p>
              <p className="mt-1">Thank you for your business!</p>
            </div>
          </div>

          {/* Revoke link */}
          <div className="flex items-center justify-between pt-1">
            <button onClick={generate} disabled={loading}
              className="text-xs text-muted hover:text-primary flex items-center gap-1.5 transition-colors">
              <RefreshCw size={11} /> Regenerate
            </button>
            <button onClick={revoke} disabled={loading}
              className="text-xs text-danger hover:text-danger/80 flex items-center gap-1.5 transition-colors">
              <Trash2 size={11} /> Revoke Link
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
