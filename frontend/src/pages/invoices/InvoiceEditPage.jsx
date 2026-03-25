import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectActiveBusiness } from "@/store/slices/businessSlice";
import { invoiceApi, hsnApi } from "@/api";
import InvoicePreview from "@/components/invoice/InvoicePreview";
import { FormField, Input, Select, Spinner } from "@/components/ui";
import { calcInvoiceTotals, UNITS, GST_RATES } from "@/hooks/useGstCalc";
import { Plus, Trash2, ArrowLeft, Save, Eye, Layers } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import api from "@/api/client";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const BLANK = {
  description: "",
  hsnCode: "",
  lot: "",
  qty: 1,
  unit: "PCS",
  rate: 0,
  discountPct: 0,
  taxablePct: 5,
};

function HsnPicker({ value, onChange }) {
  const [q, setQ] = useState(value || "");
  const [results, setRes] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!q || q.length < 2) {
      setRes([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await hsnApi.search({ q, limit: 8 });
        setRes(data.data.codes);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          onChange(e.target.value, null);
        }}
        onFocus={() => setOpen(true)}
        placeholder="HSN"
        className="input-field text-xs py-1.5 px-2 font-mono"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 z-50 w-64 bg-card border border-border rounded-xl shadow-modal mt-1 py-1 max-h-44 overflow-y-auto">
          {results.map((r) => (
            <div
              key={r._id}
              className="px-3 py-2 hover:bg-surface cursor-pointer"
              onClick={() => {
                setQ(r.code);
                onChange(r.code, r);
                setOpen(false);
              }}
            >
              <div className="flex justify-between">
                <span className="font-mono font-bold text-amber-400 text-xs">
                  {r.code}
                </span>
                <span className="text-xs text-success">{r.gstRate}%</span>
              </div>
              <p className="text-xs text-muted truncate">{r.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InvoiceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const activeBiz = useSelector(selectActiveBusiness);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState(null);
  const [previewFull, setPreviewFull] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [transport, setTransport] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ ...BLANK }]);
  const [taxType, setTaxType] = useState("intra");
  const [theme, setTheme] = useState("traditional");
  const [invDiscPct, setInvDiscPct] = useState(0);
  const [partySnap, setPartySnap] = useState(null);

  const { items: calcedItems, totals } = calcInvoiceTotals(
    items,
    taxType,
    Number(invDiscPct),
  );

  const customThemes = activeBiz?.invoiceThemes || [];
  const resolvedTheme = customThemes.find((t) => t.id === theme) || null;

  useEffect(() => {
    invoiceApi
      .get(id)
      .then((r) => {
        const inv = r.data.data.invoice;
        setOriginal(inv);
        setInvoiceDate(
          inv.invoiceDate
            ? new Date(inv.invoiceDate).toISOString().slice(0, 10)
            : "",
        );
        setDueDate(
          inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : "",
        );
        setTransport(inv.transport || "");
        setVehicleNo(inv.vehicleNo || "");
        setPoNumber(inv.poNumber || "");
        setNotes(inv.notes || "");
        setTaxType(inv.taxType || "intra");
        // Use pdfThemeId (UUID) so resolvedTheme = customThemes.find(t => t.id === theme)
        // correctly resolves the full live theme config. Fall back to the base
        // template key ('modern'/'traditional') only when no custom theme was saved.
        setTheme(inv.pdfThemeId || inv.pdfTheme || "traditional");
        setInvDiscPct(inv.invoiceDiscountPct || 0);
        setPartySnap(inv.partySnapshot || null);
        setItems(
          inv.items?.map((i) => ({
            description: i.description || "",
            hsnCode: i.hsnCode || "",
            lot: i.lot || "",
            qty: i.qty || 1,
            unit: i.unit || "PCS",
            rate: i.rate || 0,
            discountPct: i.discountPct || 0,
            taxablePct: i.taxablePct || 0,
          })) || [{ ...BLANK }],
        );
      })
      .catch(() => {
        toast.error("Invoice not found");
        navigate("/invoices");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const updateItem = (idx, field, val) =>
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item)),
    );

  const handleSave = async () => {
    if (!items.some((i) => i.description.trim())) {
      toast.error("Add at least one item");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/invoices/${id}`, {
        invoiceDate,
        dueDate,
        transport,
        vehicleNo,
        poNumber,
        notes,
        taxType,
        pdfTheme: resolvedTheme ? resolvedTheme.baseTemplate : theme,
        pdfThemeId: resolvedTheme ? resolvedTheme.id : null,
        pdfThemeConfig: resolvedTheme || null,
        invoiceDiscountPct: Number(invDiscPct),
        items: items.map((i) => ({
          description: i.description,
          hsnCode: i.hsnCode,
          lot: i.lot,
          qty: Number(i.qty),
          unit: i.unit,
          rate: Number(i.rate),
          discountPct: Number(i.discountPct),
          taxablePct: Number(i.taxablePct),
        })),
      });
      toast.success("Invoice updated!");
      navigate(`/invoices/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size={24} />
      </div>
    );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* LEFT: form */}
      <div
        className={clsx(
          "flex flex-col border-r border-border overflow-hidden transition-all",
          previewFull ? "w-0" : "w-[55%]",
        )}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/invoices/${id}`)}
              className="btn-ghost p-1.5 text-muted"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="font-display font-bold text-base">Edit Invoice</h1>
              <p className="text-xs text-muted font-mono">
                {original?.invoiceNo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewFull((f) => !f)}
              className="btn-secondary text-xs py-2 flex items-center gap-1.5"
            >
              <Eye size={13} /> {previewFull ? "Form" : "Preview"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-xs flex items-center gap-1.5 py-2"
            >
              {saving ? <Spinner size={12} /> : <Save size={12} />} Save Changes
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Warning if already sent */}
          {original?.status !== "draft" && (
            <div className="mx-4 mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-400">
              ⚠ Invoice is <strong>{original.status}</strong> — editing will
              recalculate totals. Invoice number stays the same.
            </div>
          )}

          {/* Dates + transport */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Invoice Date">
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </FormField>
              <FormField label="Due Date">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Transport">
                <Input
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  placeholder="Job work..."
                />
              </FormField>
              <FormField label="Vehicle No.">
                <Input
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  placeholder="MH04AB..."
                />
              </FormField>
              <FormField label="PO / Ref">
                <Input
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="PO-001"
                />
              </FormField>
            </div>
            <div className="flex items-center gap-3">
              <span className="label mb-0 mr-1">Tax Type</span>
              <div className="flex gap-0.5 bg-surface border border-border rounded-lg p-0.5">
                {[
                  ["intra", "SGST+CGST"],
                  ["inter", "IGST"],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setTaxType(v)}
                    className={clsx(
                      "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                      taxType === v
                        ? "bg-amber-500 text-canvas"
                        : "text-secondary",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <span className="label mb-0 ml-2 mr-1">Theme</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="input-field py-1.5 text-xs w-44"
              >
                <optgroup label="Built-in">
                  <option value="traditional">📄 Traditional</option>
                  <option value="modern">✨ Modern</option>
                </optgroup>
                {customThemes.length > 0 && (
                  <optgroup label="Custom Themes">
                    {customThemes.map((t) => (
                      <option key={t.id} value={t.id}>
                        🎨 {t.name}
                        {t.isDefault ? " ★" : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {/* Party (locked) */}
          {partySnap && (
            <div className="p-4 border-b border-border">
              <p className="label mb-1.5">Party (locked)</p>
              <div className="input-field flex items-center gap-3 opacity-60 cursor-not-allowed bg-surface/50">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-xs">
                  {partySnap.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{partySnap.name}</p>
                  <p className="text-xs text-muted">
                    {partySnap.gstin || "Unregistered"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="border-b border-border">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-surface/50">
              <Layers size={14} className="text-amber-500" />
              <span className="font-semibold text-sm">Line Items</span>
              <span className="badge badge-muted">{items.length}</span>
            </div>
            <div className="divide-y divide-border">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid items-center gap-1 px-3 py-2.5 hover:bg-surface/30 group"
                  style={{
                    gridTemplateColumns:
                      "20px 1fr 70px 60px 44px 50px 60px 44px 50px 64px 24px",
                  }}
                >
                  <span className="text-xs text-muted text-center">
                    {idx + 1}
                  </span>
                  <input
                    value={item.description}
                    onChange={(e) =>
                      updateItem(idx, "description", e.target.value)
                    }
                    placeholder="Item description"
                    className="input-field text-xs py-1.5 px-2"
                  />
                  <HsnPicker
                    value={item.hsnCode}
                    onChange={(code, hsnData) => {
                      updateItem(idx, "hsnCode", code);
                      if (hsnData)
                        updateItem(idx, "taxablePct", hsnData.gstRate);
                    }}
                  />
                  <input
                    value={item.lot}
                    onChange={(e) => updateItem(idx, "lot", e.target.value)}
                    placeholder="LOT"
                    className="input-field text-xs py-1.5 px-2 font-mono"
                  />
                  <input
                    type="number"
                    value={item.qty}
                    min={0}
                    onChange={(e) => updateItem(idx, "qty", e.target.value)}
                    className="input-field text-xs py-1.5 px-1 text-center"
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(idx, "unit", e.target.value)}
                    className="input-field text-xs py-1.5 px-1"
                  >
                    {UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={item.rate}
                    min={0}
                    onChange={(e) => updateItem(idx, "rate", e.target.value)}
                    className="input-field text-xs py-1.5 px-2 text-right"
                  />
                  <input
                    type="number"
                    value={item.discountPct}
                    min={0}
                    max={100}
                    onChange={(e) =>
                      updateItem(idx, "discountPct", e.target.value)
                    }
                    className="input-field text-xs py-1.5 px-1 text-center"
                  />
                  <select
                    value={item.taxablePct}
                    onChange={(e) =>
                      updateItem(idx, "taxablePct", Number(e.target.value))
                    }
                    className="input-field text-xs py-1.5 px-1"
                  >
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}%
                      </option>
                    ))}
                  </select>
                  <p className="text-xs font-bold text-right font-mono text-primary">
                    ₹
                    {fmt(
                      (calcedItems[idx] || item).taxableAmt ||
                        Number(item.qty) * Number(item.rate),
                    )}
                  </p>
                  <button
                    onClick={() =>
                      setItems((p) => p.filter((_, i) => i !== idx))
                    }
                    className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 p-0.5 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setItems((p) => [...p, { ...BLANK }])}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-amber-500 hover:bg-amber-500/5 border-t border-dashed border-border transition-colors"
            >
              <Plus size={13} /> Add Line Item
            </button>
          </div>

          {/* Notes + discount + totals */}
          <div className="p-4 grid grid-cols-2 gap-4 border-b border-border">
            <FormField label="Invoice Discount %">
              <Input
                type="number"
                value={invDiscPct}
                min={0}
                max={100}
                onChange={(e) => setInvDiscPct(e.target.value)}
                placeholder="0"
              />
            </FormField>
            <FormField label="Notes">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes..."
              />
            </FormField>
          </div>

          {/* Totals bar */}
          <div className="grid grid-cols-4 gap-3 p-4 bg-surface border-t border-border">
            <div>
              <p className="text-xs text-muted mb-0.5">Taxable</p>
              <p className="font-mono font-bold text-sm">
                ₹{fmt(totals.taxableValue)}
              </p>
            </div>
            {taxType === "intra" ? (
              <>
                <div>
                  <p className="text-xs text-muted mb-0.5">CGST</p>
                  <p className="font-mono font-bold text-sm text-info">
                    ₹{fmt(totals.totalCgst)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-0.5">SGST</p>
                  <p className="font-mono font-bold text-sm text-info">
                    ₹{fmt(totals.totalSgst)}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs text-muted mb-0.5">IGST</p>
                <p className="font-mono font-bold text-sm text-amber-400">
                  ₹{fmt(totals.totalIgst)}
                </p>
              </div>
            )}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
              <p className="text-xs text-amber-500 mb-0.5 font-semibold">
                Grand Total
              </p>
              <p className="font-mono font-bold text-lg text-amber-400">
                ₹{(totals.grandTotal || 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Preview */}
      <div
        className={clsx(
          "flex flex-col transition-all duration-300 relative",
          previewFull ? "flex-1" : "w-[45%]",
        )}
      >
        {/* Floating escape hatch — visible only in full-preview mode */}
        {previewFull && (
          <button
            onClick={() => setPreviewFull(false)}
            className="absolute top-3 left-3 z-20 btn-secondary text-xs flex items-center gap-1.5 py-2 shadow-lg"
          >
            <ArrowLeft size={13} /> Back to Form
          </button>
        )}
        <InvoicePreview
          invoice={{
            invoiceType: original?.invoiceType,
            invoiceDate,
            dueDate,
            transport,
            notes,
            status: original?.status || "draft",
          }}
          invoiceNo={original?.invoiceNo || "Edit Preview"}
          business={activeBiz}
          items={calcedItems}
          totals={totals}
          party={partySnap}
          taxType={taxType}
          theme={resolvedTheme?.baseTemplate || theme}
          themeConfig={resolvedTheme}
        />
      </div>
    </div>
  );
}
