import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Search, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { AppShell } from '../components/layout';
import { CustomerModal, CustomerProfile } from '../components/customerPanels';
import { ShipmentDetail, ShipmentModal } from '../components/shipmentPanels';
import { Drawer, EmptyState, Modal, PaginationFooter, SkeletonRows } from '../components/ui';
import { useCourier } from '../store/CourierContext';
import type { Customer, Shipment } from '../types';

const PER = 8;

export function CustomersPage() {
  const { customers, shipments, loading, deleteCustomer } = useCourier();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(params.get('new') === '1');
  const [editing, setEditing] = useState<Customer | undefined>(undefined);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [shipmentId, setShipmentId] = useState<number | null>(null);
  const [editingShipment, setEditingShipment] = useState<Shipment | undefined>(undefined);

  const closeNew = () => {
    if (params.get('new')) {
      params.delete('new');
      setParams(params, { replace: true });
    }
    setCreating(false);
  };

  const query = q.toLowerCase();
  const filtered = customers.filter((c) =>
    !query ? true : `${c.name} ${c.email} ${c.city} ${c.phone}`.toLowerCase().includes(query),
  );
  const total = filtered.length;
  const rows = filtered.slice((page - 1) * PER, page * PER);
  const profile = profileId != null ? customers.find((c) => c.id === profileId) : undefined;
  const shipDetail = shipmentId != null ? shipments.find((s) => s.id === shipmentId) : undefined;

  return (
    <AppShell title="Customers">
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-3 text-mute"><Search size={18} /></span>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by name, city, email or mobile"
            aria-label="Search customers"
            className="inp !pl-10"
          />
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn btn-p">
          <UserPlus size={16} /> Add customer
        </button>
      </div>

      {loading ? (
        <div className="panel p-6"><SkeletonRows count={6} /></div>
      ) : (
        <div className="panel overflow-hidden">
          {total === 0 ? (
            <EmptyState icon={Users} title="No customers found" hint="Try a different name, city or email." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="text-left text-mute text-xs">
                    <tr>
                      <th className="px-5 py-3 font-medium">Customer</th>
                      <th className="font-medium">Mobile</th>
                      <th className="font-medium">City</th>
                      <th className="font-medium">Shipments</th>
                      <th><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((c) => (
                      <tr key={c.id} className="rowlink" onClick={() => setProfileId(c.id)}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="size-9 rounded-full bg-bg grid place-items-center font-semibold text-mute">{c.name[0]}</span>
                            <div><p className="font-medium">{c.name}</p><p className="text-xs text-mute">{c.email}</p></div>
                          </div>
                        </td>
                        <td className="font-mono text-mute">{c.phone}</td>
                        <td>{c.city}, {c.zip}</td>
                        <td className="font-mono">{shipments.filter((s) => s.senderId === c.id || s.receiverId === c.id).length}</td>
                        <td className="pr-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => setEditing(c)} className="text-mute hover:text-ink p-1.5" aria-label={`Edit ${c.name}`}>
                            <Pencil size={18} />
                          </button>
                          <button type="button" onClick={() => setConfirmId(c.id)} className="text-mute hover:text-red-600 p-1.5" aria-label={`Delete ${c.name}`}>
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

      {creating ? <CustomerModal onClose={closeNew} /> : null}
      {editing ? <CustomerModal customer={editing} onClose={() => setEditing(undefined)} /> : null}
      {profile ? (
        <Drawer label={`Customer ${profile.name}`} onClose={() => setProfileId(null)}>
          <CustomerProfile customer={profile} onClose={() => setProfileId(null)} onSelectShipment={(id) => setShipmentId(id)} />
        </Drawer>
      ) : null}
      {shipDetail ? (
        <Drawer label={`Shipment ${shipDetail.trackingNumber}`} onClose={() => setShipmentId(null)}>
          <ShipmentDetail
            shipment={shipDetail}
            onClose={() => setShipmentId(null)}
            onEdit={() => { setShipmentId(null); setEditingShipment(shipDetail); }}
            onDelete={() => setShipmentId(null)}
          />
        </Drawer>
      ) : null}
      {editingShipment ? <ShipmentModal shipment={editingShipment} onClose={() => setEditingShipment(undefined)} /> : null}
      {confirmId != null ? (
        <Modal
          title="Delete customer?"
          onClose={() => setConfirmId(null)}
          footer={
            <>
              <button type="button" onClick={() => setConfirmId(null)} className="btn">Cancel</button>
              <button
                type="button"
                className="btn btn-p !bg-red-600"
                onClick={() => {
                  deleteCustomer(confirmId);
                  toast.success('Customer deleted');
                  setConfirmId(null);
                  setProfileId(null);
                }}
              >
                Delete
              </button>
            </>
          }
        >
          <p className="text-sm text-mute">This cannot be undone. Past shipments keep the stored name.</p>
        </Modal>
      ) : null}
    </AppShell>
  );
}
