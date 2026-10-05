import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DeliveryStatus } from '../types';
import { statusClass } from '../types';

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  return <span className={`badge ${statusClass(status)}`}>{status}</span>;
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel p-6 ${className}`}>{children}</section>;
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error ? <span className="text-xs text-red-600 mt-1 block">{error}</span> : null}
    </label>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-16 text-center px-6">
      <span className="size-14 rounded-2xl bg-bg grid place-items-center mx-auto text-2xl text-mute">
        <Icon size={26} strokeWidth={1.8} />
      </span>
      <p className="font-semibold mt-4">{title}</p>
      <p className="text-sm text-mute mt-1 max-w-[320px] mx-auto">{hint}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="sk h-14" />
      ))}
    </div>
  );
}

export function PaginationFooter({
  total,
  page,
  per,
  onPage,
}: {
  total: number;
  page: number;
  per: number;
  onPage: (p: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * per + 1;
  const to = Math.min(total, page * per);
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-line text-sm text-mute">
      <span>
        {total === 0 ? '0 results' : `${from} to ${to} of ${total}`}
      </span>
      <div className="flex gap-2">
        <button type="button" className="btn !h-9" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button
          type="button"
          className="btn !h-9"
          disabled={to >= total}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 grid place-items-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="panel w-full max-w-[560px] max-h-[92dvh] overflow-y-auto up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-2xl text-mute hover:text-ink">
            <X size={22} />
          </button>
        </div>
        <div className="p-6">{children}</div>
        <div className="px-6 pb-6 flex justify-end gap-3">{footer}</div>
      </div>
    </div>
  );
}

export function Drawer({ onClose, label, children }: { onClose: () => void; label: string; children: ReactNode }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="sl absolute right-0 inset-y-0 w-full max-w-[460px] bg-card border-l border-line overflow-y-auto p-6"
      >
        {children}
      </aside>
    </div>
  );
}
