import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createInvoice } from '@/store/slices/invoiceSlice';
import { selectActiveBusiness } from '@/store/slices/businessSlice';
import { partyApi, hsnApi } from '@/api';
import InvoicePreview from '@/components/invoice/InvoicePreview';
import { FormField, Input, Select, Spinner } from '@/components/ui';
import { calcInvoiceTotals, UNITS, GST_RATES } from '@/hooks/useGstCalc';
import {
  Plus, Trash2, Search, ChevronDown, ChevronUp,
  Layers, Eye, Save, ArrowLeft, Zap,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const BLANK_ITEM = {
  description: '', hsnCode: '', lot: '', qty: 1, unit: 'PCS',
  rate: 0, discountPct: 0, taxablePct: 5,
};

function today() { return new Date().toISOString().slice(0, 10); }
function daysFrom(d, n) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}
function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

// ─── HSN Search Dropdown ──────────────────────────────────────────────────────
function HsnPicker({ value, onChange }) {
  const [q, setQ]         = useState(value || '');
  const [results, setRes] = useState([]);
  const [open, setOpen]   = useState(false);
  const ref               = useRef();

  useEffect(() => {
    if (!q || q.length < 2) { setRes([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await hsnApi.search({ q, limit: 8 });
        setRes(data.data.codes);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); onChange(e.target.value, null); }}
          onFocus={() => setOpen(true)}
          placeholder="HSN/SAC" className="input-field pr-7 font-mono text-xs" />
        <Search size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 z-50 w-64 bg-card border border-border rounded-xl shadow-modal mt-1 py-1 max-h-48 overflow-y-auto">
          {results.map(r => (
            <div key={r._id} className="px-3 py-2 hover:bg-surface cursor-pointer"
              onClick={() => { setQ(r.code); onChange(r.code, r); setOpen(false); }}>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-amber-400 text-xs">{r.code}</span>
                <span className="text-xs text-success font-semibold">{r.gstRate}%</span>
              </div>
              <p className="text-xs text-muted truncate">{r.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Party Selector ───────────────────────────────────────────────────────────
function PartySelector({ value, onChange, type }) {
  const [q, setQ]         = useState('');
  const [results, setRes] = useState([]);
  const [open, setOpen]   = useState(false);
  const [selected, setSel] = useState(value);
  const ref                = useRef();

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const params = { limit: 8, search: q };
        if (type !== 'all') params.type = type === 'purchase' ? 'supplier' : 'customer';
        const { data } = await partyApi.list(params);
        setRes(data.data.parties);
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [q, type]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const select = (party) => { setSel(party); onChange(party); setOpen(false); setQ(''); };

  return (
    <div ref={ref} className="relative">
      <div className="input-field flex items-center gap-2 cursor-pointer min-h-[40px]"
        onClick={() => setOpen(o => !o)}>
        {selected ? (
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-primary text-sm truncate">{selected.name}</p>
            <p className="text-xs text-muted truncate">{selected.gstin || 'Unregistered'} · {selected.address?.state || ''}</p>
          </div>
        ) : (
          <span className="text-muted text-sm flex-1">Select party...</span>
        )}
        <ChevronDown size={14} className="text-muted shrink-0" />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-modal mt-1">
          <div className="p-2 border-b border-border">
            <input value={q} onChange={e => setQ(e.target.value)} autoFocus
              placeholder="Search party name, GSTIN..." className="input-field text-sm" />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {results.length === 0 ? (
              <p className="text-center text-xs text-muted py-4">No parties found</p>
            ) : results.map(p => (
              <div key={p._id} onClick={() => select(p)}
                className="px-3 py-2.5 hover:bg-surface cursor-pointer flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-xs shrink-0">
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-primary truncate">{p.name}</p>
                  <p className="text-xs text-muted">{p.gstin || 'Unregistered'} · {p.address?.state || ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Line Items Table ─────────────────────────────────────────────────────────
function LineItemsTable({ items, onUpdate, taxType }) {
  const [collapsed, setCollapsed] = useState({});

  const update = (idx, field, val) => {
    const next = items.map((item, i) => i === idx ? { ...item, [field]: val } : item);
    onUpdate(next);
  };

  const addRow = () => onUpdate([...items, { ...BLANK_ITEM }]);
  const removeRow = (idx) => onUpdate(items.filter((_, i) => i !== idx));

  // Recalculate display for each item
  const { items: calcedItems } = calcInvoiceTotals(items, taxType);

  return (
    <div>
      {/* Table header */}
      <div className="grid text-[10px] font-semibold text-muted uppercase tracking-wider px-2 py-1.5 border-b border-border"
        style={{ gridTemplateColumns: '24px 1fr 80px 70px 50px 56px 60px 50px 60px 70px 28px' }}>
        <span>#</span><span>Description</span><span>HSN/SAC</span><span>LOT/Batch</span>
        <span className="text-center">Qty</span><span className="text-center">Unit</span>
        <span className="text-right">Rate</span><span className="text-center">Disc%</span>
        <span className="text-center">Tax%</span><span className="text-right">Amount</span><span />
      </div>

      {/* Items */}
      <div className="divide-y divide-border">
        {items.map((item, idx) => {
          const calc = calcedItems[idx] || item;
          return (
            <div key={idx} className="grid items-center gap-1 px-2 py-2 hover:bg-surface/50 group"
              style={{ gridTemplateColumns: '24px 1fr 80px 70px 50px 56px 60px 50px 60px 70px 28px' }}>
              <span className="text-xs text-muted text-center">{idx + 1}</span>

              {/* Description */}
              <input value={item.description} onChange={e => update(idx, 'description', e.target.value)}
                placeholder="Item description" className="input-field text-xs py-1.5 px-2" />

              {/* HSN */}
              <HsnPicker value={item.hsnCode}
                onChange={(code, hsnData) => {
                  update(idx, 'hsnCode', code);
                  if (hsnData) update(idx, 'taxablePct', hsnData.gstRate);
                }} />

              {/* LOT */}
              <input value={item.lot} onChange={e => update(idx, 'lot', e.target.value)}
                placeholder="LOT/Batch" className="input-field text-xs py-1.5 px-2 font-mono" />

              {/* Qty */}
              <input type="number" value={item.qty} min={0}
                onChange={e => update(idx, 'qty', e.target.value)}
                className="input-field text-xs py-1.5 px-2 text-center" />

              {/* Unit */}
              <select value={item.unit} onChange={e => update(idx, 'unit', e.target.value)}
                className="input-field text-xs py-1.5 px-1">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>

              {/* Rate */}
              <input type="number" value={item.rate} min={0}
                onChange={e => update(idx, 'rate', e.target.value)}
                className="input-field text-xs py-1.5 px-2 text-right" />

              {/* Discount% */}
              <input type="number" value={item.discountPct} min={0} max={100}
                onChange={e => update(idx, 'discountPct', e.target.value)}
                className="input-field text-xs py-1.5 px-2 text-center" />

              {/* Tax% */}
              <select value={item.taxablePct} onChange={e => update(idx, 'taxablePct', Number(e.target.value))}
                className="input-field text-xs py-1.5 px-1">
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>

              {/* Amount */}
              <div className="text-right">
                <p className="text-xs font-bold text-primary font-mono">₹{fmt(calc.taxableAmt)}</p>
                {calc.cgstAmt > 0 && (
                  <p className="text-[9px] text-muted">+₹{fmt(calc.cgstAmt + calc.sgstAmt)} tax</p>
                )}
                {calc.igstAmt > 0 && (
                  <p className="text-[9px] text-muted">+₹{fmt(calc.igstAmt)} IGST</p>
                )}
              </div>

              {/* Delete */}
              <button onClick={() => removeRow(idx)}
                className="text-muted hover:text-danger transition-colors p-1 opacity-0 group-hover:opacity-100">
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add row */}
      <button onClick={addRow}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-amber-500 hover:bg-amber-500/5 border-t border-dashed border-border transition-colors">
        <Plus size={13} /> Add Line Item
      </button>
    </div>
  );
}

// ─── Totals Summary Bar ───────────────────────────────────────────────────────
function TotalsBar({ totals, taxType }) {
  const t = totals || {};
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-surface border-t border-border">
      <div>
        <p className="text-xs text-muted mb-0.5">Taxable</p>
        <p className="font-mono font-bold text-sm text-primary">₹{fmt(t.taxableValue)}</p>
      </div>
      {taxType === 'intra' ? (
        <>
          <div>
            <p className="text-xs text-muted mb-0.5">CGST</p>
            <p className="font-mono font-bold text-sm text-info">₹{fmt(t.totalCgst)}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">SGST</p>
            <p className="font-mono font-bold text-sm text-info">₹{fmt(t.totalSgst)}</p>
          </div>
        </>
      ) : (
        <div>
          <p className="text-xs text-muted mb-0.5">IGST</p>
          <p className="font-mono font-bold text-sm text-amber-400">₹{fmt(t.totalIgst)}</p>
        </div>
      )}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
        <p className="text-xs text-amber-500 mb-0.5 font-semibold">Grand Total</p>
        <p className="font-mono font-bold text-lg text-amber-400">₹{(t.grandTotal || 0).toLocaleString('en-IN')}</p>
      </div>
    </div>
  );
}

// ─── Main Invoice Create Page ─────────────────────────────────────────────────
export default function InvoiceCreatePage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const activeBiz = useSelector(selectActiveBusiness);
  const saving    = useSelector(s => s.invoice?.saving);

  const [invoiceType,   setInvoiceType]   = useState('sale');
  const [party,         setParty]         = useState(null);
  const [invoiceDate,   setInvoiceDate]   = useState(today());
  const [dueDate,       setDueDate]       = useState(daysFrom(today(), 30));
  const [transport,     setTransport]     = useState('');
  const [vehicleNo,     setVehicleNo]     = useState('');
  const [poNumber,      setPoNumber]      = useState('');
  const [notes,         setNotes]         = useState('');
  const [items,         setItems]         = useState([{ ...BLANK_ITEM }]);
  const [taxType,       setTaxType]       = useState('intra');
  const [theme,         setTheme]         = useState('traditional');
  const [invDiscPct,    setInvDiscPct]    = useState(0);
  const [previewFull,   setPreviewFull]   = useState(false);

  // Live calculated totals
  const { items: calcedItems, totals } = calcInvoiceTotals(items, taxType, Number(invDiscPct));

  // Auto-determine tax type when party changes
  useEffect(() => {
    if (!party || !activeBiz) return;
    const bizCode   = activeBiz.address?.stateCode || (activeBiz.gstin ? activeBiz.gstin.slice(0,2) : '');
    const partyCode = party.address?.stateCode || (party.gstin ? party.gstin.slice(0,2) : '');
    if (bizCode && partyCode) {
      const auto = bizCode === partyCode ? 'intra' : 'inter';
      setTaxType(auto);
      if (bizCode !== partyCode) toast(`GST set to IGST — inter-state transaction`, { icon: '⚡' });
    }
  }, [party, activeBiz]);

  const partySnapshot = party ? {
    name: party.name, gstin: party.gstin || '',
    address: [party.address?.line1, party.address?.line2, party.address?.city, party.address?.pincode].filter(Boolean).join(', '),
    state: party.address?.state || (party.gstin ? '' : ''),
    stateCode: party.address?.stateCode || (party.gstin ? party.gstin.slice(0,2) : ''),
    mobile: party.mobile || '', email: party.email || '',
  } : null;

  const handleSave = async (status = 'draft') => {
    if (!party) { toast.error('Please select a party'); return; }
    if (items.some(i => !i.description)) { toast.error('All items need a description'); return; }

    const payload = {
      partyId: party._id, invoiceType, invoiceDate, dueDate,
      transport, vehicleNo, poNumber, notes, taxType, pdfTheme: theme,
      invoiceDiscountPct: Number(invDiscPct),
      items: items.map(i => ({
        description: i.description, hsnCode: i.hsnCode, lot: i.lot,
        qty: Number(i.qty), unit: i.unit, rate: Number(i.rate),
        discountPct: Number(i.discountPct), taxablePct: Number(i.taxablePct),
      })),
    };

    const result = await dispatch(createInvoice(payload));
    if (!result.error) navigate('/invoices');
  };

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── LEFT PANEL: Form ── */}
      <div className={clsx('flex flex-col border-r border-border transition-all duration-300 overflow-hidden',
        previewFull ? 'w-0' : 'w-[55%]')}>

        {/* Form header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/invoices')} className="btn-ghost p-1.5 text-muted">
              <ArrowLeft size={16} />
            </button>
            <h1 className="font-display font-bold text-base text-primary">New Invoice</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreviewFull(f => !f)} className="btn-secondary text-xs flex items-center gap-1.5 py-2">
              <Eye size={13} /> {previewFull ? 'Show Form' : 'Full Preview'}
            </button>
            <button onClick={() => handleSave('draft')} disabled={saving} className="btn-secondary text-xs flex items-center gap-1.5 py-2">
              {saving ? <Spinner size={12}/> : <Save size={12}/>} Draft
            </button>
            <button onClick={() => handleSave('sent')} disabled={saving} className="btn-primary text-xs flex items-center gap-1.5 py-2">
              {saving ? <Spinner size={12}/> : <Zap size={12}/>} Save & Send
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Invoice type + meta */}
          <div className="p-4 border-b border-border space-y-3">
            {/* Type selector */}
            <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
              {[['sale','Tax Invoice'],['purchase','Purchase'],['credit_note','Credit Note'],['proforma','Proforma']].map(([v,l]) => (
                <button key={v} onClick={() => setInvoiceType(v)}
                  className={clsx('flex-1 py-1.5 text-xs font-semibold rounded-md transition-all',
                    invoiceType === v ? 'bg-amber-500 text-canvas' : 'text-secondary hover:text-primary')}>
                  {l}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Invoice Date">
                <Input type="date" value={invoiceDate} onChange={e => { setInvoiceDate(e.target.value); setDueDate(daysFrom(e.target.value, 30)); }} />
              </FormField>
              <FormField label="Due Date">
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </FormField>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Transport / Narration">
                <Input value={transport} onChange={e => setTransport(e.target.value)} placeholder="Job Work on Fabric" />
              </FormField>
              <FormField label="Vehicle No.">
                <Input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="MH04AB1234" />
              </FormField>
              <FormField label="PO / Ref. No.">
                <Input value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="PO-001" />
              </FormField>
            </div>
          </div>

          {/* Party */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">
                {invoiceType === 'purchase' ? 'Supplier' : 'Customer'} *
              </label>
              <div className="flex items-center gap-2">
                <label className="label mb-0 mr-1">Tax Type</label>
                <div className="flex gap-1 bg-surface border border-border rounded-lg p-0.5">
                  {[['intra','SGST+CGST'],['inter','IGST']].map(([v,l]) => (
                    <button key={v} onClick={() => setTaxType(v)}
                      className={clsx('px-2.5 py-1 text-xs font-semibold rounded-md transition-all',
                        taxType === v ? 'bg-amber-500 text-canvas' : 'text-secondary')}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <PartySelector value={party} onChange={setParty} type={invoiceType} />
          </div>

          {/* Line Items */}
          <div className="border-b border-border">
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface/50">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-amber-500" />
                <span className="font-semibold text-sm text-primary">Line Items</span>
                <span className="badge badge-muted">{items.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted">Theme:</label>
                <select value={theme} onChange={e => setTheme(e.target.value)} className="input-field py-1 text-xs w-32">
                  <option value="traditional">Traditional</option>
                  <option value="modern">Modern</option>
                </select>
              </div>
            </div>
            <LineItemsTable items={items} onUpdate={setItems} taxType={taxType} />
          </div>

          {/* Invoice-level discount + notes */}
          <div className="p-4 grid grid-cols-2 gap-4">
            <FormField label="Invoice Discount %" hint="Applied on taxable value after item discounts">
              <Input type="number" value={invDiscPct} min={0} max={100}
                onChange={e => setInvDiscPct(e.target.value)} placeholder="0" />
            </FormField>
            <FormField label="Notes">
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Thank you for your business!" />
            </FormField>
          </div>

          {/* Totals bar */}
          <TotalsBar totals={totals} taxType={taxType} />
        </div>
      </div>

      {/* ── RIGHT PANEL: Live Preview ── */}
      <div className={clsx('flex flex-col transition-all duration-300', previewFull ? 'flex-1' : 'w-[45%]')}>
        <InvoicePreview
          invoice={{ invoiceType, invoiceDate, dueDate, transport, vehicleNo, poNumber, notes, status: 'draft' }}
          invoiceNo="Preview"
          business={activeBiz}
          items={calcedItems}
          totals={totals}
          party={partySnapshot}
          taxType={taxType}
          theme={theme}
        />
      </div>
    </div>
  );
}
