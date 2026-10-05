import { useNavigate } from 'react-router-dom';
import { ChartBar, MapPin, Package, UserPlus } from 'lucide-react';
import { AppShell } from '../components/layout';
import { SkeletonRows, StatusBadge } from '../components/ui';
import { useAuth } from '../store/AuthContext';
import { useCourier } from '../store/CourierContext';
import { formatDate, timeAgo, todayIso } from '../lib/format';

export function DashboardPage() {
  const { user } = useAuth();
  const { shipments, customers, loading, loadError, customerName, reload } = useCourier();
  const navigate = useNavigate();

  const count = (s: string) => shipments.filter((x) => x.status === s).length;
  const today = shipments.filter((s) => s.date === todayIso(0));
  const delivered = count('Delivered');
  const failed = count('Failed Delivery');
  const rate = delivered + failed === 0 ? 100 : +((delivered / (delivered + failed)) * 100).toFixed(1);
  const first = (user?.name ?? 'there').split(' ')[0];
  const C = 2 * Math.PI * 52;

  const stats: Array<[string, number]> = [
    ['Total shipments', shipments.length],
    ['In transit', count('In Transit') + count('Out for Delivery')],
    ['Delivered', delivered],
    ['Pending', count('Pending')],
    ['Total customers', customers.length],
    ["Today's shipments", today.length],
  ];

  const activity = shipments
    .flatMap((s) => s.history.map((h) => ({ ...h, tn: s.trackingNumber })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  return (
    <AppShell title="Dashboard">
      {loading ? (
        <SkeletonRows count={6} />
      ) : (
        <>
          {loadError ? (
            <div className="panel px-5 py-4 mb-6 text-sm flex flex-wrap items-center gap-3">
              <span className="text-mute">{loadError}</span>
              <button type="button" onClick={reload} className="btn !h-9 ml-auto">
                Retry directory sync
              </button>
            </div>
          ) : null}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">Good morning, {first}</h1>
            <p className="text-mute mt-1">
              {today.length} shipments booked today, {count('Out for Delivery')} out for delivery right now.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_1.9fr] gap-6">
            <section className="panel p-6 flex items-center gap-6" aria-label="Delivery success rate">
              <svg width="132" height="132" viewBox="0 0 120 120" className="shrink-0 -rotate-90" role="img" aria-label={`Success rate ${rate} percent`}>
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="var(--acc)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(C * rate) / 100} ${C}`}
                />
              </svg>
              <div>
                <p className="text-sm text-mute">Delivery success rate</p>
                <p className="text-5xl font-semibold tracking-tight mt-1">{rate}%</p>
                <p className="text-sm text-mute mt-2">Delivered vs failed attempts</p>
              </div>
            </section>
            <section className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-6 panel p-6" aria-label="Totals">
              {stats.map(([label, value]) => (
                <div key={label}>
                  <p className="text-sm text-mute">{label}</p>
                  <p className="text-3xl font-semibold tracking-tight mt-1 font-mono">{value}</p>
                </div>
              ))}
            </section>
          </div>

          <div className="grid lg:grid-cols-[1.9fr_1.1fr] gap-6 mt-6">
            <section className="panel p-6">
              <h3 className="font-semibold mb-4">Recent activity</h3>
              <ul className="divide-y divide-line">
                {activity.map((a, i) => (
                  <li key={`${a.tn}-${a.at}-${i}`} className="py-3 flex items-center gap-3">
                    <span className="size-9 rounded-xl bg-bg grid place-items-center text-mute">
                      <Package size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-mono font-medium">{a.tn}</span> {a.note.toLowerCase()}
                      </p>
                      <p className="text-xs text-mute">
                        {a.location}, {timeAgo(new Date(a.at).getTime())}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="font-semibold mb-4">Quick actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => navigate('/shipments?new=1')} className="panel p-5 text-left hover:-translate-y-0.5 transition-transform !bg-acc !text-accfg !border-transparent">
                  <span className="text-2xl block mb-6"><Package size={24} /></span>
                  <span className="font-medium text-sm">New shipment</span>
                </button>
                <button type="button" onClick={() => navigate('/customers?new=1')} className="panel p-5 text-left hover:-translate-y-0.5 transition-transform">
                  <span className="text-2xl block mb-6"><UserPlus size={24} /></span>
                  <span className="font-medium text-sm">Add customer</span>
                </button>
                <button type="button" onClick={() => navigate('/tracking')} className="panel p-5 text-left hover:-translate-y-0.5 transition-transform">
                  <span className="text-2xl block mb-6"><MapPin size={24} /></span>
                  <span className="font-medium text-sm">Track parcel</span>
                </button>
                <button type="button" onClick={() => navigate('/reports')} className="panel p-5 text-left hover:-translate-y-0.5 transition-transform">
                  <span className="text-2xl block mb-6"><ChartBar size={24} /></span>
                  <span className="font-medium text-sm">View reports</span>
                </button>
              </div>
              <div className="panel p-5 mt-3 text-sm">
                <p className="font-medium">Today on the dock</p>
                {today.length === 0 ? (
                  <p className="text-mute mt-1">No bookings yet today.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {today.slice(0, 3).map((s) => (
                      <li key={s.id} className="flex justify-between gap-2">
                        <span className="font-mono">{s.trackingNumber}</span>
                        <span className="text-mute">{customerName(s.receiverId)} due {formatDate(s.eta)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}
