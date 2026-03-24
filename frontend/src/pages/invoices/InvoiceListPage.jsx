import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchInvoices,
  updateInvoiceStatus,
  deleteInvoice,
  selectInvoice,
} from "@/store/slices/invoiceSlice";
import { selectActiveBusiness } from "@/store/slices/businessSlice";
import Topbar from "@/components/layout/Topbar";
import {
  Badge,
  EmptyState,
  SkeletonRows,
  ConfirmDialog,
  StatCard,
} from "@/components/ui";
import {
  Plus,
  FileText,
  Search,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  CheckCircle,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckSquare,
  Square,
  Send,
  XCircle,
  ChevronDown,
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import api from "@/api/client";

const STATUS_BADGE = {
  draft: "muted",
  sent: "blue",
  paid: "green",
  partial: "amber",
  overdue: "red",
  cancelled: "muted",
  void: "muted",
};
const TYPE_LABELS = {
  sale: "Tax Invoice",
  purchase: "Purchase",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
  proforma: "Proforma",
};
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });
const fmtD = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function InvoiceListPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const activeBiz = useSelector(selectActiveBusiness);
  const { list, pagination, stats, loading } = useSelector(selectInvoice);
  const [type, setType] = useState("sale");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openMenu, setMenu] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkMenu, setBulkMenu] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = useCallback(() => {
    if (!activeBiz) return;
    dispatch(fetchInvoices({ type, status, search, page, limit: 15 }));
  }, [dispatch, activeBiz, type, status, search, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setSelected(new Set());
  }, [type, status, page]);

  const toggleOne = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    selected.size === list.length
      ? setSelected(new Set())
      : setSelected(new Set(list.map((i) => i._id)));
  const allSelected = list.length > 0 && selected.size === list.length;
  const someSelected = selected.size > 0;

  const bulkMarkStatus = async (newStatus) => {
    setBulkLoading(true);
    let ok = 0;
    for (const id of selected) {
      try {
        const inv = list.find((i) => i._id === id);
        const payload =
          newStatus === "paid"
            ? { status: "paid", amountPaid: inv?.totals?.grandTotal }
            : { status: newStatus };
        await api.patch(`/invoices/${id}/status`, payload);
        ok++;
      } catch {}
    }
    toast.success(`${ok} invoice${ok !== 1 ? "s" : ""} marked as ${newStatus}`);
    setSelected(new Set());
    setBulkMenu(false);
    setBulkLoading(false);
    load();
  };

  const bulkExport = async () => {
    toast("Preparing export...", { icon: "\u23f3" });
    try {
      const r = await api.get("/exports/sales-register", {
        params: { type },
        responseType: "blob",
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoices_${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    }
    setBulkMenu(false);
  };

  const handleDownloadPdf = async (inv, e) => {
    e.stopPropagation();
    setMenu(null);
    const toastId = toast.loading("Generating PDF\u2026");
    try {
      const res = await api.get(`/invoices/pdf/${inv._id}`, {
        responseType: "blob",
      });
      const contentType = res.headers["content-type"] || "";

      if (contentType.includes("text/html")) {
        const htmlText = await res.data.text();
        const printReady = htmlText.replace(
          "</body>",
          `<script>window.addEventListener(\'load\',function(){setTimeout(function(){window.print();},300);});<\/script></body>`,
        );
        const blob = new Blob([printReady], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const tab = window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        if (!tab) {
          toast.error("Pop-up blocked \u2014 allow pop-ups then try again", {
            id: toastId,
          });
        } else {
          toast.success("Print dialog opening \u2014 choose 'Save as PDF'", {
            id: toastId,
            duration: 4000,
          });
        }
      } else {
        const url = URL.createObjectURL(
          new Blob([res.data], { type: "application/pdf" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${inv.invoiceNo.replace(/\//g, "-")}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success("PDF downloaded", { id: toastId });
      }
    } catch {
      toast.error("Failed to download PDF", { id: toastId });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    await dispatch(deleteInvoice(confirm._id));
    setDeleting(false);
    setConfirm(null);
    load();
  };
  const handleMarkPaid = (inv) => {
    dispatch(
      updateInvoiceStatus({
        id: inv._id,
        status: "paid",
        amountPaid: inv.totals?.grandTotal,
      }),
    );
    setMenu(null);
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Invoices"
        actions={
          <Link
            to="/invoices/new"
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus size={14} /> New Invoice
          </Link>
        }
      />
      <div className="flex-1 p-6 space-y-5 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Invoices"
            value={fmt(stats.count)}
            sub="This period"
            icon={FileText}
            color="blue"
          />
          <StatCard
            label="Total Sales"
            value={`\u20b9${fmt(stats.totalSales)}`}
            sub="Gross revenue"
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            label="Collected"
            value={`\u20b9${fmt(stats.totalPaid)}`}
            sub="Amount received"
            icon={CheckCircle}
            color="amber"
          />
          <StatCard
            label="Outstanding"
            value={`\u20b9${fmt(stats.totalPending)}`}
            sub="Pending"
            icon={AlertTriangle}
            color="red"
          />
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit">
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <button
              key={v}
              onClick={() => {
                setType(v);
                setPage(1);
              }}
              className={clsx(
                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
                type === v
                  ? "bg-amber-500 text-canvas"
                  : "text-secondary hover:text-primary",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice no. or party..."
              className="input-field pl-9"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field w-36"
          >
            <option value="">All Status</option>
            {["draft", "sent", "paid", "partial", "overdue", "cancelled"].map(
              (s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ),
            )}
          </select>
          {someSelected ? (
            <div className="flex items-center gap-2 ml-auto animate-slide-up">
              <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                {selected.size} selected
              </span>
              <div className="relative">
                <button
                  onClick={() => setBulkMenu((o) => !o)}
                  disabled={bulkLoading}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-2"
                >
                  {bulkLoading ? "..." : "Bulk Actions"}{" "}
                  <ChevronDown size={12} />
                </button>
                {bulkMenu && (
                  <div
                    className="absolute right-0 top-9 z-30 bg-card border border-border rounded-xl shadow-modal w-44 py-1 animate-slide-up"
                    onMouseLeave={() => setBulkMenu(false)}
                  >
                    <button
                      onClick={() => bulkMarkStatus("sent")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-info hover:bg-info/10"
                    >
                      <Send size={13} /> Mark Sent
                    </button>
                    <button
                      onClick={() => bulkMarkStatus("paid")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-success hover:bg-success/10"
                    >
                      <CheckCircle size={13} /> Mark Paid
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={bulkExport}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-secondary hover:bg-border"
                    >
                      <Download size={13} /> Export CSV
                    </button>
                    <button
                      onClick={() => setSelected(new Set())}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted hover:bg-border"
                    >
                      <XCircle size={13} /> Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <span className="text-xs text-muted ml-auto">
              {pagination?.total ?? 0} invoices
            </span>
          )}
        </div>
        <div className="bg-card border border-border rounded-2xl overflow-visible">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="w-10 px-3 py-3">
                  <button
                    onClick={toggleAll}
                    className="text-muted hover:text-primary transition-colors"
                  >
                    {allSelected ? (
                      <CheckSquare size={15} className="text-amber-500" />
                    ) : (
                      <Square size={15} />
                    )}
                  </button>
                </th>
                {[
                  "Invoice No.",
                  "Party",
                  "Date",
                  "Due Date",
                  "Status",
                  "Amount",
                  "Balance",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className={clsx(
                      "table-head",
                      (h === "Date" || h === "Due Date") &&
                        "hidden md:table-cell",
                      h === "Balance" && "hidden lg:table-cell",
                      h === "" && "w-10",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows rows={8} cols={9} />
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={FileText}
                      title="No invoices yet"
                      message={`Create your first ${TYPE_LABELS[type].toLowerCase()}.`}
                      action={
                        <Link
                          to="/invoices/new"
                          className="btn-primary flex items-center gap-2"
                        >
                          <Plus size={14} />
                          New Invoice
                        </Link>
                      }
                    />
                  </td>
                </tr>
              ) : (
                list.map((inv) => {
                  const isSel = selected.has(inv._id);
                  return (
                    <tr
                      key={inv._id}
                      className={clsx(
                        "table-row group cursor-pointer",
                        isSel && "bg-amber-500/5",
                      )}
                      onClick={() => navigate(`/invoices/${inv._id}`)}
                    >
                      <td
                        className="px-3 py-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOne(inv._id);
                        }}
                      >
                        <button className="text-muted hover:text-amber-500 transition-colors">
                          {isSel ? (
                            <CheckSquare size={15} className="text-amber-500" />
                          ) : (
                            <Square
                              size={15}
                              className="opacity-0 group-hover:opacity-100"
                            />
                          )}
                        </button>
                      </td>
                      <td className="table-cell">
                        <span className="font-mono font-bold text-amber-400 text-sm">
                          {inv.invoiceNo}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="font-semibold text-primary text-sm">
                            {inv.partySnapshot?.name}
                          </p>
                          {inv.partySnapshot?.gstin && (
                            <p className="text-xs text-muted font-mono">
                              {inv.partySnapshot.gstin.slice(0, 10)}...
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="table-cell hidden md:table-cell text-secondary text-xs">
                        {fmtD(inv.invoiceDate)}
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span
                          className={clsx(
                            "text-xs",
                            new Date(inv.dueDate) < new Date() &&
                              inv.status !== "paid"
                              ? "text-danger font-semibold"
                              : "text-secondary",
                          )}
                        >
                          {fmtD(inv.dueDate)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <Badge variant={STATUS_BADGE[inv.status]}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="table-cell text-right font-mono font-bold">
                        \u20b9{fmt(inv.totals?.grandTotal)}
                      </td>
                      <td className="table-cell text-right hidden lg:table-cell">
                        <span
                          className={clsx(
                            "font-mono text-sm",
                            inv.balanceDue > 0 ? "text-danger" : "text-success",
                          )}
                        >
                          \u20b9{fmt(inv.balanceDue)}
                        </span>
                      </td>
                      <td
                        className="table-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative">
                          <button
                            onClick={() =>
                              setMenu(openMenu === inv._id ? null : inv._id)
                            }
                            className="p-1.5 text-muted hover:text-primary hover:bg-border rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <MoreVertical size={14} />
                          </button>
                          {openMenu === inv._id && (
                            <div
                              className="absolute right-0 top-8 z-30 bg-card border border-border rounded-xl shadow-modal w-40 py-1 animate-slide-up"
                              onMouseLeave={() => setMenu(null)}
                            >
                              <button
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-secondary hover:bg-border"
                                onClick={() => navigate(`/invoices/${inv._id}`)}
                              >
                                <Eye size={13} /> View
                              </button>
                              {inv.status === "draft" && (
                                <button
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-secondary hover:bg-border"
                                  onClick={() =>
                                    navigate(`/invoices/${inv._id}/edit`)
                                  }
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-secondary hover:bg-border"
                                onClick={(e) => handleDownloadPdf(inv, e)}
                              >
                                <Download size={13} /> PDF
                              </button>
                              {inv.status !== "paid" && (
                                <button
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-success hover:bg-success/10"
                                  onClick={() => handleMarkPaid(inv)}
                                >
                                  <CheckCircle size={13} /> Mark Paid
                                </button>
                              )}
                              {inv.status === "draft" && (
                                <button
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger/10"
                                  onClick={() => {
                                    setConfirm(inv);
                                    setMenu(null);
                                  }}
                                >
                                  <Trash2 size={13} /> Void
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page === pagination.totalPages}
                className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Void Invoice"
        message={`Void invoice "${confirm?.invoiceNo}"?`}
      />
    </div>
  );
}
