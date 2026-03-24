import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectActiveBusiness } from '@/store/slices/businessSlice';
import { partyApi, invoiceApi, paymentApi } from '@/api';
import { Badge, Spinner, EmptyState } from '@/components/ui';
import Topbar from '@/components/layout/Topbar';
import {
  ArrowLeft, TrendingUp, TrendingDown, Clock,
  Receipt, CreditCard, FileText, AlertTriangle,
  Phone, Mail, Building, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const fmt  = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtI = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_BADGE = {
  draft: 'muted', sent: 'blue', paid: 'green',
  partial: 'amber', overdue: 'red', cancelled: 'muted',
};

export default function PartyLedgerPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const activeBiz = useSelector(selectActiveBusiness);

  const [party,    setParty]    = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('ledger'); // ledger | invoices | payments

  const load = useCallback(async () => {
    try {
      const [partyRes, invRes, payRes] = await Promise.all([
        partyApi.get(id),
        invoiceApi.list({ partyId: id, limit: 100 }),
        paymentApi.list({ partyId: id, limit: 100 }),
      ]);
      setParty(partyRes.data.data.party);
      setInvoices(invRes.data.data.invoices);
      setPayments(payRes.data.data.payments);
    } catch { navigate('/parties'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner size={28} /></div>;
  if (!party)  return null;

  // Build merged ledger entries sorted by date
  const ledgerEntries = [
    ...invoices.map(inv => ({
      type: 'invoice',
      date: inv.invoiceDate,
      label: `Invoice ${inv.invoiceNo}`,
      debit:  inv.invoiceType === 'sale'     ? inv.totals?.grandTotal : 0,
      credit: inv.invoiceType === 'purchase' ? inv.totals?.grandTotal : 0,
      status: inv.status,
      id: inv._id,
      ref: inv,
    })),
    ...payments.map(pay => ({
      type: 'payment',
      date: pay.paymentDate,
      label: `Payment — ${pay.mode.toUpperCase()}${pay.reference ? ` (${pay.reference})` : ''}`,
      debit:  0,
      credit: pay.amount,
      status: 'paid',
      id: pay._id,
      ref: pay,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Running balance
  let running = 0;
  const ledgerWithBalance = ledgerEntries.map(entry => {
    running += (entry.debit - entry.credit);
    return { ...entry, balance: running };
  });

  // Summary stats
  const totalInvoiced  = invoices.filter(i => i.invoiceType === 'sale').reduce((s, i) => s + (i.totals?.grandTotal || 0), 0);
  const totalPaid      = payments.reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = invoices.filter(i => ['sent','partial','overdue'].includes(i.status)).reduce((s, i) => s + (i.balanceDue || 0), 0);
  const overdueAmt     = invoices.filter(i => ['sent','partial'].includes(i.status) && new Date(i.dueDate) < new Date()).reduce((s, i) => s + (i.balanceDue || 0), 0);

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/parties')} className="btn-ghost p-1 text-muted">
              <ArrowLeft size={15} />
            </button>
            <span>{party.name}</span>
            <Badge variant={party.type === 'customer' ? 'blue' : party.type === 'supplier' ? 'green' : 'amber'}>
              {party.type}
            </Badge>
          </div>
        }
        actions={
          <Link to={`/invoices/new`} className="btn-primary text-xs flex items-center gap-1.5 py-2">
            <Receipt size={13} /> New Invoice
          </Link>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT sidebar: Party info ── */}
        <div className="w-72 shrink-0 border-r border-border overflow-y-auto bg-surface">
          {/* Avatar + name */}
          <div className="p-5 border-b border-border">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-display font-bold text-xl shrink-0">
                {party.name.charAt(0)}
              </div>
              <div>
                <p className="font-display font-bold text-primary">{party.name}</p>
                {party.displayName && party.displayName !== party.name && (
                  <p className="text-xs text-muted">{party.displayName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              {party.gstin && (
                <div className="flex items-center gap-2 text-xs">
                  <FileText size={12} className="text-muted shrink-0" />
                  <span className="font-mono text-secondary">{party.gstin}</span>
                </div>
              )}
              {party.mobile && (
                <div className="flex items-center gap-2 text-xs">
                  <Phone size={12} className="text-muted shrink-0" />
                  <span className="text-secondary">{party.mobile}</span>
                </div>
              )}
              {party.email && (
                <div className="flex items-center gap-2 text-xs">
                  <Mail size={12} className="text-muted shrink-0" />
                  <span className="text-secondary truncate">{party.email}</span>
                </div>
              )}
              {party.address?.city && (
                <div className="flex items-center gap-2 text-xs">
                  <Building size={12} className="text-muted shrink-0" />
                  <span className="text-secondary">{[party.address.city, party.address.state].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial summary cards */}
          <div className="p-4 space-y-3">
            <p className="text-xs text-muted uppercase tracking-wider font-semibold">Account Summary</p>

            {[
              { label: 'Total Invoiced', value: `₹${fmtI(totalInvoiced)}`, icon: Receipt,       color: 'text-primary',    bg: 'bg-border'          },
              { label: 'Total Received', value: `₹${fmtI(totalPaid)}`,    icon: TrendingDown,    color: 'text-success',    bg: 'bg-success/10'      },
              { label: 'Outstanding',    value: `₹${fmtI(totalOutstanding)}`, icon: Clock,       color: 'text-amber-400',  bg: 'bg-amber-500/10'    },
              { label: 'Overdue',        value: `₹${fmtI(overdueAmt)}`,   icon: AlertTriangle,   color: 'text-danger',     bg: 'bg-danger/10'       },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={clsx('flex items-center justify-between p-3 rounded-xl border border-border', bg)}>
                <div className="flex items-center gap-2.5">
                  <Icon size={14} className={color} />
                  <span className="text-xs text-secondary">{label}</span>
                </div>
                <span className={clsx('text-sm font-bold font-mono', color)}>{value}</span>
              </div>
            ))}
          </div>

          {/* Credit info */}
          {(party.creditLimit > 0 || party.creditDays > 0) && (
            <div className="px-4 pb-4">
              <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-3">Credit Terms</p>
              <div className="bg-card border border-border rounded-xl p-3 space-y-2">
                {party.creditDays > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Credit Days</span>
                    <span className="font-semibold">{party.creditDays} days</span>
                  </div>
                )}
                {party.creditLimit > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Credit Limit</span>
                    <span className="font-semibold">₹{fmtI(party.creditLimit)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Tabs ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border bg-surface shrink-0">
            {[
              { id: 'ledger',   label: `Ledger (${ledgerWithBalance.length})` },
              { id: 'invoices', label: `Invoices (${invoices.length})`        },
              { id: 'payments', label: `Payments (${payments.length})`        },
            ].map(({ id: tid, label }) => (
              <button key={tid} onClick={() => setTab(tid)}
                className={clsx(
                  'px-5 py-3 text-sm font-medium border-b-2 transition-all',
                  tab === tid ? 'border-amber-500 text-amber-400' : 'border-transparent text-secondary hover:text-primary'
                )}>
                {label}
              </button>
            ))}
          </div>

          {/* Ledger tab */}
          {tab === 'ledger' && (
            <div className="flex-1 overflow-y-auto p-5">
              {ledgerWithBalance.length === 0 ? (
                <EmptyState icon={FileText} title="No transactions" message="No invoices or payments recorded for this party." />
              ) : (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-surface">
                        <th className="table-head">Date</th>
                        <th className="table-head">Description</th>
                        <th className="table-head hidden md:table-cell">Type</th>
                        <th className="table-head text-right">Debit (You owe)</th>
                        <th className="table-head text-right">Credit (They owe)</th>
                        <th className="table-head text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerWithBalance.map((entry, i) => (
                        <tr key={i} className={clsx('table-row text-xs', entry.type === 'payment' && 'bg-success/5')}>
                          <td className="table-cell text-secondary whitespace-nowrap">{fmtD(entry.date)}</td>
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              {entry.type === 'invoice'
                                ? <Receipt size={12} className="text-amber-500 shrink-0" />
                                : <CreditCard size={12} className="text-success shrink-0" />}
                              <span className="font-medium">{entry.label}</span>
                            </div>
                          </td>
                          <td className="table-cell hidden md:table-cell">
                            {entry.type === 'invoice'
                              ? <Badge variant={STATUS_BADGE[entry.status]}>{entry.status}</Badge>
                              : <Badge variant="green">Payment</Badge>}
                          </td>
                          <td className="table-cell text-right font-mono">
                            {entry.debit > 0 ? <span className="text-primary font-semibold">₹{fmt(entry.debit)}</span> : <span className="text-muted">—</span>}
                          </td>
                          <td className="table-cell text-right font-mono">
                            {entry.credit > 0 ? <span className="text-success font-semibold">₹{fmt(entry.credit)}</span> : <span className="text-muted">—</span>}
                          </td>
                          <td className="table-cell text-right font-mono">
                            <span className={clsx('font-bold', entry.balance > 0 ? 'text-danger' : entry.balance < 0 ? 'text-success' : 'text-muted')}>
                              ₹{fmt(Math.abs(entry.balance))}
                              <span className="text-[10px] font-normal ml-1">
                                {entry.balance > 0 ? 'DR' : entry.balance < 0 ? 'CR' : ''}
                              </span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-surface font-bold text-sm">
                        <td colSpan={3} className="table-cell">Closing Balance</td>
                        <td className="table-cell text-right font-mono text-primary">
                          ₹{fmt(ledgerWithBalance.reduce((s, e) => s + e.debit, 0))}
                        </td>
                        <td className="table-cell text-right font-mono text-success">
                          ₹{fmt(ledgerWithBalance.reduce((s, e) => s + e.credit, 0))}
                        </td>
                        <td className="table-cell text-right font-mono">
                          {(() => {
                            const bal = ledgerWithBalance[ledgerWithBalance.length - 1]?.balance || 0;
                            return (
                              <span className={clsx('font-bold', bal > 0 ? 'text-danger' : bal < 0 ? 'text-success' : 'text-muted')}>
                                ₹{fmt(Math.abs(bal))} {bal > 0 ? 'DR' : bal < 0 ? 'CR' : ''}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Invoices tab */}
          {tab === 'invoices' && (
            <div className="flex-1 overflow-y-auto p-5">
              {invoices.length === 0 ? (
                <EmptyState icon={Receipt} title="No invoices" message="No invoices linked to this party."
                  action={<Link to="/invoices/new" className="btn-primary flex items-center gap-2"><Receipt size={14}/>New Invoice</Link>} />
              ) : (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-surface">
                        {['Invoice No.', 'Date', 'Due Date', 'Status', 'Amount', 'Balance'].map(h => (
                          <th key={h} className="table-head">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(inv => (
                        <tr key={inv._id} className="table-row cursor-pointer"
                          onClick={() => navigate(`/invoices/${inv._id}`)}>
                          <td className="table-cell font-mono font-bold text-amber-400">{inv.invoiceNo}</td>
                          <td className="table-cell text-xs text-secondary">{fmtD(inv.invoiceDate)}</td>
                          <td className="table-cell text-xs">
                            <span className={clsx(new Date(inv.dueDate) < new Date() && inv.status !== 'paid' ? 'text-danger font-semibold' : 'text-secondary')}>
                              {fmtD(inv.dueDate)}
                            </span>
                          </td>
                          <td className="table-cell">
                            <Badge variant={STATUS_BADGE[inv.status]}>{inv.status}</Badge>
                          </td>
                          <td className="table-cell text-right font-mono font-bold">₹{fmtI(inv.totals?.grandTotal)}</td>
                          <td className="table-cell text-right font-mono">
                            <span className={inv.balanceDue > 0 ? 'text-danger font-bold' : 'text-success'}>
                              ₹{fmt(inv.balanceDue)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Payments tab */}
          {tab === 'payments' && (
            <div className="flex-1 overflow-y-auto p-5">
              {payments.length === 0 ? (
                <EmptyState icon={CreditCard} title="No payments" message="No payment records for this party." />
              ) : (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-surface">
                        {['Date', 'Invoice', 'Mode', 'Reference', 'Amount'].map(h => (
                          <th key={h} className="table-head">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(pay => (
                        <tr key={pay._id} className="table-row text-xs">
                          <td className="table-cell text-secondary">{fmtD(pay.paymentDate)}</td>
                          <td className="table-cell font-mono text-amber-400">{pay.invoiceNo || '—'}</td>
                          <td className="table-cell capitalize">
                            <Badge variant="green">{pay.mode}</Badge>
                          </td>
                          <td className="table-cell font-mono text-muted">{pay.reference || '—'}</td>
                          <td className="table-cell text-right font-mono font-bold text-success">
                            ₹{fmt(pay.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-surface font-bold">
                        <td colSpan={4} className="table-cell text-sm">Total Received</td>
                        <td className="table-cell text-right font-mono text-success">
                          ₹{fmt(payments.reduce((s, p) => s + p.amount, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
