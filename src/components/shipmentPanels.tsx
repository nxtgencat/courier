import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Check, MapPin, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import type { DeliveryStatus, Shipment } from '../types';
import { PARCEL_TYPES, STATUSES } from '../types';
import { useAuth } from '../store/AuthContext';
import { useCourier } from '../store/CourierContext';
import type { ShipmentInput } from '../store/CourierContext';
import { Field, Modal, StatusBadge } from './ui';
import { formatDate, formatDateTime } from '../lib/format';

export function Timeline({ shipment }: { shipment: Shipment }) {
  const flow = [...shipment.history].reverse();
  return (
    <ol className="relative ml-3 border-l border-line space-y-6 pb-1">
      {flow.map((h, i) => (
        <li key={`${h.at}-${i}`} className="pl-6 relative">
          <span
            className={`absolute -left-[13px] top-0 size-6 rounded-full grid place-items-center text-xs ${
              i === 0 ? 'bg-acc text-accfg' : 'bg-card border border-line text-mute'
            }`}
          >
            {i === 0 ? <MapPin size={13} /> : <Check size={13} />}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={h.status} />
            <span className="text-xs text-mute">{formatDateTime(h.at)}</span>
          </div>
          <p className="text-sm mt-1.5">{h.note}</p>
          <p className="text-xs text-mute">{h.location}</p>
        </li>
      ))}
    </ol>
  );
}

interface ShipmentFormValues extends ShipmentInput {
  status: DeliveryStatus;
}

export function ShipmentModal({
  shipment,
  onClose,
}: {
  shipment?: Shipment;
  onClose: () => void;
}) {
  const { customers, createShipment, updateShipment } = useCourier();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ShipmentFormValues>({
    defaultValues: shipment
      ? {
          senderId: shipment.senderId,
          receiverId: shipment.receiverId,
          pickup: shipment.pickup,
          drop: shipment.drop,
          weight: shipment.weight,
          type: shipment.type,
          date: shipment.date,
          eta: shipment.eta,
          status: shipment.status,
        }
      : {
          senderId: customers[0]?.id ?? 1,
          receiverId: customers[1]?.id ?? 2,
          pickup: '',
          drop: '',
          weight: 1,
          type: 'Parcel',
          date: new Date().toISOString().slice(0, 10),
          eta: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10),
          status: 'Pending',
        },
  });

  const onSubmit = (v: ShipmentFormValues) => {
    if (v.eta < v.date) {
      toast.error('Expected date must be on or after shipping date');
      return;
    }
    if (v.senderId === v.receiverId) {
      toast.error('Sender and receiver must be different');
      return;
    }
    if (shipment) {
      updateShipment(shipment.id, v, v.status);
      toast.success('Shipment updated');
    } else {
      const rec = createShipment(v);
      toast.success(`Shipment ${rec.trackingNumber} created`);
    }
    onClose();
  };

  return (
    <Modal
      title={shipment ? 'Edit shipment' : 'New shipment'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn">
            Cancel
          </button>
          <button type="submit" form="shipment-form" disabled={isSubmitting} className="btn btn-p">
            {shipment ? 'Save changes' : 'Create shipment'}
          </button>
        </>
      }
    >
      <form id="shipment-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid sm:grid-cols-2 gap-4">
        {shipment ? (
          <p className="sm:col-span-2 text-sm text-mute">
            Tracking number <span className="font-mono text-ink font-medium">{shipment.trackingNumber}</span>
          </p>
        ) : (
          <p className="sm:col-span-2 text-sm text-mute">A tracking number is generated when you save.</p>
        )}
        <Field label="Sender" error={errors.senderId?.message}>
          <select className="inp" {...register('senderId', { valueAsNumber: true, required: 'Select a sender' })}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Receiver" error={errors.receiverId?.message}>
          <select className="inp" {...register('receiverId', { valueAsNumber: true, required: 'Select a receiver' })}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Pickup address" error={errors.pickup?.message}>
            <input className={`inp ${errors.pickup ? 'bad' : ''}`} {...register('pickup', { required: 'Enter a pickup address' })} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Delivery address" error={errors.drop?.message}>
            <input className={`inp ${errors.drop ? 'bad' : ''}`} {...register('drop', { required: 'Enter a delivery address' })} />
          </Field>
        </div>
        <Field label="Parcel weight (kg)" error={errors.weight?.message}>
          <input
            type="number"
            step="0.1"
            className={`inp ${errors.weight ? 'bad' : ''}`}
            {...register('weight', { valueAsNumber: true, required: 'Enter a weight', min: { value: 0.1, message: 'Enter a weight above 0' } })}
          />
        </Field>
        <Field label="Parcel type">
          <select className="inp" {...register('type')}>
            {PARCEL_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Shipping date" error={errors.date?.message}>
          <input type="date" className="inp" {...register('date', { required: 'Select a shipping date' })} />
        </Field>
        <Field label="Expected delivery" error={errors.eta?.message}>
          <input type="date" className="inp" {...register('eta', { required: 'Select an expected date' })} />
        </Field>
        {shipment ? (
          <div className="sm:col-span-2">
            <Field label="Delivery status">
              <select className="inp" {...register('status')}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

export function ShipmentDetail({
  shipment,
  onClose,
  onEdit,
  onDelete,
}: {
  shipment: Shipment;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { customerName, updateStatus } = useCourier();
  const { user } = useAuth();
  const [next, setNext] = useState<DeliveryStatus>(shipment.status);

  const rows: Array<[string, string]> = [
    ['Sender', customerName(shipment.senderId)],
    ['Receiver', customerName(shipment.receiverId)],
    ['Pickup', shipment.pickup],
    ['Delivery', shipment.drop],
    ['Weight', `${shipment.weight} kg`],
    ['Type', shipment.type],
    ['Shipped', formatDate(shipment.date)],
    ['Expected', formatDate(shipment.eta)],
  ];

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xl font-semibold">{shipment.trackingNumber}</p>
          <div className="mt-2">
            <StatusBadge status={shipment.status} />
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-2xl text-mute hover:text-ink" aria-label="Close">
          <X size={22} />
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm mt-6">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-mute">{k}</dt>
            <dd className="font-medium mt-0.5 break-words">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 border-t border-line pt-6">
        <p className="text-sm font-medium mb-2">Update delivery status</p>
        <div className="flex gap-2">
          <select value={next} onChange={(e) => setNext(e.target.value as DeliveryStatus)} className="inp" aria-label="New status">
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-p"
            onClick={() => {
              if (next === shipment.status) {
                toast.info('Status is unchanged');
                return;
              }
              updateStatus(shipment.id, next, (user?.name ?? 'Ops').split(' ')[0]);
              toast.success(`Status updated to ${next}`);
              onClose();
            }}
          >
            Update
          </button>
        </div>
      </div>
      <div className="mt-6 border-t border-line pt-6">
        <p className="text-sm font-medium mb-4">Status history</p>
        <Timeline shipment={shipment} />
      </div>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onEdit} className="btn flex-1 justify-center">
          <Pencil size={15} /> Edit
        </button>
        <button type="button" onClick={onDelete} className="btn flex-1 justify-center text-red-600">
          <Trash2 size={15} /> Delete
        </button>
      </div>
    </div>
  );
}

