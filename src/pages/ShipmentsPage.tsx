import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownUp, Package, Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { AppShell } from '../components/layout';
import { ShipmentDetail, ShipmentModal } from '../components/shipmentPanels';
import { Drawer, EmptyState, Modal, PaginationFooter, SkeletonRows, StatusBadge } from '../components/ui';
import { useCourier } from '../store/CourierContext';
import type { Shipment } from '../types';
import { PARCEL_TYPES, STATUSES } from '../types';
import { formatDate } from '../lib/format';

const PER = 8;

export function ShipmentsPage() {
  const { shipments, customers, loading, customerName, deleteShipment } = useCourier();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Shipment | undefined>(undefined);
  const [creating, setCreating] = useState(params.get('new') === '1');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const closeNewParam = () => {
    if (params.get('new')) {
      params.delete('new');
      setParams(params, { replace: true });
    }
    setCreating(false);
  };

  const query = q.toLowerCase();
  const filtered = shipments
    .filter((s) => (!type || s.type === type) && (!status || s.status === status))
    .filter((s) =>
      !query
        ? true
        : `${s.trackingNumber} ${customerName(s.senderId)} ${customerName(s.receiverId)}`.toLowerCase().includes(query),
    )
    .sort((a, b) => (sort === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));

  const total = filtered.length;
  const rows = filtered.slice((page - 1) * PER, page * PER);
  const detail = detailId != null ? shipments.find((s) => s.id === detailId) : undefined;

  return (
    <AppShell title="Shipments">
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-3.5 top-3 text-mute">
            <Search size={18} />
          </span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search tracking number or name"
            aria-label="Search shipments"
            className="inp !pl-10"
          />
        </div>
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Filter by type" className="inp !w-auto">
          <option value="">All types</option>
          {PARCEL_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status" className="inp !w-auto">
          <option value="">All statuses</option>
          {STATUSES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <button type="button" onClick={() => setSort((s) => (s === 'desc' ? 'asc' : 'desc'))} className="btn">
          <ArrowDownUp size={16} /> {sort === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {loading ? (
        <div className="panel p-6"><SkeletonRows count={6} /></div>
      ) : (
        <div className="panel overflow-hidden">
          {total === 0 ? (
            <EmptyState
              icon={Package}
              title="No shipments match"
              hint="Clear the search or filters, or book a new shipment."
              action={
                <button type="button" onClick={() => setCreating(true)} className="btn btn-p">
                  New shipment
                </button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[820px]">
                  <thead className="text-left text-mute text-xs">
                    <tr>
                      <th className="px-5 py-3 font-medium">Tracking no.</th>
                      <th className="font-medium">Sender</th>
                      <th className="font-medium">Receiver</th>
                      <th className="font-medium">Type</th>
                      <th className="font-medium">Shipped</th>
                      <th className="font-medium">Status</th>
                      <th><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((s) => (
                      <tr key={s.id} className="rowlink" onClick={() => setDetailId(s.id)}>
                        <td className="px-5 py-3.5 font-mono font-medium">{s.trackingNumber}</td>
                        <td>{customerName(s.senderId)}</td>
                        <td>{customerName(s.receiverId)}</td>
                        <td className="text-mute">{s.type}, {s.weight} kg</td>
                        <td className="text-mute">{formatDate(s.date)}</td>
                        <td><StatusBadge status={s.status} /></td>
                        <td className="pr-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setEditing(s)}
                            className="text-mute hover:text-ink p-1.5"
                            aria-label={`Edit ${s.trackingNumber}`}
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(s.id)}
                            className="text-mute hover:text-red-600 p-1.5"
                            aria-label={`Delete ${s.trackingNumber}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationFooter total={total} page={page} per={PER} onPage={setPage} />
            </>
          )}
        </div>
      )}

      <p className="text-xs text-mute mt-3">Directory: {customers.length} customers loaded. Shipment data is simulated locally with DummyJSON enrichment.</p>

      {creating ? <ShipmentModal onClose={closeNewParam} /> : null}
      {editing ? <ShipmentModal shipment={editing} onClose={() => setEditing(undefined)} /> : null}
      {detail ? (
        <Drawer label={`Shipment ${detail.trackingNumber}`} onClose={() => setDetailId(null)}>
          <ShipmentDetail
            shipment={detail}
            onClose={() => setDetailId(null)}
            onEdit={() => {
              setDetailId(null);
              setEditing(detail);
            }}
            onDelete={() => setConfirmId(detail.id)}
          />
        </Drawer>
      ) : null}
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
                  const found = deleteShipment(confirmId);
                  toast.success(found ? `${found.trackingNumber} deleted` : 'Shipment deleted');
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
