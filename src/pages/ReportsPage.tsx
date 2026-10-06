import type { CSSProperties } from 'react';
import { AppShell } from '../components/layout';
import { SkeletonRows, StatusBadge } from '../components/ui';
import { useCourier } from '../store/CourierContext';
import { STATUSES, statusClass } from '../types';

const MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const BASE_VOLUME = [142, 168, 155, 191, 214];
const TREND = [22, 28, 25, 34, 31, 39, 36, 44, 41, 48, 46, 53];

export function ReportsPage() {
  const { shipments, customers, loading } = useCourier();

  const total = shipments.length;
  const counts = STATUSES.map((s) => ({ status: s, n: shipments.filter((x) => x.status === s).length }));
  const delivered = counts[4]?.n ?? 0;
  const pending = counts[0]?.n ?? 0;

  const monthly = [...BASE_VOLUME, total + 176];
  const max = Math.max(...monthly);
  const points = TREND.map((v, i) => `${i * 30 + 10},${100 - v * 1.6}`).join(' ');
  const top = customers
    .map((c) => ({ name: c.name, sent: shipments.filter((s) => s.senderId === c.id).length }))
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 5);

  return (
    <AppShell title="Reports">
      {loading ? (
        <div className="panel p-6"><SkeletonRows count={5} /></div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-x-6 gap-y-4 panel p-6 mb-6">
            {[
              ['Total shipments', total],
              ['Delivered parcels', delivered],
              ['Pending deliveries', pending],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-sm text-mute">{label}</p>
                <p className="text-3xl font-semibold font-mono mt-1">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="panel p-6">
              <h3 className="font-semibold">Monthly shipments</h3>
              <svg viewBox="0 0 390 200" className="w-full mt-4" role="img" aria-label="Monthly shipment report">
                {monthly.map((v, i) => {
                  const h = (v / max) * 150;
                  return (
                    <g key={MONTHS[i]}>
                      <rect x={i * 64 + 14} y={170 - h} width="38" height={h} rx="8" fill={i === 5 ? 'var(--acc)' : 'var(--line)'} />
                      <text x={i * 64 + 33} y="190" textAnchor="middle" fontSize="12" fill="var(--mute)">{MONTHS[i]}</text>
                      <text x={i * 64 + 33} y={164 - h} textAnchor="middle" fontSize="12" fill="var(--ink)" fontFamily="Geist Mono">{v}</text>
                    </g>
                  );
                })}
              </svg>
            </section>

            <section className="panel p-6">
              <h3 className="font-semibold">Shipment trend, last 12 weeks</h3>
              <svg viewBox="0 0 340 120" className="w-full mt-6" role="img" aria-label="Shipment trend">
                <polyline points={points} fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </section>

            <section className="panel p-6">
              <h3 className="font-semibold mb-4">Delivery performance</h3>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5" aria-hidden="true">
                {counts
                  .filter((c) => c.n > 0)
                  .map((c) => (
                    <span
                      key={c.status}
                      className={`badge ${statusClass(c.status)} !h-3 !p-0 !rounded-none`}
                      style={{ width: `${total === 0 ? 0 : (c.n / total) * 100}%`, background: 'var(--c)' } as CSSProperties}
                    />
                  ))}
              </div>
              <ul className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {counts.map((c) => (
                  <li key={c.status} className="flex items-center justify-between gap-2">
                    <StatusBadge status={c.status} />
                    <span className="font-mono">{total === 0 ? '0.0%' : `${((c.n / total) * 100).toFixed(1)}%`}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel p-6">
              <h3 className="font-semibold mb-2">Top customers</h3>
              <ol className="divide-y divide-line">
                {top.map((t, i) => (
                  <li key={t.name} className="flex items-center gap-3 py-3 text-sm">
                    <span className="font-mono text-mute w-5">{i + 1}</span>
                    <span className="flex-1 font-medium">{t.name}</span>
                    <span className="font-mono">{t.sent} sent</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}
