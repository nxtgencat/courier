import { useEffect, useState } from 'react';
import { MapPin, Search, TriangleAlert } from 'lucide-react';
import { AppShell } from '../components/layout';
import { Timeline } from '../components/shipmentPanels';
import { EmptyState, SkeletonRows, StatusBadge } from '../components/ui';
import { useCourier } from '../store/CourierContext';
import { formatDate, parseTrackingInput } from '../lib/format';

export function TrackingPage() {
  const { shipments, customerName, loading, loadError, reload } = useCourier();
  const [raw, setRaw] = useState('');
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [primed, setPrimed] = useState(false);

  useEffect(() => {
    if (!primed && !loading && shipments.length > 0) {
      const sample = shipments.slice(0, 2).map((s) => s.trackingNumber).join(', ');
      setRaw(sample);
      setIds(parseTrackingInput(sample));
      setPrimed(true);
    }
  }, [primed, loading, shipments]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseTrackingInput(raw);
    setBusy(true);
    setIds([]);
    window.setTimeout(() => {
      setIds(parsed);
      setBusy(false);
    }, 350);
  };

  return (
    <AppShell title="Tracking">
      {loadError && !loading ? (
        <div className="panel px-5 py-4 mb-5 text-sm flex flex-wrap items-center gap-3">
          <span className="text-mute">{loadError}</span>
          <button type="button" onClick={reload} className="btn !h-9 ml-auto">Retry DummyJSON sync</button>
        </div>
      ) : null}
      <form onSubmit={submit} className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-3 text-mute"><Search size={18} /></span>
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            aria-label="Tracking numbers"
            placeholder={shipments[0]?.trackingNumber ? `${shipments[0].trackingNumber}, ${shipments[1]?.trackingNumber ?? ''}` : 'Enter tracking numbers'}
            className="inp !pl-10 font-mono"
          />
        </div>
        <button type="submit" className="btn btn-p" disabled={busy || loading}>Track</button>
      </form>

      {loading || busy ? (
        <div className="panel p-6"><SkeletonRows count={2} /></div>
      ) : ids.length === 0 ? (
        <div className="panel overflow-hidden">
          <EmptyState icon={MapPin} title="Enter a tracking number" hint="Paste one or several numbers separated by commas to trace them together." />
        </div>
      ) : (
        <div className="space-y-5">
          {ids.map((id) => {
            const s = shipments.find((x) => x.trackingNumber === id);
            if (!s) {
              return (
                <div key={id} className="panel p-6 flex items-center gap-4">
                  <span className="size-11 rounded-xl bg-bg grid place-items-center text-xl text-red-600">
                    <TriangleAlert size={22} />
                  </span>
                  <div>
                    <p className="font-mono font-medium">{id}</p>
                    <p className="text-sm text-mute">No shipment found with this number. Check it and try again.</p>
                  </div>
                </div>
              );
            }
            const last = s.history[s.history.length - 1];
            return (
              <article key={id} className="panel p-6 up">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-lg font-semibold">{s.trackingNumber}</p>
                    <p className="text-sm text-mute mt-0.5">{customerName(s.senderId)} to {customerName(s.receiverId)}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-sm">
                  <div><dt className="text-mute text-xs">Current location</dt><dd className="font-medium mt-0.5">{last.location}</dd></div>
                  <div><dt className="text-mute text-xs">Expected delivery</dt><dd className="font-medium mt-0.5">{formatDate(s.eta)}</dd></div>
                  <div><dt className="text-mute text-xs">Parcel</dt><dd className="font-medium mt-0.5">{s.type}, {s.weight} kg</dd></div>
                  <div><dt className="text-mute text-xs">Destination</dt><dd className="font-medium mt-0.5 truncate">{s.drop.split(', ').pop()}</dd></div>
                </dl>
                <div className="border-t border-line mt-5 pt-5">
                  <Timeline shipment={s} />
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="text-xs text-mute mt-4">Tracking resolved against DummyJSON shipments. Separate multiple numbers with commas.</p>
    </AppShell>
  );
}
