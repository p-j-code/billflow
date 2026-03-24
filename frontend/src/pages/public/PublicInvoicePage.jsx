import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import InvoicePreview from '@/components/invoice/InvoicePreview';
import { Spinner } from '@/components/ui';
import { Download, AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG = {
  draft:     { icon: Clock,         color: 'text-muted',     label: 'Draft'     },
  sent:      { icon: Clock,         color: 'text-info',      label: 'Pending'   },
  paid:      { icon: CheckCircle,   color: 'text-success',   label: 'Paid'      },
  partial:   { icon: AlertTriangle, color: 'text-amber-400', label: 'Partial'   },
  overdue:   { icon: AlertCircle,   color: 'text-danger',    label: 'Overdue'   },
  cancelled: { icon: AlertCircle,   color: 'text-muted',     label: 'Cancelled' },
};

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }
function fmtD(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

export default function PublicInvoicePage() {
  const { token } = useParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    axios.get(`/api/public/invoice/${token}`)
      .then(r => setData(r.data.data))
      .catch(err => setError(err.response?.data?.message || 'Invoice not found or link expired'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={28} />
        <p className="text-sm text-muted">Loading invoice...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-danger" />
        </div>
        <h1 className="font-display font-bold text-xl text-primary mb-2">Link Unavailable</h1>
        <p className="text-secondary text-sm">{error}</p>
        <p className="text-muted text-xs mt-3">This link may have expired or been revoked by the sender.</p>
      </div>
    </div>
  );

  const { invoice, business } = data;
  const sc = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.sent;
  const StatusIcon = sc.icon;
  const isOverdue = invoice.status !== 'paid' && new Date(invoice.dueDate) < new Date();

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-sm">₹</div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-none">{business.name}</p>
              {business.gstin && <p className="text-xs text-gray-500 font-mono mt-0.5">{business.gstin}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status pill */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              invoice.status === 'paid'
                ? 'bg-green-50 border-green-200 text-green-700'
                : isOverdue
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              <StatusIcon size={12} />
              {isOverdue ? 'Overdue' : sc.label}
            </div>

            <a href={`/api/public/invoice/${token}/pdf`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors">
              <Download size={13} /> Download PDF
            </a>
          </div>
        </div>
      </div>

      {/* Invoice meta strip */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            ['Invoice No.',  <span className="font-mono font-bold text-amber-600">{invoice.invoiceNo}</span>],
            ['Invoice Date', fmtD(invoice.invoiceDate)],
            ['Due Date',     <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>{fmtD(invoice.dueDate)}</span>],
            ['Amount Due',   <span className="font-bold text-gray-900">₹{fmt(invoice.balanceDue)}</span>],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-sm text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        {/* Payment summary if partially paid */}
        {invoice.amountPaid > 0 && invoice.status !== 'paid' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <CheckCircle size={15} className="text-amber-600" />
              <span>₹{fmt(invoice.amountPaid)} received — ₹{fmt(invoice.balanceDue)} remaining</span>
            </div>
            <div className="w-32 h-2 bg-amber-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full"
                style={{ width: `${Math.min(100, (invoice.amountPaid / invoice.totals.grandTotal) * 100)}%` }} />
            </div>
          </div>
        )}

        {invoice.status === 'paid' && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm text-green-800">
            <CheckCircle size={15} className="text-green-600" />
            <span>This invoice has been fully paid. Thank you!</span>
          </div>
        )}

        {/* Invoice preview */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <InvoicePreview
            invoice={invoice}
            invoiceNo={invoice.invoiceNo}
            business={business}
            items={invoice.items}
            totals={invoice.totals}
            party={invoice.partySnapshot}
            taxType={invoice.taxType}
            theme={invoice.pdfTheme || 'traditional'}
          />
        </div>

        {/* Business contact footer */}
        <div className="mt-4 text-center text-xs text-gray-400 pb-8">
          <p>Invoice issued by <strong className="text-gray-600">{business.name}</strong>
            {business.mobile && <> · 📞 {business.mobile}</>}
            {business.email  && <> · ✉ {business.email}</>}
          </p>
          <p className="mt-1">Powered by <span className="font-semibold text-amber-600">BillFlow</span></p>
        </div>
      </div>
    </div>
  );
}
