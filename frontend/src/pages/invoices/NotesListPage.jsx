import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectActiveBusiness } from '@/store/slices/businessSlice';
import Topbar from '@/components/layout/Topbar';
import { Badge, EmptyState, SkeletonRows } from '@/components/ui';
import api from '@/api/client';
import { Plus, FileText, MoreVertical, ArrowRight, CheckCircle, XCircle, Zap } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const NOTE_TYPES = [
  { v: 'credit_note', l: 'Credit Notes',    color: 'blue',   badge: 'badge-blue'   },
  { v: 'debit_note',  l: 'Debit Notes',     color: 'orange', badge: 'badge-amber'  },
  { v: 'proforma',    l: 'Proformas',       color: 'purple', badge: 'badge-muted'  },
];

const STATUS_BADGE = { draft: 'muted', issued: 'blue', converted: 'green', cancelled: 'muted' };
const REASON_LABELS = {
  sales_return:'Sales Return', purchase_return:'Purchase Return',
  rate_difference:'Rate Diff.', discount:'Discount', damage:'Damage',
  quality_issue:'Quality', overbilling:'Over Billing', underbilling:'Under Billing', other:'Other',
};

const fmt   = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
const fmtD  = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

export default function NotesListPage() {
  const navigate  = useNavigate();
  const activeBiz = useSelector(selectActiveBusiness);

  const [noteType, setNoteType] = useState('credit_note');
  const [notes,    setNotes]    = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading,  setLoading]  = useState(false);
  const [page,     setPage]     = useState(1);
  const [openMenu, setMenu]     = useState(null);

  const load = useCallback(() => {
    if (!activeBiz) return;
    setLoading(true);
    api.get('/notes', { params: { noteType, page, limit: 15 } })
      .then(r => { setNotes(r.data.data.notes); setPagination(r.data.data.pagination); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeBiz, noteType, page]);

  useEffect(() => { load(); }, [load]);

  const handleIssue = async (id) => {
    try { await api.patch(`/notes/${id}/issue`); toast.success('Document issued!'); load(); } catch { toast.error('Failed'); }
    setMenu(null);
  };

  const handleConvert = async (id) => {
    try {
      const r = await api.post(`/notes/${id}/convert`);
      toast.success(`Converted to Invoice ${r.data.data.invoice.invoiceNo}!`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Conversion failed'); }
    setMenu(null);
  };

  const handleCancel = async (id) => {
    try { await api.patch(`/notes/${id}/cancel`); toast.success('Cancelled.'); load(); } catch { toast.error('Failed'); }
    setMenu(null);
  };

  const typeMeta = NOTE_TYPES.find(t => t.v === noteType);

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Credit / Debit Notes & Proformas"
        actions={
          <Link to={`/notes/new?type=${noteType}`} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus size={14} /> New {noteType === 'credit_note' ? 'Credit Note' : noteType === 'debit_note' ? 'Debit Note' : 'Proforma'}
          </Link>
        }
      />

      <div className="flex-1 p-6 space-y-5 animate-fade-in">
        {/* Type switcher */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit">
          {NOTE_TYPES.map(({ v, l }) => (
            <button key={v} onClick={() => { setNoteType(v); setPage(1); }}
              className={clsx('px-4 py-2 text-xs font-semibold rounded-lg transition-all',
                noteType === v ? 'bg-amber-500 text-canvas' : 'text-secondary hover:text-primary')}>
              {l}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="table-head">Number</th>
                <th className="table-head">Party</th>
                <th className="table-head hidden md:table-cell">Date</th>
                {noteType !== 'proforma' && <th className="table-head hidden lg:table-cell">Reason</th>}
                {noteType !== 'proforma' && <th className="table-head hidden lg:table-cell">Ref. Invoice</th>}
                {noteType === 'proforma' && <th className="table-head hidden lg:table-cell">Valid Until</th>}
                <th className="table-head">Status</th>
                <th className="table-head text-right">Amount</th>
                <th className="table-head w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows rows={6} cols={8} /> :
              notes.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState icon={FileText} title={`No ${typeMeta.l.toLowerCase()} yet`}
                    message={noteType === 'proforma' ? 'Create proforma invoices for your customers before billing.' : `Issue ${typeMeta.l.toLowerCase()} against your sales invoices.`}
                    action={<Link to={`/notes/new?type=${noteType}`} className="btn-primary flex items-center gap-2"><Plus size={14}/>Create Now</Link>}
                  />
                </td></tr>
              ) : notes.map(note => (
                <tr key={note._id} className="table-row group cursor-pointer"
                  onClick={() => navigate(`/notes/new?type=${note.noteType}`)}>
                  <td className="table-cell">
                    <span className="font-mono font-bold text-amber-400 text-sm">{note.noteNo}</span>
                  </td>
                  <td className="table-cell">
                    <p className="font-semibold text-sm">{note.partySnapshot?.name}</p>
                    {note.partySnapshot?.gstin && <p className="text-xs text-muted font-mono">{note.partySnapshot.gstin.slice(0,10)}...</p>}
                  </td>
                  <td className="table-cell hidden md:table-cell text-secondary text-xs">{fmtD(note.noteDate)}</td>
                  {noteType !== 'proforma' && (
                    <td className="table-cell hidden lg:table-cell">
                      <Badge variant="muted">{REASON_LABELS[note.reason] || note.reason}</Badge>
                    </td>
                  )}
                  {noteType !== 'proforma' && (
                    <td className="table-cell hidden lg:table-cell">
                      {note.originalInvoiceNo
                        ? <span className="font-mono text-xs text-amber-400">{note.originalInvoiceNo}</span>
                        : <span className="text-muted text-xs">—</span>}
                    </td>
                  )}
                  {noteType === 'proforma' && (
                    <td className="table-cell hidden lg:table-cell text-secondary text-xs">
                      {note.convertedToInvoiceId
                        ? <span className="text-success text-xs flex items-center gap-1"><CheckCircle size={11}/>Converted</span>
                        : fmtD(note.validUntil)}
                    </td>
                  )}
                  <td className="table-cell">
                    <Badge variant={STATUS_BADGE[note.status]}>{note.status}</Badge>
                  </td>
                  <td className="table-cell text-right font-mono font-bold">₹{fmt(note.totals?.grandTotal)}</td>
                  <td className="table-cell" onClick={e => e.stopPropagation()}>
                    <div className="relative">
                      <button onClick={() => setMenu(openMenu === note._id ? null : note._id)}
                        className="p-1.5 text-muted hover:text-primary hover:bg-border rounded-lg opacity-0 group-hover:opacity-100">
                        <MoreVertical size={14} />
                      </button>
                      {openMenu === note._id && (
                        <div className="absolute right-0 top-8 z-30 bg-card border border-border rounded-xl shadow-modal w-40 py-1 animate-slide-up"
                          onMouseLeave={() => setMenu(null)}>
                          {note.status === 'draft' && (
                            <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-success hover:bg-success/10"
                              onClick={() => handleIssue(note._id)}>
                              <CheckCircle size={13} /> Issue
                            </button>
                          )}
                          {noteType === 'proforma' && note.status !== 'converted' && note.status !== 'cancelled' && (
                            <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10"
                              onClick={() => handleConvert(note._id)}>
                              <Zap size={13} /> Convert to Invoice
                            </button>
                          )}
                          {note.status !== 'converted' && note.status !== 'cancelled' && (
                            <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger/10"
                              onClick={() => handleCancel(note._id)}>
                              <XCircle size={13} /> Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination?.totalPages > 1 && (
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted">Page {page} of {pagination.totalPages} · {pagination.total} total</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages,p+1))} disabled={page===pagination.totalPages} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
