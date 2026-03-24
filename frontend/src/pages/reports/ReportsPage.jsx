import { exportApi } from '@/api';
function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }
import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectActiveBusiness } from '@/store/slices/businessSlice';
import Topbar from '@/components/layout/Topbar';
import { PageLoader, Badge, EmptyState, StatCard } from '@/components/ui';
import api from '@/api/client';
import {
  BarChart2, TrendingUp, Users, FileText, Download,
  Calendar, Filter, AlertTriangle, CheckCircle,
  ChevronDown, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';

const fmt   = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtI  = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtD  = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

function currentFY() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1;
  const s = m >= 4 ? y : y - 1;
  return `${String(s).slice(2)}-${String(s + 1).slice(2)}`;
}

const FY_OPTIONS = ['25-26', '24-25', '23-24'];


// ─── Export helper ────────────────────────────────────────────────────────────
async function downloadExport(endpoint, params, filename) {
  try {
    const r = await api.get(endpoint, { params, responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  } catch { /* toast handled by caller */ }
}

// ─── Mini Bar Chart (pure CSS) ────────────────────────────────────────────────
function MiniBarChart({ data, valueKey = 'revenue', labelKey = 'month' }) {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => {
        const pct = ((d[valueKey] || 0) / max) * 100;
        const isCurrentMonth = i === new Date().getMonth();
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-2 py-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <p className="font-semibold text-primary">{d[labelKey]}</p>
              <p className="text-amber-400 font-mono">₹{fmtI(d[valueKey])}</p>
            </div>
            <div className="w-full relative" style={{ height: `${Math.max(pct, 2)}%` }}>
              <div className={clsx(
                'absolute inset-0 rounded-t-sm transition-all',
                isCurrentMonth ? 'bg-amber-500' : 'bg-amber-500/30 group-hover:bg-amber-500/60'
              )} />
            </div>
            <span className="text-[9px] text-muted">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sales Register ───────────────────────────────────────────────────────────
function SalesRegister({ fy }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);
  const activeBiz = useSelector(selectActiveBusiness);

  useEffect(() => {
    if (!activeBiz) return;
    setLoading(true);
    api.get('/reports/sales-register', { params: { fy, page, limit: 20 } })
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fy, page, activeBiz]);

  if (loading) return <PageLoader />;
  if (!data)   return null;

  const s = data.summary;
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Invoices', fmtI(s.count), 'blue'],
          ['Taxable Value', `₹${fmt(s.totalTaxable)}`, 'amber'],
          ['Total Tax', `₹${fmt(s.totalTax)}`, 'purple'],
          ['Grand Total', `₹${fmt(s.grandTotal)}`, 'green'],
        ].map(([label, value, color]) => (
          <div key={label} className="stat-card">
            <p className="text-xs text-secondary font-semibold uppercase tracking-wider mb-1">{label}</p>
            <p className={clsx('font-display font-bold text-xl', `text-${color === 'amber' ? 'amber-400' : color === 'green' ? 'success' : color === 'blue' ? 'info' : 'purple-400'}`)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tax breakdown */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-6 flex-wrap">
        <div className="text-center">
          <p className="text-xs text-muted mb-1">CGST</p>
          <p className="font-mono font-bold text-info">₹{fmt(s.totalCgst)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted mb-1">SGST</p>
          <p className="font-mono font-bold text-info">₹{fmt(s.totalSgst)}</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-xs text-muted mb-1">IGST</p>
          <p className="font-mono font-bold text-amber-400">₹{fmt(s.totalIgst)}</p>
        </div>
        <div className="ml-auto text-xs text-muted">FY {fy}</div>
      </div>

      {/* Export button */}
      <div className="flex justify-end">
        <button onClick={async () => { toast('Downloading...', {icon:'⏳'}); await downloadExport('/exports/sales-register', {fy, type}, `Sales_Register_${fy}.csv`); toast.success('Downloaded!'); }}
          className="btn-secondary text-xs flex items-center gap-1.5 py-2">
          <Download size={13}/> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface">
              {['Invoice No.','Party','Date','Taxable','CGST','SGST','IGST','Grand Total','Status'].map(h => (
                <th key={h} className="table-head">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.invoices.length === 0 ? (
              <tr><td colSpan={9}><EmptyState icon={FileText} title="No invoices" message={`No sales invoices for FY ${fy}`} /></td></tr>
            ) : data.invoices.map(inv => (
              <tr key={inv._id} className="table-row text-xs">
                <td className="table-cell font-mono font-bold text-amber-400">{inv.invoiceNo}</td>
                <td className="table-cell font-medium">{inv.partySnapshot?.name}</td>
                <td className="table-cell text-secondary">{fmtD(inv.invoiceDate)}</td>
                <td className="table-cell text-right font-mono">₹{fmt(inv.totals?.taxableValue)}</td>
                <td className="table-cell text-right font-mono text-info">₹{fmt(inv.totals?.totalCgst)}</td>
                <td className="table-cell text-right font-mono text-info">₹{fmt(inv.totals?.totalSgst)}</td>
                <td className="table-cell text-right font-mono text-amber-400">₹{fmt(inv.totals?.totalIgst)}</td>
                <td className="table-cell text-right font-mono font-bold">₹{fmtI(inv.totals?.grandTotal)}</td>
                <td className="table-cell"><Badge variant={inv.status === 'paid' ? 'green' : inv.status === 'draft' ? 'muted' : 'amber'}>{inv.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.pagination?.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">Page {page} of {data.pagination.totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">← Prev</button>
            <button onClick={() => setPage(p => Math.min(data.pagination.totalPages, p+1))} disabled={page===data.pagination.totalPages} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Party Outstanding ────────────────────────────────────────────────────────
function PartyOutstanding() {
  const [data,    setData]    = useState(null);
  const [type,    setType]    = useState('customer');
  const [loading, setLoading] = useState(false);
  const activeBiz = useSelector(selectActiveBusiness);

  useEffect(() => {
    if (!activeBiz) return;
    setLoading(true);
    api.get('/reports/outstanding', { params: { partyType: type } })
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type, activeBiz]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          {[['customer','Customers'],['supplier','Suppliers']].map(([v,l]) => (
            <button key={v} onClick={() => setType(v)}
              className={clsx('px-4 py-1.5 text-xs font-semibold rounded-md transition-all',
                type === v ? 'bg-amber-500 text-canvas' : 'text-secondary')}>
              {l}
            </button>
          ))}
        </div>
        {data && (
          <div className="flex gap-4 ml-auto text-sm">
            <span className="text-muted">Outstanding: <span className="font-bold text-danger">₹{fmtI(data.summary.totalOutstanding)}</span></span>
            <span className="text-muted">Overdue: <span className="font-bold text-danger">₹{fmtI(data.summary.totalOverdue)}</span></span>
          </div>
        )}
      </div>

      {/* Export outstanding */}
      {data && (
        <div className="flex justify-end mb-2">
          <button onClick={async () => { toast('Downloading...', {icon:'⏳'}); await downloadExport('/exports/outstanding', {partyType: type}, `Outstanding_${type}.xlsx`); toast.success('Downloaded!'); }}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2">
            <Download size={13}/> Export Excel
          </button>
        </div>
      )}

      {loading ? <PageLoader /> : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface">
                {['Party', 'Invoices', 'Total Invoiced', 'Paid', 'Outstanding', 'Overdue', 'Oldest Due'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data?.outstanding?.length ? (
                <tr><td colSpan={7}><EmptyState icon={CheckCircle} title="All clear!" message="No outstanding invoices." /></td></tr>
              ) : data.outstanding.map(o => (
                <tr key={o._id} className="table-row">
                  <td className="table-cell font-semibold">{o.partyName}</td>
                  <td className="table-cell text-center">{o.invoiceCount}</td>
                  <td className="table-cell text-right font-mono">₹{fmt(o.totalInvoiced)}</td>
                  <td className="table-cell text-right font-mono text-success">₹{fmt(o.totalPaid)}</td>
                  <td className="table-cell text-right font-mono font-bold text-danger">₹{fmt(o.totalOutstanding)}</td>
                  <td className="table-cell text-right font-mono text-danger">
                    {o.overdueAmount > 0 ? `₹${fmt(o.overdueAmount)}` : '—'}
                  </td>
                  <td className="table-cell text-secondary text-xs">{fmtD(o.oldestDue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── HSN Summary ─────────────────────────────────────────────────────────────
function HsnSummaryReport({ fy }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const activeBiz = useSelector(selectActiveBusiness);

  useEffect(() => {
    if (!activeBiz) return;
    setLoading(true);
    api.get('/reports/hsn-summary', { params: { fy } })
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fy, activeBiz]);

  if (loading) return <PageLoader />;
  if (!data)   return null;

  const g = data.grandTotals;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[['Taxable Value', `₹${fmt(g.taxableValue)}`, 'amber'], ['CGST', `₹${fmt(g.totalCgst)}`, 'blue'], ['SGST', `₹${fmt(g.totalSgst)}`, 'blue'], ['IGST', `₹${fmt(g.totalIgst)}`, 'purple']].map(([l,v,c]) => (
          <div key={l} className="stat-card">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">{l}</p>
            <p className={`font-display font-bold text-lg text-${c === 'amber' ? 'amber-400' : c === 'blue' ? 'info' : 'purple-400'}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface">
              {['HSN/SAC', 'Description', 'Invoices', 'Qty', 'GST Rate', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax'].map(h => (
                <th key={h} className="table-head">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data.summary.length ? (
              <tr><td colSpan={10}><EmptyState icon={FileText} title="No HSN data" message="No invoices with HSN codes for this period." /></td></tr>
            ) : data.summary.map(h => (
              <tr key={h.hsnCode} className="table-row text-xs">
                <td className="table-cell font-mono font-bold text-amber-400">{h.hsnCode}</td>
                <td className="table-cell text-secondary max-w-[180px] truncate">{h.description}</td>
                <td className="table-cell text-center">{h.invoiceCount}</td>
                <td className="table-cell text-center">{fmtI(h.totalQty)}</td>
                <td className="table-cell text-center"><Badge variant="amber">{h.gstRate}%</Badge></td>
                <td className="table-cell text-right font-mono font-bold">₹{fmt(h.taxableValue)}</td>
                <td className="table-cell text-right font-mono text-info">₹{fmt(h.totalCgst)}</td>
                <td className="table-cell text-right font-mono text-info">₹{fmt(h.totalSgst)}</td>
                <td className="table-cell text-right font-mono text-amber-400">₹{fmt(h.totalIgst)}</td>
                <td className="table-cell text-right font-mono font-bold">₹{fmt(h.totalTax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Monthly Revenue ──────────────────────────────────────────────────────────
function MonthlyRevenue({ fy }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const activeBiz = useSelector(selectActiveBusiness);

  useEffect(() => {
    if (!activeBiz) return;
    setLoading(true);
    api.get('/reports/monthly-revenue', { params: { fy } })
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fy, activeBiz]);

  if (loading) return <PageLoader />;
  if (!data)   return null;

  const t = data.totals;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Total Revenue',   `₹${fmtI(t.revenue)}`,     'amber'],
          ['Total Collected', `₹${fmtI(t.collected)}`,   'green'],
          ['Outstanding',     `₹${fmtI(t.outstanding)}`, 'red'],
          ['Invoices',        fmtI(t.count),              'blue'],
        ].map(([l,v,c]) => (
          <div key={l} className="stat-card">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">{l}</p>
            <p className={`font-display font-bold text-xl text-${c === 'amber' ? 'amber-400' : c === 'green' ? 'success' : c === 'red' ? 'danger' : 'info'}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-sm">Monthly Revenue — FY {fy}</h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />Revenue</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-success/40 inline-block" />Collected</span>
          </div>
        </div>
        <MiniBarChart data={data.monthly} valueKey="revenue" labelKey="month" />

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Month','Invoices','Revenue','Tax','Collected','Outstanding'].map(h => (
                  <th key={h} className="py-2 px-3 text-left text-muted font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.monthly.map((m, i) => (
                <tr key={i} className={clsx('border-b border-border/50', m.count > 0 ? '' : 'opacity-40')}>
                  <td className="py-2 px-3 font-semibold">{m.month} '{String(m.year).slice(2)}</td>
                  <td className="py-2 px-3 text-center">{m.count || '—'}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold">{m.revenue ? `₹${fmtI(m.revenue)}` : '—'}</td>
                  <td className="py-2 px-3 text-right font-mono text-info">{m.tax ? `₹${fmtI(m.tax)}` : '—'}</td>
                  <td className="py-2 px-3 text-right font-mono text-success">{m.collected ? `₹${fmtI(m.collected)}` : '—'}</td>
                  <td className={clsx('py-2 px-3 text-right font-mono', m.outstanding > 0 ? 'text-danger' : 'text-muted')}>{m.outstanding ? `₹${fmtI(m.outstanding)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── GSTR-1 Export ────────────────────────────────────────────────────────────
function Gstr1Export({ fy }) {
  const [month,    setMonth]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [preview,  setPreview]  = useState(null);
  const activeBiz = useSelector(selectActiveBusiness);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const r = await api.get('/reports/gstr1', { params: { fy, month: month || undefined } });
      // This returns the file — parse it
      const text = typeof r.data === 'string' ? r.data : JSON.stringify(r.data, null, 2);
      const json = JSON.parse(text);
      setPreview(json);
    } catch {}
    finally { setLoading(false); }
  };

  const downloadJson = () => {
    const a = document.createElement('a');
    const blob = new Blob([JSON.stringify({ ...preview, gstin: activeBiz?.gstin }, null, 2)], { type: 'application/json' });
    a.href = URL.createObjectURL(blob);
    a.download = `GSTR1_${fy}${month ? '_M' + month : ''}.json`;
    a.click();
  };

  const MONTHS = [['4','April'],['5','May'],['6','June'],['7','July'],['8','August'],['9','September'],['10','October'],['11','November'],['12','December'],['1','January'],['2','February'],['3','March']];

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-display font-semibold text-sm mb-3">Generate GSTR-1</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={month} onChange={e => setMonth(e.target.value)} className="input-field w-40">
            <option value="">Full Year (FY {fy})</option>
            {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={loadPreview} disabled={loading} className="btn-secondary flex items-center gap-2">
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <BarChart2 size={13} />}
            Preview
          </button>
          {preview && (
            <button onClick={downloadJson} className="btn-primary flex items-center gap-2">
              <Download size={13} /> Download JSON
            </button>
          )}
        </div>

        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400">
          <strong>GSTIN:</strong> {activeBiz?.gstin || 'Not configured — go to Business Setup'}<br/>
          GSTR-1 JSON is compatible with the GST portal. Upload via <strong>Returns → GSTR-1 → Import JSON</strong>.
        </div>
      </div>

      {preview && (
        <div className="space-y-3">
          {/* Meta summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Total Invoices',   preview._meta?.invoiceCount,              'blue'],
              ['B2B Invoices',     preview._meta?.b2bCount,                  'green'],
              ['B2C Invoices',     preview._meta?.b2cCount,                  'amber'],
              ['Grand Total',      `₹${fmtI(preview._meta?.grandTotal)}`,    'purple'],
            ].map(([l,v,c]) => (
              <div key={l} className="stat-card">
                <p className="text-xs text-muted uppercase mb-1">{l}</p>
                <p className={`font-display font-bold text-xl text-${c === 'blue' ? 'info' : c === 'green' ? 'success' : c === 'amber' ? 'amber-400' : 'purple-400'}`}>{v}</p>
              </div>
            ))}
          </div>

          {/* JSON preview */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">JSON Preview</h4>
              <span className="badge badge-green">GSTR-1 Format</span>
            </div>
            <pre className="text-xs text-secondary font-mono overflow-x-auto max-h-64 bg-surface rounded-lg p-3 border border-border">
              {JSON.stringify({ ...preview, gstin: activeBiz?.gstin }, null, 2).slice(0, 3000)}...
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Reports Page ────────────────────────────────────────────────────────
const TABS = [
  { id: 'monthly',      label: 'Revenue Chart',    icon: BarChart2  },
  { id: 'sales',        label: 'Sales Register',   icon: FileText   },
  { id: 'outstanding',  label: 'Outstanding',      icon: AlertTriangle },
  { id: 'hsn',          label: 'HSN Summary',      icon: TrendingUp },
  { id: 'gstr1',        label: 'GSTR-1 Export',    icon: Download   },
];

export default function ReportsPage() {
  const [tab, setTab] = useState('monthly');
  const [fy,  setFy]  = useState(currentFY());

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Reports & Analytics" />

      <div className="flex-1 p-6 space-y-5 animate-fade-in">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 bg-card border border-border rounded-xl p-1 flex-wrap">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={clsx('flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all',
                  tab === id ? 'bg-amber-500 text-canvas' : 'text-secondary hover:text-primary')}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">Financial Year</label>
            <select value={fy} onChange={e => setFy(e.target.value)} className="input-field w-28 py-2 text-xs">
              {FY_OPTIONS.map(f => <option key={f} value={f}>FY {f}</option>)}
            </select>
          </div>
        </div>

        {/* Tab content */}
        <div className="animate-fade-in">
          {tab === 'monthly'     && <MonthlyRevenue fy={fy} />}
          {tab === 'sales'       && <SalesRegister  fy={fy} />}
          {tab === 'outstanding' && <PartyOutstanding />}
          {tab === 'hsn'         && <HsnSummaryReport fy={fy} />}
          {tab === 'gstr1'       && <Gstr1Export fy={fy} />}
        </div>

        {/* Export strip — available on sales + outstanding tabs */}
        {(tab === 'sales' || tab === 'outstanding') && (
          <div className="flex justify-end pt-2">
            <button
              onClick={async () => {
                try {
                  const fy2 = fy;
                  const res = tab === 'sales'
                    ? await exportApi.salesRegister({ fy: fy2 })
                    : await exportApi.outstanding({ partyType: 'customer' });
                  const ext = res.headers?.['content-type']?.includes('csv') ? 'csv' : 'xlsx';
                  const filename = tab === 'sales' ? `Sales_Register_${fy2}.${ext}` : `Outstanding_${fy2}.${ext}`;
                  downloadBlob(new Blob([res.data]), filename);
                } catch { }
              }}
              className="btn-secondary text-xs flex items-center gap-1.5 py-2"
            >
              <Download size={13} /> Export {tab === 'sales' ? 'Sales Register' : 'Outstanding'} as Excel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
