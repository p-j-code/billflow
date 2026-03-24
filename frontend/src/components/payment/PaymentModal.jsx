import { useState } from 'react';
import { Modal, FormField, Input, Select, Spinner } from '@/components/ui';
import { invoiceApi } from '@/api';
import toast from 'react-hot-toast';
import { Banknote, Smartphone, Building, FileText, Clock, CheckCircle } from 'lucide-react';

const MODE_ICONS = { cash: Banknote, upi: Smartphone, neft: Building, rtgs: Building, cheque: FileText, credit: Clock };
const MODE_COLORS = { cash: 'text-green-400', upi: 'text-blue-400', neft: 'text-purple-400', rtgs: 'text-purple-400', cheque: 'text-amber-400', credit: 'text-orange-400' };

function today() { return new Date().toISOString().slice(0, 10); }
function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

export default function PaymentModal({ open, onClose, invoice, onSuccess }) {
  const [form, setForm] = useState({
    amount: '', mode: 'cash', paymentDate: today(),
    reference: '', bankName: '', notes: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const balanceDue = invoice?.balanceDue || 0;

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (Number(form.amount) > balanceDue) { toast.error(`Amount exceeds balance due ₹${fmt(balanceDue)}`); return; }

    setLoading(true);
    try {
      await invoiceApi.recordPayment({ invoiceId: invoice._id, ...form, amount: Number(form.amount) });
      toast.success('Payment recorded!');
      onSuccess?.();
      onClose();
      setForm({ amount: '', mode: 'cash', paymentDate: today(), reference: '', bankName: '', notes: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally { setLoading(false); }
  };

  const needsRef  = ['upi', 'neft', 'rtgs'].includes(form.mode);
  const needsBank = ['neft', 'rtgs', 'cheque'].includes(form.mode);

  return (
    <Modal open={open} onClose={onClose} title="Record Payment" size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex items-center gap-2" onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner size={13} /> : <CheckCircle size={13} />}
            Record Payment
          </button>
        </>
      }
    >
      {invoice && (
        <div className="bg-surface border border-border rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Invoice</p>
              <p className="font-mono font-bold text-amber-400">{invoice.invoiceNo}</p>
              <p className="text-xs text-secondary">{invoice.partySnapshot?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">Balance Due</p>
              <p className="font-display font-bold text-lg text-danger">₹{fmt(balanceDue)}</p>
              {invoice.amountPaid > 0 && (
                <p className="text-xs text-success">₹{fmt(invoice.amountPaid)} paid</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Amount with quick-fill */}
        <FormField label="Amount (₹)" required>
          <div className="space-y-2">
            <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
              placeholder={`Max ₹${fmt(balanceDue)}`} min={0.01} step={0.01} />
            <div className="flex gap-2">
              {[25, 50, 100].map(pct => (
                <button key={pct} onClick={() => set('amount', Math.round(balanceDue * pct / 100))}
                  className="flex-1 py-1 text-xs bg-surface border border-border rounded-lg text-secondary hover:text-amber-400 hover:border-amber-500/40 transition-colors">
                  {pct}%
                </button>
              ))}
              <button onClick={() => set('amount', balanceDue)}
                className="flex-1 py-1 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-colors font-semibold">
                Full
              </button>
            </div>
          </div>
        </FormField>

        {/* Payment Mode */}
        <FormField label="Payment Mode" required>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['cash', 'Cash'], ['upi', 'UPI / QR'],
              ['neft', 'NEFT'], ['rtgs', 'RTGS'],
              ['cheque', 'Cheque'], ['credit', 'Credit'],
            ].map(([v, l]) => {
              const Icon = MODE_ICONS[v];
              const isSelected = form.mode === v;
              return (
                <button key={v} onClick={() => set('mode', v)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                      : 'bg-surface border-border text-secondary hover:border-borderLight'
                  }`}>
                  <Icon size={15} className={isSelected ? 'text-amber-500' : MODE_COLORS[v]} />
                  {l}
                </button>
              );
            })}
          </div>
        </FormField>

        <FormField label="Payment Date">
          <Input type="date" value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)} />
        </FormField>

        {needsRef && (
          <FormField label={form.mode === 'upi' ? 'UPI Transaction ID' : 'UTR / Reference No.'}>
            <Input value={form.reference} onChange={e => set('reference', e.target.value)}
              placeholder={form.mode === 'upi' ? 'T2503231234567...' : 'HDFC2503231234'} className="font-mono" />
          </FormField>
        )}

        {form.mode === 'cheque' && (
          <>
            <FormField label="Cheque Number">
              <Input value={form.reference} onChange={e => set('reference', e.target.value)}
                placeholder="001234" className="font-mono" />
            </FormField>
            <FormField label="Bank Name">
              <Input value={form.bankName} onChange={e => set('bankName', e.target.value)}
                placeholder="Bank of Baroda" />
            </FormField>
          </>
        )}

        {needsBank && form.mode !== 'cheque' && (
          <FormField label="Bank / Branch">
            <Input value={form.bankName} onChange={e => set('bankName', e.target.value)}
              placeholder="HDFC Bank, Andheri" />
          </FormField>
        )}

        {form.mode === 'credit' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-400">
            Credit payment records the amount as paid now on credit terms. The invoice will be marked as paid.
          </div>
        )}

        <FormField label="Notes">
          <Input value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Optional note..." />
        </FormField>
      </div>
    </Modal>
  );
}
