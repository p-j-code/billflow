import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { selectUser } from '@/store/slices/authSlice';
import { selectActiveBusiness } from '@/store/slices/businessSlice';
import api from '@/api/client';
import Topbar from '@/components/layout/Topbar';
import BusinessSwitcherModal from '@/components/dashboard/BusinessSwitcherModal';
import { StatCard, PageLoader } from '@/components/ui';
import {
  TrendingUp, TrendingDown, Users, Receipt,
  AlertTriangle, CheckCircle, Plus, FileText,
  Search, Building2, BarChart2, ArrowRight,
  ChevronDown, Zap, CreditCard,
} from 'lucide-react';
import clsx from 'clsx';

const fmt  = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

function currentFY() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1;
  const s = m >= 4 ? y : y - 1;
  return `${String(s).slice(2)}-${String(s + 1).slice(2)}`;
}

// Pure CSS bar chart
function RevenueChart({ monthly }) {
  if (!monthly?.length) return null;
  const max = Math.max(...monthly.map(m => m.revenue), 1);
  const currentMonthIdx = (() => {
    const m = new Date().getMonth();
    // Apr=0, May=1...Mar=11
    return m >= 3 ? m - 3 : m + 9;
  })();

  return (
    <div className="flex items-end gap-1.5 h-28 mt-2">
      {monthly.map((m, i) => {
        const pct = (m.revenue / max) * 100;
        const isCurrent = i === currentMonthIdx;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-2 py-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity shadow-modal">
              <p className="font-semibold text-primary text-center">{m.month}</p>
              <p className="text-amber-400 font-mono text-center">₹{fmt(m.revenue)}</p>
              {m.outstanding > 0 && <p className="text-danger text-center">Due: ₹{fmt(m.outstanding)}</p>}
            </div>
            <div className="w-full relative" style={{ height: `${Math.max(pct, 2)}%` }}>
              <div className={clsx(
                'absolute inset-0 rounded-t-md transition-all duration-500',
                isCurrent
                  ? 'bg-amber-500'
                  : m.revenue > 0
                    ? 'bg-amber-500/25 group-hover:bg-amber-500/50'
                    : 'bg-border'
              )} />
            </div>
            <span className="text-[8px] text-muted leading-none">{m.month.slice(0,3)}</span>
          </div>
        );
      })}
    </div>
  );
}

// Mini donut-style gauge for collection rate
function CollectionGauge({ pct }) {
  const clampedPct = Math.min(100, Math.max(0, pct || 0));
  const circumference = 2 * Math.PI * 28;
  const strokeDash = (clampedPct / 100) * circumference;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r="28" fill="none" stroke="#1E2535" strokeWidth="8" />
        <circle cx="40" cy="40" r="28" fill="none"
          stroke={clampedPct >= 80 ? '#10B981' : clampedPct >= 50 ? '#F59E0B' : '#EF4444'}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${strokeDash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-display font-bold text-base leading-none text-primary">{Math.round(clampedPct)}%</p>
        <p className="text-[9px] text-muted mt-0.5">collected</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user      = useSelector(selectUser);
  const activeBiz = useSelector(selectActiveBusiness);
  const navigate  = useNavigate();

  const [summary,  setSummary]  = useState(null);
  const [monthly,  setMonthly]  = useState([]);
  const [recent,   setRecent]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    if (!activeBiz) { setLoading(false); return; }
    Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/monthly-revenue', { params: { fy: currentFY() } }),
      api.get('/invoices', { params: { type: 'sale', limit: 5, page: 1 } }),
    ])
      .then(([sumRes, monRes, invRes]) => {
        setSummary(sumRes.data.data);
        setMonthly(monRes.data.data.monthly || []);
        setRecent(invRes.data.data.invoices || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeBiz]);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const collectionRate = summary?.revenue?.thisYear > 0
    ? (summary.payments?.total / summary.revenue.thisYear) * 100
    : 0;

  const STATUS_COLOR = { draft:'text-muted', sent:'text-info', paid:'text-success', partial:'text-amber-400', overdue:'text-danger' };

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Dashboard" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-fade-in">

        {/* Greeting + business switcher */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-display font-bold text-xl text-primary">
              {greeting()}, {user?.name?.split(' ')[0]} 👋
            </h2>
            <p className="text-sm text-secondary mt-0.5">
              FY {currentFY()} · {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
            </p>
          </div>
          {activeBiz && (
            <button onClick={() => setSwitcherOpen(true)}
              className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-4 py-2.5 hover:border-amber-500/40 transition-all group">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-sm">
                {activeBiz.name.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-primary truncate max-w-[140px]">{activeBiz.name}</p>
                {activeBiz.gstin && <p className="text-[10px] text-muted font-mono">{activeBiz.gstin.slice(0,10)}...</p>}
              </div>
              <ChevronDown size={13} className="text-muted group-hover:text-amber-500 transition-colors" />
            </button>
          )}
        </div>

        {/* No business banner */}
        {!activeBiz && !loading && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Building2 size={22} className="text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold text-primary mb-1">Set up your first business</p>
              <p className="text-sm text-secondary">Add your GSTIN and company details to start creating invoices.</p>
            </div>
            <Link to="/business" className="btn-primary shrink-0 flex items-center gap-2">
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {loading ? <PageLoader /> : (
          <>
            {/* KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="This Month Sales"
                value={`₹${fmt(summary?.invoices?.thisMonth?.total)}`}
                sub={`${summary?.invoices?.thisMonth?.count || 0} invoices`}
                icon={TrendingUp} color="green"
              />
              <StatCard
                label="Outstanding"
                value={`₹${fmt(summary?.invoices?.outstanding?.total)}`}
                sub={`${summary?.invoices?.outstanding?.count || 0} invoices`}
                icon={CreditCard} color="amber"
              />
              <StatCard
                label="Overdue"
                value={`₹${fmt(summary?.invoices?.overdue?.total)}`}
                sub={`${summary?.invoices?.overdue?.count || 0} invoices`}
                icon={AlertTriangle} color="red"
              />
              <StatCard
                label="Year Revenue"
                value={`₹${fmt(summary?.revenue?.thisYear)}`}
                sub={`FY ${currentFY()}`}
                icon={BarChart2} color="blue"
              />
            </div>

            {/* Chart + Collection rate */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Revenue chart */}
              <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-display font-semibold text-sm">Monthly Revenue</h3>
                  <span className="text-xs text-muted">FY {currentFY()}</span>
                </div>
                <p className="text-xs text-muted mb-3">
                  Total: <span className="text-amber-400 font-semibold">
                    ₹{fmt(monthly.reduce((s,m) => s + m.revenue, 0))}
                  </span>
                </p>
                <RevenueChart monthly={monthly} />
              </div>

              {/* Collection gauge + quick stats */}
              <div className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between">
                <h3 className="font-display font-semibold text-sm mb-3">Collection Rate</h3>
                <div className="flex items-center justify-between">
                  <CollectionGauge pct={collectionRate} />
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted">Invoiced</p>
                      <p className="font-mono font-bold text-sm text-primary">₹{fmt(summary?.revenue?.thisYear)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Collected</p>
                      <p className="font-mono font-bold text-sm text-success">₹{fmt(summary?.payments?.total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Pending</p>
                      <p className="font-mono font-bold text-sm text-danger">
                        ₹{fmt((summary?.invoices?.outstanding?.total || 0))}
                      </p>
                    </div>
                  </div>
                </div>
                <Link to="/reports" className="btn-secondary text-xs flex items-center justify-center gap-1.5 mt-4">
                  <BarChart2 size={12} /> Full Reports
                </Link>
              </div>
            </div>

            {/* Quick actions + Recent invoices */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Quick actions */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-display font-semibold text-sm mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  {[
                    { label: 'New Invoice',   icon: Plus,     to: '/invoices/new',           color: 'text-amber-500',  bg: 'bg-amber-500/10' },
                    { label: 'Add Party',     icon: Users,    to: '/parties?action=new',     color: 'text-info',       bg: 'bg-info/10'      },
                    { label: 'New Credit Note',icon: FileText, to: '/notes/new?type=credit_note', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Search HSN',    icon: Search,   to: '/hsn',                    color: 'text-purple-400', bg: 'bg-purple-500/10'},
                    { label: 'Reports',       icon: BarChart2,to: '/reports',                color: 'text-success',    bg: 'bg-success/10'   },
                  ].map(({ label, icon: Icon, to, color, bg }) => (
                    <Link key={label} to={to}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface transition-colors group">
                      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg)}>
                        <Icon size={14} className={color} />
                      </div>
                      <span className="text-sm text-secondary group-hover:text-primary transition-colors">{label}</span>
                      <ArrowRight size={12} className="text-muted ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent invoices */}
              <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-sm">Recent Invoices</h3>
                  <Link to="/invoices" className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1">
                    View all <ArrowRight size={11} />
                  </Link>
                </div>
                {recent.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Receipt size={24} className="text-muted mb-2" />
                    <p className="text-sm text-muted">No invoices yet</p>
                    <Link to="/invoices/new" className="btn-primary text-xs flex items-center gap-1.5 mt-3">
                      <Plus size={12} /> Create First Invoice
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recent.map(inv => (
                      <button key={inv._id} onClick={() => navigate(`/invoices/${inv._id}`)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface transition-colors group text-left">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-xs shrink-0">
                          {inv.partySnapshot?.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-bold text-xs text-amber-400">{inv.invoiceNo}</p>
                            <span className={clsx('text-[10px] font-semibold capitalize', STATUS_COLOR[inv.status])}>{inv.status}</span>
                          </div>
                          <p className="text-xs text-secondary truncate">{inv.partySnapshot?.name}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono font-bold text-sm text-primary">₹{fmt(inv.totals?.grandTotal)}</p>
                          <p className="text-[10px] text-muted">{fmtD(inv.invoiceDate)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <BusinessSwitcherModal open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  );
}
