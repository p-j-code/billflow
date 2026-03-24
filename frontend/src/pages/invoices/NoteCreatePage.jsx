import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectActiveBusiness } from '@/store/slices/businessSlice';
import { partyApi, hsnApi } from '@/api';
import InvoicePreview from '@/components/invoice/InvoicePreview';
import { FormField, Input, Select, Spinner } from '@/components/ui';
import { calcInvoiceTotals, UNITS, GST_RATES } from '@/hooks/useGstCalc';
import { Plus, Trash2, ArrowLeft, Save, Zap, Search, Layers } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '@/api/client';

const BLANK_ITEM = { description: '', hsnCode: '', lot: '', qty: 1, unit: 'PCS', rate: 0, discountPct: 0, taxablePct: 5 };
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const NOTE_META = {
  credit_note: {
    label: 'Credit Note', color: 'text-blue-400', bg: 'bg-blue-500/10',
    reasons: ['sales_return','rate_difference','discount','damage','quality_issue','overbilling','other'],
    hint: 'Issued when you reduce the amount owed by the buyer — returns, over-billing, discounts.',
  },
  debit_note: {
    label: 'Debit Note', color: 'text-orange-400', bg: 'bg-orange-500/10',
    reasons: ['purchase_return','rate_difference','underbilling','other'],
    hint: 'Issued when you increase the amount owed to the supplier — under-billing, returns.',
  },
  proforma: {
    label: 'Proforma Invoice', color: 'text-purple-400', bg: 'bg-purple-500/10',
    reasons: [],
    hint: 'Pre-sale estimate with no GST liability. Can be converted to Tax Invoice later.',
  },
};

const REASON_LABELS = {
  sales_return:'Sales Return', purchase_return:'Purchase Return',
  rate_difference:'Rate Difference', discount:'Discount',
  damage:'Damage/Loss', quality_issue:'Quality Issue',
  overbilling:'Over Billing', underbilling:'Under Billing', other:'Other',
};

function PartySearchInput({ value, onChange }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q) { setResults([]); return; }
      try { const { data } = await partyApi.list({ search: q, limit: 6 }); setResults(data.data.parties); } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative">
      {value ? (
        <div className="input-field flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{value.name}</p>
            <p className="text-xs text-muted">{value.gstin || 'Unregistered'}</p>
          </div>
          <button onClick={() => onChange(null)} className="text-muted hover:text-danger text-xs">✕ Clear</button>
        </div>
      ) : (
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search party name or GSTIN..." className="input-field pl-9" />
        </div>
      )}
      {open && results.length > 0 && !value && (
        <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-modal mt-1 py-1 max-h-48 overflow-y-auto">
          {results.map(p => (
            <div key={p._id} onClick={() => { onChange(p); setOpen(false); setQ(''); }}
              className="px-3 py-2 hover:bg-surface cursor-pointer">
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-xs text-muted">{p.gstin || 'Unregistered'} · {p.address?.state || ''}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NoteCreatePage() {
  const navigate    = useNavigate();
  const [params]    = useSearchParams();
  const activeBiz   = useSelector(selectActiveBusiness);

  const [noteType, setNoteType] = useState(params.get('type') || 'credit_note');
  const [party,    setParty]    = useState(null);
  const [noteDate, setNoteDate] = useState(today());
  const [validUntil, setValidUntil] = useState('');
  const [originalInvoiceNo, setOriginalInvoiceNo] = useState(params.get('invNo') || '');
  const [reason,   setReason]   = useState('other');
  const [reasonDesc, setReasonDesc] = useState('');
  const [items,    setItems]    = useState([{ ...BLANK_ITEM }]);
  const [taxType,  setTaxType]  = useState('intra');
  const [theme,    setTheme]    = useState('traditional');
  const [notes,    setNotes]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [previewFull, setPreviewFull] = useState(false);

  const meta = NOTE_META[noteType];
  const { items: calcedItems, totals } = calcInvoiceTotals(items, noteType === 'proforma' ? 'intra' : taxType);

  // Zero tax for proforma display
  const displayTotals = noteType === 'proforma'
    ? { ...totals, totalCgst: 0, totalSgst: 0, totalIgst: 0, totalTax: 0, grandTotal: totals.taxableValue }
    : totals;

  const updateItem = (idx, field, val) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  const handleSave = async () => {
    if (!party) { toast.error('Please select a party'); return; }
    if (!items.some(i => i.description)) { toast.error('Add at least one item'); return; }

    setSaving(true);
    try {
      const payload = {
        partyId: party._id, noteType, noteDate,
        validUntil: validUntil || undefined,
        originalInvoiceNo, reason, reasonDescription: reasonDesc,
        taxType: noteType === 'proforma' ? 'exempt' : taxType,
        pdfTheme: theme, notes,
        items: items.map(i => ({
          description: i.description, hsnCode: i.hsnCode, lot: i.lot,
          qty: Number(i.qty), unit: i.unit, rate: Number(i.rate),
          discountPct: Number(i.discountPct), taxablePct: Number(i.taxablePct),
        })),
      };
      await api.post('/notes', payload);
      toast.success(`${meta.label} created!`);
      navigate('/notes');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    } finally { setSaving(false); }
  };

  const partySnapshot = party ? {
    name: party.name, gstin: party.gstin || '',
    address: [party.address?.line1, party.address?.city].filter(Boolean).join(', '),
    state: party.address?.state || '', stateCode: party.address?.stateCode || '',
  } : null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── LEFT FORM ── */}
      <div className={clsx('flex flex-col border-r border-border overflow-hidden transition-all', previewFull ? 'w-0' : 'w-[55%]')}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/notes')} className="btn-ghost p-1.5 text-muted">
              <ArrowLeft size={16} />
            </button>
            <div className={clsx('px-2.5 py-1 rounded-lg text-xs font-bold', meta.bg, meta.color)}>
              New {meta.label}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreviewFull(f => !f)} className="btn-secondary text-xs py-2">
              {previewFull ? 'Show Form' : '👁 Preview'}
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-xs flex items-center gap-1.5 py-2">
              {saving ? <Spinner size={12} /> : <Save size={12} />} Save Draft
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Note type selector */}
          <div className="p-4 border-b border-border">
            <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-3">
              {Object.entries(NOTE_META).map(([v, m]) => (
                <button key={v} onClick={() => { setNoteType(v); setReason('other'); }}
                  className={clsx('flex-1 py-2 text-xs font-semibold rounded-lg transition-all',
                    noteType === v ? `${m.bg} ${m.color} border border-current/30` : 'text-secondary hover:text-primary')}>
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted bg-surface border border-border rounded-lg px-3 py-2">{meta.hint}</p>
          </div>

          {/* Party + Date */}
          <div className="p-4 border-b border-border space-y-3">
            <FormField label="Party" required>
              <PartySearchInput value={party} onChange={setParty} />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label={`${meta.label} Date`}>
                <Input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} />
              </FormField>
              {noteType === 'proforma' ? (
                <FormField label="Valid Until">
                  <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                </FormField>
              ) : (
                <FormField label="Against Invoice No." hint="Original invoice reference">
                  <Input value={originalInvoiceNo} onChange={e => setOriginalInvoiceNo(e.target.value)}
                    placeholder="193/25-26" className="font-mono" />
                </FormField>
              )}
            </div>

            {noteType !== 'proforma' && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Reason">
                  <Select value={reason} onChange={e => setReason(e.target.value)}>
                    {meta.reasons.map(r => <option key={r} value={r}>{REASON_LABELS[r]}</option>)}
                  </Select>
                </FormField>
                <FormField label="Tax Type">
                  <div className="flex gap-1 bg-surface border border-border rounded-lg p-0.5 h-[42px]">
                    {[['intra','SGST+CGST'],['inter','IGST']].map(([v,l]) => (
                      <button key={v} onClick={() => setTaxType(v)}
                        className={clsx('flex-1 text-xs font-semibold rounded-md transition-all',
                          taxType === v ? 'bg-amber-500 text-canvas' : 'text-secondary')}>
                        {l}
                      </button>
                    ))}
                  </div>
                </FormField>
              </div>
            )}

            {reason === 'other' && noteType !== 'proforma' && (
              <FormField label="Reason Description">
                <Input value={reasonDesc} onChange={e => setReasonDesc(e.target.value)}
                  placeholder="Describe the reason..." />
              </FormField>
            )}
          </div>

          {/* Line Items */}
          <div className="border-b border-border">
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface/50">
              <div className="flex items-center gap-2">
                <Layers size={14} className={meta.color} />
                <span className="font-semibold text-sm">Line Items</span>
                <span className="badge badge-muted">{items.length}</span>
              </div>
              <select value={theme} onChange={e => setTheme(e.target.value)} className="input-field py-1 text-xs w-32">
                <option value="traditional">Traditional</option>
                <option value="modern">Modern</option>
              </select>
            </div>

            {/* Items rows */}
            <div className="divide-y divide-border">
              {items.map((item, idx) => (
                <div key={idx} className="grid items-center gap-1.5 px-3 py-2.5 hover:bg-surface/30 group"
                  style={{ gridTemplateColumns: '20px 1fr 70px 60px 44px 50px 60px 44px 50px 64px 24px' }}>
                  <span className="text-xs text-muted text-center">{idx + 1}</span>
                  <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                    placeholder="Item description" className="input-field text-xs py-1.5 px-2" />
                  <input value={item.hsnCode} onChange={e => updateItem(idx, 'hsnCode', e.target.value)}
                    placeholder="HSN" className="input-field text-xs py-1.5 px-2 font-mono" />
                  <input value={item.lot} onChange={e => updateItem(idx, 'lot', e.target.value)}
                    placeholder="LOT" className="input-field text-xs py-1.5 px-2 font-mono" />
                  <input type="number" value={item.qty} min={0} onChange={e => updateItem(idx, 'qty', e.target.value)}
                    className="input-field text-xs py-1.5 px-1 text-center" />
                  <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}
                    className="input-field text-xs py-1.5 px-1">
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                  <input type="number" value={item.rate} min={0} onChange={e => updateItem(idx, 'rate', e.target.value)}
                    className="input-field text-xs py-1.5 px-2 text-right" />
                  <input type="number" value={item.discountPct} min={0} max={100} onChange={e => updateItem(idx, 'discountPct', e.target.value)}
                    className="input-field text-xs py-1.5 px-1 text-center" />
                  {noteType !== 'proforma' ? (
                    <select value={item.taxablePct} onChange={e => updateItem(idx, 'taxablePct', Number(e.target.value))}
                      className="input-field text-xs py-1.5 px-1">
                      {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  ) : (
                    <div className="text-center text-xs text-muted">—</div>
                  )}
                  <div className="text-right">
                    <p className="text-xs font-bold text-primary font-mono">
                      ₹{fmt((calcedItems[idx] || item).taxableAmt || (item.qty * item.rate))}
                    </p>
                  </div>
                  <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                    className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all p-0.5">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setItems(p => [...p, { ...BLANK_ITEM }])}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-amber-500 hover:bg-amber-500/5 border-t border-dashed border-border transition-colors">
              <Plus size={13} /> Add Line Item
            </button>
          </div>

          {/* Notes + Totals */}
          <div className="p-4 border-b border-border">
            <FormField label="Notes">
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes for this document..." />
            </FormField>
          </div>

          {/* Totals bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
            <div><p className="text-xs text-muted mb-0.5">Taxable</p><p className="font-mono font-bold text-sm">₹{fmt(displayTotals.taxableValue)}</p></div>
            {noteType !== 'proforma' ? (
              taxType === 'intra' ? (
                <>
                  <div><p className="text-xs text-muted mb-0.5">CGST</p><p className="font-mono font-bold text-sm text-info">₹{fmt(displayTotals.totalCgst)}</p></div>
                  <div><p className="text-xs text-muted mb-0.5">SGST</p><p className="font-mono font-bold text-sm text-info">₹{fmt(displayTotals.totalSgst)}</p></div>
                </>
              ) : (
                <div><p className="text-xs text-muted mb-0.5">IGST</p><p className="font-mono font-bold text-sm text-amber-400">₹{fmt(displayTotals.totalIgst)}</p></div>
              )
            ) : (
              <div><p className="text-xs text-muted mb-0.5">Tax</p><p className="font-mono font-bold text-sm text-muted">Nil (Proforma)</p></div>
            )}
            <div className={clsx('rounded-lg px-3 py-1.5', meta.bg, 'border border-current/20')}>
              <p className={clsx('text-xs mb-0.5 font-semibold', meta.color)}>Total</p>
              <p className={clsx('font-mono font-bold text-lg', meta.color)}>₹{(displayTotals.grandTotal || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PREVIEW ── */}
      <div className={clsx('flex flex-col transition-all duration-300', previewFull ? 'flex-1' : 'w-[45%]')}>
        <InvoicePreview
          invoice={{ invoiceType: noteType, invoiceDate: noteDate, notes, status: 'draft' }}
          invoiceNo={`${meta.label} Preview`}
          business={activeBiz}
          items={calcedItems}
          totals={displayTotals}
          party={partySnapshot}
          taxType={noteType === 'proforma' ? 'intra' : taxType}
          theme={theme}
        />
      </div>
    </div>
  );
}
