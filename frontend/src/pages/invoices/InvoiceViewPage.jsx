import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { selectActiveBusiness } from "@/store/slices/businessSlice";
import { updateInvoiceStatus } from "@/store/slices/invoiceSlice";
import { invoiceApi, paymentApi } from "@/api";
import api from "@/api/client";
import PaymentModal from "@/components/payment/PaymentModal";
import ShareInvoiceModal from "@/components/invoice/ShareInvoiceModal";
import SendEmailModal from "@/components/invoice/SendEmailModal";
import InvoicePreview from "@/components/invoice/InvoicePreview";
import { Badge, Spinner, ConfirmDialog } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import {
  ArrowLeft,
  Download,
  Send,
  CheckCircle,
  XCircle,
  CreditCard,
  Edit,
  Clock,
  Banknote,
  Smartphone,
  Building,
  FileText,
  MoreVertical,
  Share2,
  Mail,
  AlertTriangle,
  Eye,
  Layers,
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const fmtI = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtD = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/**
 * Resolves the themeConfig to pass to <InvoicePreview>.
 * Mirrors the priority used in pdfController.resolveThemeConfig:
 *  1. Live theme from businessData.invoiceThemes  — preferred (always up-to-date)
 *  2. invoice.pdfThemeConfig snapshot             — fallback if theme was deleted
 *  3. null                                        — template built-in defaults
 */
function resolvePreviewTheme(invoice, businessData) {
  if (invoice?.pdfThemeId && businessData?.invoiceThemes?.length) {
    const live = businessData.invoiceThemes.find(
      (t) => t.id === invoice.pdfThemeId,
    );
    if (live) return live;
  }
  if (invoice?.pdfThemeConfig?.accentColor) return invoice.pdfThemeConfig;
  return null;
}

const STATUS_CONFIG = {
  draft: { color: "text-muted", badge: "muted", label: "Draft" },
  sent: { color: "text-info", badge: "blue", label: "Sent" },
  paid: { color: "text-success", badge: "green", label: "Paid" },
  partial: { color: "text-amber-400", badge: "amber", label: "Partial" },
  overdue: { color: "text-danger", badge: "red", label: "Overdue" },
  cancelled: { color: "text-muted", badge: "muted", label: "Cancelled" },
};

const MODE_ICONS = {
  cash: Banknote,
  upi: Smartphone,
  neft: Building,
  rtgs: Building,
  cheque: FileText,
  credit: Clock,
};
const MODE_COLORS = {
  cash: "text-success",
  upi: "text-info",
  neft: "text-purple-400",
  rtgs: "text-purple-400",
  cheque: "text-amber-400",
  credit: "text-orange-400",
};

export default function InvoiceViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const activeBiz = useSelector(selectActiveBusiness);

  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("preview");
  const [payModal, setPayModal] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [cancelDlg, setCancelDlg] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [invRes, payRes] = await Promise.all([
        invoiceApi.get(id),
        paymentApi.list({ invoiceId: id }),
      ]);
      setInvoice(invRes.data.data.invoice);
      setPayments(payRes.data.data.payments);
    } catch {
      toast.error("Invoice not found");
      navigate("/invoices");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkSent = async () => {
    await dispatch(updateInvoiceStatus({ id, status: "sent" }));
    load();
  };
  const handleMarkPaid = async () => {
    await dispatch(
      updateInvoiceStatus({
        id,
        status: "paid",
        amountPaid: invoice.totals.grandTotal,
      }),
    );
    load();
  };
  const handleCancel = async () => {
    setCancelling(true);
    try {
      await dispatch(updateInvoiceStatus({ id, status: "cancelled" }));
      load();
    } finally {
      setCancelling(false);
      setCancelDlg(false);
    }
  };
  const handleDownloadPdf = async () => {
    const toastId = toast.loading("Generating PDF…");
    try {
      const res = await api.get(`/invoices/pdf/${id}`, {
        responseType: "blob",
      });
      const contentType = res.headers["content-type"] || "";

      if (contentType.includes("text/html")) {
        // Puppeteer unavailable — inject an auto-print script so the browser's
        // Print dialog opens immediately. User selects "Save as PDF" to download.
        const htmlText = await res.data.text();
        const printReady = htmlText.replace(
          "</body>",
          `<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},300);});<\/script></body>`,
        );
        const blob = new Blob([printReady], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const tab = window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        if (!tab) {
          toast.error("Pop-up blocked — allow pop-ups then try again", {
            id: toastId,
          });
        } else {
          toast.success("Print dialog opening — choose 'Save as PDF'", {
            id: toastId,
            duration: 4000,
          });
        }
      } else {
        // Real PDF from Puppeteer — trigger file download
        const url = URL.createObjectURL(
          new Blob([res.data], { type: "application/pdf" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${invoice.invoiceNo.replace(/\//g, "-")}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success("PDF downloaded", { id: toastId });
      }
    } catch {
      toast.error("Failed to download PDF", { id: toastId });
    }
  };

  const handleDeletePayment = async (payId) => {
    try {
      await paymentApi.delete(payId);
      toast.success("Payment reversed");
      load();
    } catch {
      toast.error("Failed to reverse");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size={28} />
      </div>
    );
  if (!invoice) return null;

  const sc = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
  const isOverdue =
    invoice.status !== "paid" &&
    invoice.status !== "cancelled" &&
    new Date(invoice.dueDate) < new Date();
  const pctPaid =
    invoice.totals.grandTotal > 0
      ? Math.min(100, (invoice.amountPaid / invoice.totals.grandTotal) * 100)
      : 0;
  const businessData =
    invoice.businessId && typeof invoice.businessId === "object"
      ? invoice.businessId
      : activeBiz;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/invoices")}
              className="btn-ghost p-1 text-muted"
            >
              <ArrowLeft size={15} />
            </button>
            <span className="font-mono text-amber-400 font-bold">
              {invoice.invoiceNo}
            </span>
            <Badge variant={sc.badge}>{sc.label}</Badge>
            {isOverdue && <Badge variant="red">Overdue</Badge>}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Edit button */}
            {["draft", "sent"].includes(invoice.status) && (
              <button
                onClick={() => navigate(`/invoices/${id}/edit`)}
                className="btn-secondary text-xs flex items-center gap-1.5 py-2"
              >
                <Edit size={13} /> Edit
              </button>
            )}

            {/* Share button */}
            <button
              onClick={() => setShareModal(true)}
              className="btn-secondary text-xs flex items-center gap-1.5 py-2"
            >
              <Share2 size={13} /> Share
            </button>

            {/* PDF download */}
            <button
              onClick={handleDownloadPdf}
              className="btn-secondary text-xs flex items-center gap-1.5 py-2"
            >
              <Download size={13} /> PDF
            </button>

            {invoice.status === "draft" && (
              <button
                onClick={handleMarkSent}
                className="btn-secondary text-xs flex items-center gap-1.5 py-2"
              >
                <Send size={13} /> Mark Sent
              </button>
            )}

            {["sent", "partial", "overdue"].includes(invoice.status) && (
              <button
                onClick={() => setPayModal(true)}
                className="btn-primary text-xs flex items-center gap-1.5 py-2"
              >
                <CreditCard size={13} /> Record Payment
              </button>
            )}

            {/* 3-dots — only show when there are actions available */}
            {!["paid", "cancelled", "void"].includes(invoice.status) && (
              <div className="relative">
                <button
                  onClick={() => setMoreOpen((o) => !o)}
                  className="btn-secondary text-xs p-2"
                >
                  <MoreVertical size={14} />
                </button>
                {moreOpen && (
                  <div
                    className="absolute right-0 top-10 z-30 bg-card border border-border rounded-xl shadow-modal w-44 py-1 animate-slide-up"
                    onMouseLeave={() => setMoreOpen(false)}
                  >
                    {invoice.status !== "paid" &&
                      invoice.status !== "cancelled" && (
                        <button
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-success hover:bg-success/10"
                          onClick={() => {
                            handleMarkPaid();
                            setMoreOpen(false);
                          }}
                        >
                          <CheckCircle size={13} /> Mark Fully Paid
                        </button>
                      )}
                    {!["cancelled", "void", "paid"].includes(
                      invoice.status,
                    ) && (
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger/10"
                        onClick={() => {
                          setCancelDlg(true);
                          setMoreOpen(false);
                        }}
                      >
                        <XCircle size={13} /> Cancel Invoice
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT details panel */}
        <div className="w-80 shrink-0 border-r border-border overflow-y-auto bg-surface">
          {/* Party */}
          <div className="p-4 border-b border-border">
            <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-2">
              Bill To
            </p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-lg shrink-0">
                {invoice.partySnapshot?.name?.charAt(0) || "?"}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-primary">
                  {invoice.partySnapshot?.name}
                </p>
                {invoice.partySnapshot?.gstin && (
                  <p className="text-xs font-mono text-muted mt-0.5">
                    {invoice.partySnapshot.gstin}
                  </p>
                )}
                {invoice.partySnapshot?.address && (
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    {invoice.partySnapshot.address}
                  </p>
                )}
                {invoice.partySnapshot?.state && (
                  <p className="text-xs text-muted mt-0.5">
                    {invoice.partySnapshot.state}
                  </p>
                )}
                {invoice.partySnapshot?.mobile && (
                  <p className="text-xs text-secondary mt-1">
                    📞 {invoice.partySnapshot.mobile}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="p-4 border-b border-border space-y-3">
            <p className="text-xs text-muted uppercase tracking-wider font-semibold">
              Details
            </p>
            {[
              [
                "Invoice No.",
                <span className="font-mono font-bold text-amber-400">
                  {invoice.invoiceNo}
                </span>,
              ],
              ["Date", fmtD(invoice.invoiceDate)],
              [
                "Due Date",
                <span
                  className={clsx(isOverdue && "text-danger font-semibold")}
                >
                  {fmtD(invoice.dueDate)}
                  {isOverdue && " ⚠"}
                </span>,
              ],
              [
                "Tax Type",
                <span
                  className={
                    invoice.taxType === "intra"
                      ? "text-success"
                      : "text-amber-400"
                  }
                >
                  {invoice.taxType === "intra" ? "SGST + CGST" : "IGST"}
                </span>,
              ],
              [
                "Theme",
                invoice.pdfThemeConfig?.name
                  ? `🎨 ${invoice.pdfThemeConfig.name}`
                  : invoice.pdfTheme === "modern"
                    ? "✨ Modern"
                    : "📄 Traditional",
              ],
              ...(invoice.transport ? [["Transport", invoice.transport]] : []),
              ...(invoice.poNumber ? [["PO No.", invoice.poNumber]] : []),
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-2"
              >
                <span className="text-xs text-muted shrink-0">{label}</span>
                <span className="text-xs text-primary text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Share link status */}
          {invoice.shareToken && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                <Share2 size={12} className="text-success" />
                <p className="text-xs font-semibold text-success">
                  Share Link Active
                </p>
              </div>
              <p className="text-xs text-muted">
                Expires {fmtD(invoice.shareTokenExpiry)}
              </p>
              <button
                onClick={() => setShareModal(true)}
                className="text-xs text-amber-500 hover:text-amber-400 mt-1 transition-colors"
              >
                Manage link →
              </button>
            </div>
          )}

          {/* Share status */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">
                Share Link
              </p>
              <button
                onClick={() => setShareModal(true)}
                className="text-xs text-amber-500 hover:text-amber-400 font-semibold"
              >
                {invoice.shareToken ? "Manage" : "Generate"}
              </button>
            </div>
            {invoice.shareToken ? (
              <div className="bg-success/10 border border-success/20 rounded-lg px-3 py-2 text-xs text-success flex items-center gap-2">
                <CheckCircle size={11} /> Active · expires{" "}
                {fmtD(invoice.shareTokenExpiry)}
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-muted">
                No share link
              </div>
            )}
          </div>

          {/* Payment summary */}
          <div className="p-4 border-b border-border">
            <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-3">
              Payment
            </p>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">Paid</span>
                <span className="font-semibold">{Math.round(pctPaid)}%</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all duration-500"
                  style={{ width: `${pctPaid}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              {[
                [
                  "Grand Total",
                  `₹${fmtI(invoice.totals?.grandTotal)}`,
                  "text-primary font-bold",
                ],
                [
                  "Received",
                  `₹${fmt(invoice.amountPaid)}`,
                  "text-success font-semibold",
                ],
                [
                  "Balance Due",
                  `₹${fmt(invoice.balanceDue)}`,
                  invoice.balanceDue > 0
                    ? "text-danger font-bold"
                    : "text-muted",
                ],
              ].map(([l, v, cls]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-muted">{l}</span>
                  <span className={cls}>{v}</span>
                </div>
              ))}
            </div>
            {["sent", "partial", "overdue"].includes(invoice.status) && (
              <button
                onClick={() => setPayModal(true)}
                className="btn-primary w-full mt-3 flex items-center justify-center gap-2 text-xs"
              >
                <CreditCard size={13} /> Record Payment
              </button>
            )}
          </div>

          {/* Tax breakdown */}
          <div className="p-4">
            <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-3">
              Tax Breakdown
            </p>
            <div className="space-y-2">
              {[
                [
                  "Subtotal",
                  `₹${fmt(invoice.totals?.subtotal)}`,
                  "text-secondary",
                ],
                ...(invoice.totals?.totalDiscount > 0
                  ? [
                      [
                        "Discount",
                        `-₹${fmt(invoice.totals.totalDiscount)}`,
                        "text-danger",
                      ],
                    ]
                  : []),
                [
                  "Taxable Value",
                  `₹${fmt(invoice.totals?.taxableValue)}`,
                  "text-primary font-semibold",
                ],
                ...(invoice.taxType === "intra"
                  ? [
                      [
                        "CGST",
                        `₹${fmt(invoice.totals?.totalCgst)}`,
                        "text-info",
                      ],
                      [
                        "SGST",
                        `₹${fmt(invoice.totals?.totalSgst)}`,
                        "text-info",
                      ],
                    ]
                  : [
                      [
                        "IGST",
                        `₹${fmt(invoice.totals?.totalIgst)}`,
                        "text-amber-400",
                      ],
                    ]),
                ...(invoice.totals?.roundOff
                  ? [
                      [
                        "Round Off",
                        `₹${fmt(invoice.totals.roundOff)}`,
                        "text-muted",
                      ],
                    ]
                  : []),
              ].map(([l, v, cls]) => (
                <div key={l} className="flex justify-between text-xs">
                  <span className="text-muted">{l}</span>
                  <span className={clsx("font-mono", cls)}>{v}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                <span>Grand Total</span>
                <span className="text-amber-400 font-mono">
                  ₹{fmtI(invoice.totals?.grandTotal)}
                </span>
              </div>
            </div>
            {invoice.totals?.grandTotalWords && (
              <p className="text-[10px] text-muted mt-2 italic">
                {invoice.totals.grandTotalWords}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-border bg-surface shrink-0">
            {[
              { id: "preview", label: "Preview", icon: Eye },
              {
                id: "items",
                label: `Items (${invoice.items?.length || 0})`,
                icon: Layers,
              },
              {
                id: "payments",
                label: `Payments (${payments.length})`,
                icon: CreditCard,
              },
            ].map(({ id: tid, label, icon: Icon }) => (
              <button
                key={tid}
                onClick={() => setTab(tid)}
                className={clsx(
                  "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all",
                  tab === tid
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-secondary hover:text-primary",
                )}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {tab === "preview" && (
            <div className="flex-1 overflow-hidden">
              <InvoicePreview
                invoice={invoice}
                invoiceNo={invoice.invoiceNo}
                business={businessData}
                items={invoice.items}
                totals={invoice.totals}
                party={invoice.partySnapshot}
                taxType={invoice.taxType}
                theme={invoice.pdfTheme || "traditional"}
                themeConfig={resolvePreviewTheme(invoice, businessData)}
              />
            </div>
          )}

          {tab === "items" && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      {[
                        "#",
                        "Description",
                        "HSN",
                        "LOT",
                        "Qty",
                        "Unit",
                        "Rate",
                        "Disc%",
                        "Tax%",
                        "Taxable",
                        "Total",
                      ].map((h) => (
                        <th key={h} className="table-head text-xs">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items?.map((item, i) => (
                      <tr key={i} className="table-row text-xs">
                        <td className="table-cell text-muted text-center">
                          {item.srNo || i + 1}
                        </td>
                        <td className="table-cell font-medium">
                          {item.description}
                        </td>
                        <td className="table-cell font-mono text-amber-400 text-center">
                          {item.hsnCode || "—"}
                        </td>
                        <td className="table-cell font-mono text-center">
                          {item.lot || "—"}
                        </td>
                        <td className="table-cell text-center font-bold">
                          {fmtI(item.qty)}
                        </td>
                        <td className="table-cell text-center text-muted">
                          {item.unit}
                        </td>
                        <td className="table-cell text-right font-mono">
                          ₹{fmt(item.rate)}
                        </td>
                        <td className="table-cell text-center">
                          {item.discountPct ? `${item.discountPct}%` : "—"}
                        </td>
                        <td className="table-cell text-center">
                          <Badge variant="amber">{item.taxablePct}%</Badge>
                        </td>
                        <td className="table-cell text-right font-mono font-bold">
                          ₹{fmt(item.taxableAmt)}
                        </td>
                        <td className="table-cell text-right font-mono font-bold text-primary">
                          ₹{fmt(item.totalAmt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-surface">
                      <td
                        colSpan={4}
                        className="table-cell text-xs text-muted font-semibold"
                      >
                        {invoice.items?.length} items
                      </td>
                      <td className="table-cell text-center font-bold">
                        {fmtI(invoice.totals?.totalQty)}
                      </td>
                      <td colSpan={4} />
                      <td className="table-cell text-right font-bold font-mono">
                        ₹{fmt(invoice.totals?.taxableValue)}
                      </td>
                      <td className="table-cell text-right font-bold font-mono text-amber-400">
                        ₹{fmtI(invoice.totals?.grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {invoice.notes && (
                <div className="mt-4 bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-secondary">{invoice.notes}</p>
                </div>
              )}
            </div>
          )}

          {tab === "payments" && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  [
                    "Grand Total",
                    `₹${fmtI(invoice.totals?.grandTotal)}`,
                    "text-primary",
                  ],
                  ["Total Paid", `₹${fmt(invoice.amountPaid)}`, "text-success"],
                  [
                    "Balance Due",
                    `₹${fmt(invoice.balanceDue)}`,
                    invoice.balanceDue > 0 ? "text-danger" : "text-muted",
                  ],
                ].map(([l, v, cls]) => (
                  <div
                    key={l}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <p className="text-xs text-muted mb-1">{l}</p>
                    <p
                      className={clsx(
                        "font-display font-bold text-xl font-mono",
                        cls,
                      )}
                    >
                      {v}
                    </p>
                  </div>
                ))}
              </div>
              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CreditCard size={20} className="text-muted mb-3" />
                  <p className="font-semibold text-primary mb-1">
                    No payments recorded
                  </p>
                  {["sent", "partial", "overdue"].includes(invoice.status) && (
                    <button
                      onClick={() => setPayModal(true)}
                      className="btn-primary flex items-center gap-2 mt-3"
                    >
                      <CreditCard size={14} /> Record Payment
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-surface">
                    <p className="text-xs font-semibold text-secondary uppercase tracking-wider">
                      Payment History
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    {payments.map((pay) => {
                      const Icon = MODE_ICONS[pay.mode] || Banknote;
                      return (
                        <div
                          key={pay._id}
                          className="flex items-center gap-4 px-4 py-3.5 group hover:bg-surface/50"
                        >
                          <div
                            className={clsx(
                              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-surface border border-border",
                              MODE_COLORS[pay.mode],
                            )}
                          >
                            <Icon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-primary capitalize">
                                {pay.mode}
                              </p>
                              {pay.reference && (
                                <span className="font-mono text-xs text-muted bg-border px-1.5 py-0.5 rounded">
                                  {pay.reference}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted">
                              {fmtD(pay.paymentDate)}
                              {pay.bankName && ` · ${pay.bankName}`}
                            </p>
                          </div>
                          <p className="font-mono font-bold text-success shrink-0">
                            +₹{fmt(pay.amount)}
                          </p>
                          <button
                            onClick={() => handleDeletePayment(pay._id)}
                            className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all p-1"
                            title="Reverse"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-4 py-3 border-t border-border bg-surface flex justify-between text-sm font-bold">
                    <span className="text-muted">Total Received</span>
                    <span className="text-success font-mono">
                      ₹{fmt(payments.reduce((s, p) => s + p.amount, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <PaymentModal
        open={payModal}
        onClose={() => setPayModal(false)}
        invoice={invoice}
        onSuccess={load}
      />
      <SendEmailModal
        open={emailModal}
        onClose={() => setEmailModal(false)}
        invoice={invoice}
      />
      <ShareInvoiceModal
        open={shareModal}
        onClose={() => {
          setShareModal(false);
          load();
        }}
        invoice={invoice}
      />
      <ConfirmDialog
        open={cancelDlg}
        onClose={() => setCancelDlg(false)}
        onConfirm={handleCancel}
        loading={cancelling}
        title="Cancel Invoice"
        message={`Cancel invoice ${invoice.invoiceNo}? This cannot be undone.`}
      />
    </div>
  );
}
