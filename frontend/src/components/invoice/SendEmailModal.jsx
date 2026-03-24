import { useState } from 'react';
import { Modal, FormField, Input, Spinner } from '@/components/ui';
import api from '@/api/client';
import { Mail, Send, Check, Link } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SendEmailModal({ open, onClose, invoice }) {
  const [form, setForm] = useState({
    to: invoice?.partySnapshot?.email || '',
    cc: '',
    subject: '',
    includeShareLink: true,
  });
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const hasShareLink = !!invoice?.shareToken;

  const handleSend = async () => {
    if (!form.to.trim()) { toast.error('Recipient email required'); return; }
    setLoading(true);
    try {
      await api.post(`/invoices/${invoice._id}/send-email`, {
        to:               form.to.trim(),
        cc:               form.cc.trim() || undefined,
        subject:          form.subject.trim() || undefined,
        includeShareLink: form.includeShareLink,
      });
      setSent(true);
      toast.success(`Invoice emailed to ${form.to}`);
      setTimeout(() => { setSent(false); onClose(); }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Email failed. Check your email config in .env');
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Send Invoice by Email" size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-primary flex items-center gap-2" onClick={handleSend} disabled={loading || sent}>
            {sent ? <><Check size={13}/> Sent!</> : loading ? <><Spinner size={13}/> Sending...</> : <><Send size={13}/> Send Email</>}
          </button>
        </>
      }>

      {/* Invoice chip */}
      {invoice && (
        <div className="bg-surface border border-border rounded-xl p-3 mb-5 flex items-center justify-between">
          <div>
            <p className="font-mono font-bold text-amber-400 text-sm">{invoice.invoiceNo}</p>
            <p className="text-xs text-secondary">{invoice.partySnapshot?.name}</p>
          </div>
          <p className="font-bold text-primary">₹{Number(invoice.totals?.grandTotal||0).toLocaleString('en-IN')}</p>
        </div>
      )}

      <div className="space-y-4">
        <FormField label="To (Recipient Email)" required>
          <Input type="email" value={form.to} onChange={e => set('to', e.target.value)}
            placeholder="customer@example.com" autoFocus />
        </FormField>
        <FormField label="CC" hint="Optional — separate multiple with commas">
          <Input type="text" value={form.cc} onChange={e => set('cc', e.target.value)}
            placeholder="accounts@example.com" />
        </FormField>
        <FormField label="Subject" hint="Leave blank to use default subject">
          <Input value={form.subject} onChange={e => set('subject', e.target.value)}
            placeholder={`Invoice ${invoice?.invoiceNo} from Your Business`} />
        </FormField>

        {/* Share link toggle */}
        <label className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl cursor-pointer hover:border-borderLight transition-colors">
          <div className="flex items-center gap-2.5">
            <Link size={14} className="text-amber-500" />
            <div>
              <p className="text-sm font-medium text-primary">Include view link</p>
              <p className="text-xs text-muted">
                {hasShareLink ? 'Share link will be included in email' : 'Generate a share link first to include it'}
              </p>
            </div>
          </div>
          <div className={`w-10 h-5 rounded-full border transition-all cursor-pointer relative ${
            form.includeShareLink && hasShareLink ? 'bg-amber-500 border-amber-600' : 'bg-surface border-border'
          }`} onClick={() => hasShareLink && set('includeShareLink', !form.includeShareLink)}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              form.includeShareLink && hasShareLink ? 'translate-x-4.5' : 'translate-x-0.5'
            }`} />
          </div>
        </label>

        {!hasShareLink && (
          <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            Tip: Generate a share link in the invoice view for a "View Invoice" button in the email.
          </p>
        )}

        <div className="bg-info/10 border border-info/30 rounded-lg px-3 py-2 text-xs text-info">
          Email requires <strong>RESEND_API_KEY</strong> or <strong>SMTP_HOST</strong> in your .env file.
        </div>
      </div>
    </Modal>
  );
}
