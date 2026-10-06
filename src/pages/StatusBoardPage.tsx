import { useState } from 'react';
import { AppShell } from '../components/layout';
import { ShipmentDetail, ShipmentModal } from '../components/shipmentPanels';
import { Drawer, Modal, SkeletonRows, StatusBadge } from '../components/ui';
import { useCourier } from '../store/CourierContext';
import { STATUSES } from '../types';
import type { Shipment } from '../types';
import { formatDate } from '../lib/format';
import { toast } from 'react-toastify';

export function StatusBoardPage() {
  const { shipments, loading, customerName, deleteShipment } = useCourier();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Shipment | undefined>(undefined);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const detail = detailId != null ? shipments.find((s) => s.id === detailId) : undefined;

  return (
    <AppShell title="Delivery status">
      {loading ? (
        <div className="panel p-6"><SkeletonRows count={4} /></div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
          {STATUSES.map((st) => {
            const list = shipments.filter((s) => s.status === st);
            return (
              <section key={st} className="w-[270px] shrink-0" aria-label={st}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <StatusBadge status={st} />
                  <span className="font-mono text-sm text-mute">{list.length}</span>
                </div>
                <div className="space-y-3">
                  {list.slice(0, 5).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setDetailId(s.id)}
                      className="panel p-4 w-full text-left hover:-translate-y-0.5 transition-transform"
                    >
                      <p className="font-mono text-sm font-medium">{s.trackingNumber}</p>
                      <p className="text-xs text-mute mt-1">{customerName(s.receiverId)}</p>
                      <p className="text-xs text-mute">{s.drop.split(', ').pop()}, due {formatDate(s.eta)}</p>
                    </button>
                  ))}
                  {list.length === 0 ? (
                    <div className="border border-dashed border-line rounded-2xl p-6 text-center text-sm text-mute">Nothing here</div>
                  ) : null}
                  {list.length > 5 ? <p className="text-xs text-mute px-1">+{list.length - 5} more</p> : null}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {detail ? (
        <Drawer label={`Shipment ${detail.trackingNumber}`} onClose={() => setDetailId(null)}>
          <ShipmentDetail
            shipment={detail}
            onClose={() => setDetailId(null)}
            onEdit={() => { setDetailId(null); setEditing(detail); }}
            onDelete={() => setConfirmId(detail.id)}
          />
        </Drawer>
      ) : null}
      {editing ? <ShipmentModal shipment={editing} onClose={() => setEditing(undefined)} /> : null}
      {confirmId != null ? (
        <Modal
          title="Delete shipment?"
          onClose={() => setConfirmId(null)}
          footer={
            <>
              <button type="button" onClick={() => setConfirmId(null)} className="btn">Cancel</button>
              <button
                type="button"
                className="btn btn-p !bg-red-600"
                onClick={() => {
                  deleteShipment(confirmId);
                  toast.success('Shipment deleted');
                  setConfirmId(null);
                  setDetailId(null);
                }}
              >
                Delete
              </button>
            </>
          }
        >
          <p className="text-sm text-mute">This cannot be undone.</p>
        </Modal>
      ) : null}
    </AppShell>
  );
}
