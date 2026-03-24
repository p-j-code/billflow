import { useState, useEffect, useCallback } from 'react';
import { hsnApi } from '@/api';
import Topbar from '@/components/layout/Topbar';
import { Badge, EmptyState, PageLoader } from '@/components/ui';
import { Search, Tag, Package, Wrench, ChevronRight, Info } from 'lucide-react';
import clsx from 'clsx';

const RATE_COLOR = {
  0: 'muted', 3: 'blue', 5: 'green', 12: 'amber', 18: 'amber', 28: 'red',
};

const POPULAR = [
  { code: '9988', desc: 'Job work in relation to textile' },
  { code: '7113', desc: 'Jewellery and parts thereof' },
  { code: '6101', desc: 'Overcoats, car-coats, cloaks etc.' },
  { code: '5208', desc: 'Woven fabrics of cotton' },
  { code: '9983', desc: 'Professional, technical and business services' },
  { code: '9954', desc: 'Construction services' },
];

export default function HsnSearchPage() {
  const [query,   setQuery]   = useState('');
  const [type,    setType]    = useState('');
  const [rate,    setRate]    = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rates,   setRates]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [total,    setTotal]    = useState(0);

  useEffect(() => {
    hsnApi.getRates().then(r => setRates(r.data.data.rates)).catch(() => {});
    doSearch(''); // load initial results
  }, []);

  const doSearch = useCallback(async (q) => {
    setLoading(true);
    try {
      const params = { limit: 30 };
      if (q)    params.q    = q;
      if (type) params.type = type;
      if (rate) params.gstRate = rate;
      const { data } = await hsnApi.search(params);
      setResults(data.data.codes);
      setTotal(data.data.pagination.total);
    } catch {}
    finally { setLoading(false); }
  }, [type, rate]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, type, rate, doSearch]);

  return (
    <div className="flex flex-col h-full">
      <Topbar title="HSN / SAC Master" />

      <div className="flex-1 p-6 animate-fade-in">
        <div className="flex gap-5 h-full">

          {/* Left: search + results */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Search bar */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search by HSN code or description (e.g. 9988 or 'embroidery')"
                  className="input-field pl-9"
                  autoFocus
                />
              </div>
              <select value={type} onChange={e => setType(e.target.value)} className="input-field w-36">
                <option value="">All Types</option>
                <option value="goods">Goods (HSN)</option>
                <option value="service">Services (SAC)</option>
              </select>
              <select value={rate} onChange={e => setRate(e.target.value)} className="input-field w-32">
                <option value="">Any Rate</option>
                {rates.map(r => <option key={r} value={r}>{r}% GST</option>)}
              </select>
            </div>

            {/* Popular quick picks */}
            {!query && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-2">Popular Codes</p>
                <div className="flex gap-2 flex-wrap">
                  {POPULAR.map(({ code, desc }) => (
                    <button key={code} onClick={() => setQuery(code)}
                      className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-secondary hover:text-primary hover:border-amber-500/40 transition-all">
                      <Tag size={10} className="text-amber-500" />
                      <span className="font-mono font-bold text-amber-400">{code}</span>
                      <span className="hidden sm:inline">— {desc.slice(0, 28)}{desc.length > 28 ? '…' : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <PageLoader />
                </div>
              ) : results.length === 0 ? (
                <EmptyState icon={Search} title="No codes found" message="Try a different search term or HSN code." />
              ) : (
                <>
                  <div className="px-4 py-2.5 border-b border-border bg-surface flex items-center justify-between">
                    <p className="text-xs text-muted">{results.length} of {total} results</p>
                    <p className="text-xs text-muted">Click a row to see details</p>
                  </div>
                  <div className="divide-y divide-border overflow-y-auto max-h-[calc(100vh-280px)]">
                    {results.map(code => (
                      <div key={code._id}
                        onClick={() => setSelected(selected?._id === code._id ? null : code)}
                        className={clsx('flex items-start gap-4 px-4 py-3 cursor-pointer transition-colors',
                          selected?._id === code._id ? 'bg-amber-500/10 border-l-2 border-amber-500' : 'hover:bg-surface border-l-2 border-transparent'
                        )}>
                        <div className="shrink-0 pt-0.5">
                          {code.type === 'service'
                            ? <Wrench size={14} className="text-info" />
                            : <Package size={14} className="text-success" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono font-bold text-sm text-amber-400">{code.code}</span>
                            <Badge variant={code.type === 'service' ? 'blue' : 'green'} className="text-[10px]">
                              {code.type === 'service' ? 'SAC' : 'HSN'}
                            </Badge>
                          </div>
                          <p className="text-sm text-secondary leading-snug">{code.description}</p>
                          {code.category && (
                            <p className="text-xs text-muted mt-0.5">{code.category}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={clsx('text-sm font-bold font-mono',
                            code.gstRate === 0 ? 'text-muted' :
                            code.gstRate <= 5 ? 'text-success' :
                            code.gstRate <= 12 ? 'text-amber-400' : 'text-danger'
                          )}>
                            {code.gstRate}%
                          </p>
                          <p className="text-[10px] text-muted">GST</p>
                        </div>
                        <ChevronRight size={14} className={clsx('shrink-0 text-muted mt-0.5 transition-transform', selected?._id === code._id && 'rotate-90')} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: detail panel */}
          <div className={clsx('w-72 shrink-0 transition-all duration-200', selected ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
            {selected && (
              <div className="bg-card border border-border rounded-2xl p-5 sticky top-6 animate-slide-up">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted uppercase tracking-wider mb-1">HSN/SAC Code</p>
                    <p className="font-display font-bold text-3xl text-amber-400 font-mono">{selected.code}</p>
                  </div>
                  <Badge variant={selected.type === 'service' ? 'blue' : 'green'}>
                    {selected.type === 'service' ? 'Service' : 'Goods'}
                  </Badge>
                </div>

                <p className="text-sm text-primary leading-relaxed mb-5">{selected.description}</p>

                <div className="divider" />

                {/* Tax breakdown */}
                <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-3">Tax Rates</p>
                <div className="space-y-2">
                  {[
                    ['IGST (Inter-state)', selected.igstRate, 'text-amber-400'],
                    ['CGST (Intra-state)', selected.cgstRate, 'text-blue-400'],
                    ['SGST (Intra-state)', selected.sgstRate, 'text-blue-400'],
                  ].map(([label, rate, color]) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-xs text-secondary">{label}</span>
                      <span className={clsx('text-sm font-bold font-mono', color)}>{rate}%</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 bg-surface border border-border rounded-xl p-3">
                  <p className="text-xs text-muted mb-1">Example on ₹10,000</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-secondary">Taxable</span>
                      <span className="text-primary font-mono">₹10,000</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-secondary">CGST {selected.cgstRate}%</span>
                      <span className="text-primary font-mono">₹{(10000 * selected.cgstRate / 100).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-secondary">SGST {selected.sgstRate}%</span>
                      <span className="text-primary font-mono">₹{(10000 * selected.sgstRate / 100).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold border-t border-border pt-1 mt-1">
                      <span className="text-primary">Total</span>
                      <span className="text-amber-400 font-mono">₹{(10000 * (1 + selected.gstRate / 100)).toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {selected.category && (
                  <div className="mt-4 flex items-start gap-2 text-xs text-muted">
                    <Info size={11} className="mt-0.5 shrink-0" />
                    <span>{selected.category}</span>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
