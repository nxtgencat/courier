import { Bell, CheckCircle2, CircleAlert, ListChecks, Package, Truck } from 'lucide-react';
import { toast } from 'react-toastify';
import { AppShell } from '../components/layout';
import { EmptyState, SkeletonRows } from '../components/ui';
import { useCourier } from '../store/CourierContext';
import { timeAgo } from '../lib/format';

const ICONS = {
  ok: CheckCircle2,
  bad: CircleAlert,
  new: Package,
  up: Truck,
} as const;

const TONE = {
  ok: 'text-emerald-600',
  bad: 'text-red-600',
  new: 'text-acc',
  up: 'text-blue-600',
} as const;

export function NotificationsPage() {
  const { notices, loading, unreadCount, markRead, markAllRead } = useCourier();

  return (
    <AppShell title="Notifications">
      {loading ? (
        <div className="panel p-6"><SkeletonRows count={5} /></div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-5">
            <p className="text-mute text-sm">{unreadCount} unread</p>
            <button
              type="button"
              onClick={() => { markAllRead(); toast.success('All notifications marked as read'); }}
              className="btn"
              disabled={unreadCount === 0}
            >
              <ListChecks size={16} /> Mark all as read
            </button>
          </div>
          <div className="panel overflow-hidden">
            {notices.length === 0 ? (
              <EmptyState icon={Bell} title="All caught up" hint="New shipment and delivery alerts will appear here." />
            ) : (
              <ul className="divide-y divide-line">
                {notices.map((n) => {
                  const Icon = ICONS[n.kind];
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="w-full text-left flex gap-4 p-5 hover:bg-bg"
                      >
                        <span className={`text-2xl ${TONE[n.kind]}`}><Icon size={24} /></span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${n.read ? 'text-mute' : 'font-semibold'}`}>{n.title}</p>
                          <p className="text-sm text-mute">{n.message}</p>
                        </div>
                        <span className="text-xs text-mute whitespace-nowrap">{timeAgo(n.at)}</span>
                        {n.read ? null : <span className="size-2 rounded-full bg-acc mt-1.5" aria-label="Unread" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
