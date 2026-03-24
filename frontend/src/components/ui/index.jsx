import { useEffect } from 'react';
import { X, AlertCircle, Inbox, Loader2 } from 'lucide-react';
import clsx from 'clsx';

// ─── Modal ──────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) { document.addEventListener('keydown', handleKey); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative w-full bg-card border border-border rounded-2xl shadow-modal animate-slide-up', sizes[size])}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display font-semibold text-base text-primary">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors p-1 rounded-lg hover:bg-border">
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">{children}</div>
        {/* Footer */}
        {footer && <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

// ─── FormField ──────────────────────────────────────────────────────
export function FormField({ label, error, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="label">
          {label}{required && <span className="text-amber-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Input ──────────────────────────────────────────────────────────
export function Input({ className, error, ...props }) {
  return (
    <input
      className={clsx('input-field', error && 'border-danger/50 focus:border-danger/50 focus:ring-danger/10', className)}
      {...props}
    />
  );
}

// ─── Select ─────────────────────────────────────────────────────────
export function Select({ className, error, children, ...props }) {
  return (
    <select
      className={clsx(
        'input-field appearance-none',
        error && 'border-danger/50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

// ─── Textarea ───────────────────────────────────────────────────────
export function Textarea({ className, error, rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={clsx('input-field resize-none', error && 'border-danger/50', className)}
      {...props}
    />
  );
}

// ─── Badge ──────────────────────────────────────────────────────────
export function Badge({ variant = 'muted', children, className }) {
  const variants = {
    amber: 'badge-amber', green: 'badge-green', red: 'badge-red',
    blue: 'badge-blue',   muted: 'badge-muted',
  };
  return <span className={clsx('badge', variants[variant], className)}>{children}</span>;
}

// ─── Spinner ────────────────────────────────────────────────────────
export function Spinner({ size = 16, className }) {
  return <Loader2 size={size} className={clsx('animate-spin text-amber-500', className)} />;
}

// ─── PageLoader ─────────────────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={24} />
    </div>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────
export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-border flex items-center justify-center mb-4">
        <Icon size={24} className="text-muted" />
      </div>
      <p className="font-display font-semibold text-primary mb-1">{title}</p>
      {message && <p className="text-sm text-muted max-w-sm mb-5">{message}</p>}
      {action}
    </div>
  );
}

// ─── ConfirmDialog ──────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner size={14} /> : 'Confirm'}
          </button>
        </>
      }
    >
      <p className="text-sm text-secondary">{message}</p>
    </Modal>
  );
}

// ─── Skeleton Rows ──────────────────────────────────────────────────
export function SkeletonRows({ rows = 5, cols = 4 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i} className="border-b border-border">
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="px-4 py-3">
          <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  ));
}

// ─── StatCard ───────────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon: Icon, trend, color = 'amber' }) {
  const colors = {
    amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  icon: 'text-amber-500'  },
    green:  { bg: 'bg-success/10',    border: 'border-success/20',    icon: 'text-success'    },
    blue:   { bg: 'bg-info/10',       border: 'border-info/20',       icon: 'text-info'       },
    red:    { bg: 'bg-danger/10',     border: 'border-danger/20',     icon: 'text-danger'     },
  };
  const c = colors[color];

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-secondary font-semibold uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center border', c.bg, c.border)}>
            <Icon size={15} className={c.icon} />
          </div>
        )}
      </div>
      <p className="font-display font-bold text-2xl text-primary mb-0.5">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
