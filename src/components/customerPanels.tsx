import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { EnvelopeIcon, MapPinIcon, PhoneIcon } from './icons';
import { useCourier } from '../store/CourierContext';
import type { CustomerInput } from '../store/CourierContext';
import type { Customer } from '../types';
import { Field, Modal, StatusBadge } from './ui';

export function CustomerModal({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const { createCustomer, updateCustomer } = useCourier();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({
    defaultValues: customer
      ? { name: customer.name, email: customer.email, phone: customer.phone, address: customer.address, city: customer.city, zip: customer.zip }
      : { name: '', email: '', phone: '', address: '', city: '', zip: '' },
  });

  const onSubmit = (v: CustomerInput) => {
    if (customer) {
      updateCustomer(customer.id, v);
      toast.success('Customer updated');
    } else {
      createCustomer(v);
      toast.success('Customer added');
    }
    onClose();
  };

  return (
    <Modal
      title={customer ? 'Edit customer' : 'Add customer'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn">Cancel</button>
          <button type="submit" form="customer-form" disabled={isSubmitting} className="btn btn-p">
            {customer ? 'Save changes' : 'Add customer'}
          </button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="Customer name" error={errors.name?.message}>
            <input className={`inp ${errors.name ? 'bad' : ''}`} {...register('name', { required: 'Enter a customer name' })} />
          </Field>
        </div>
        <Field label="Email" error={errors.email?.message}>
          <input
            type="email"
            className={`inp ${errors.email ? 'bad' : ''}`}
            {...register('email', { required: 'Enter an email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })}
          />
        </Field>
        <Field label="Mobile number" error={errors.phone?.message}>
          <input
            inputMode="tel"
            className={`inp ${errors.phone ? 'bad' : ''}`}
            {...register('phone', { required: 'Enter a mobile number', pattern: { value: /^[6-9]\d{9}$/, message: 'Enter a 10 digit mobile number' } })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address" error={errors.address?.message}>
            <input className={`inp ${errors.address ? 'bad' : ''}`} {...register('address', { required: 'Enter an address' })} />
          </Field>
        </div>
        <Field label="City" error={errors.city?.message}>
          <input className={`inp ${errors.city ? 'bad' : ''}`} {...register('city', { required: 'Enter a city' })} />
        </Field>
        <Field label="Postal code" error={errors.zip?.message}>
          <input
            className={`inp ${errors.zip ? 'bad' : ''}`}
            {...register('zip', { required: 'Enter a postal code', pattern: { value: /^\d{6}$/, message: 'Enter a 6 digit postal code' } })}
          />
        </Field>
      </form>
    </Modal>
  );
}

export function CustomerProfile({ customer, onClose, onSelectShipment }: { customer: Customer; onClose: () => void; onSelectShipment: (id: number) => void }) {
  const { shipments } = useCourier();
  const related = shipments.filter((s) => s.senderId === customer.id || s.receiverId === customer.id);

  return (
    <div>
      <div className="flex justify-between">
        <div className="flex items-center gap-4">
          <span className="size-14 rounded-full bg-ink text-card grid place-items-center text-xl font-semibold">{customer.name[0]}</span>
          <div>
            <p className="text-xl font-semibold">{customer.name}</p>
            <p className="text-sm text-mute">{customer.city}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-2xl text-mute hover:text-ink" aria-label="Close">×</button>
      </div>
      <dl className="mt-6 space-y-4 text-sm">
        <div className="flex gap-3">
          <span className="text-xl text-mute"><EnvelopeIcon /></span>
          <div><dt className="text-xs text-mute">Email</dt><dd className="font-medium">{customer.email}</dd></div>
        </div>
        <div className="flex gap-3">
          <span className="text-xl text-mute"><PhoneIcon /></span>
          <div><dt className="text-xs text-mute">Mobile</dt><dd className="font-medium">{customer.phone}</dd></div>
        </div>
        <div className="flex gap-3">
          <span className="text-xl text-mute"><MapPinIcon /></span>
          <div><dt className="text-xs text-mute">Address</dt><dd className="font-medium">{customer.address}, {customer.city} {customer.zip}</dd></div>
        </div>
      </dl>
      <p className="text-sm font-medium mt-8 mb-3">Shipments ({related.length})</p>
      {related.length === 0 ? (
        <p className="text-sm text-mute">No shipments yet. Book the first one for this customer.</p>
      ) : (
        <ul className="divide-y divide-line">
          {related.slice(0, 6).map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onSelectShipment(s.id)} className="w-full flex items-center justify-between py-3 text-left">
                <span className="font-mono text-sm">{s.trackingNumber}</span>
                <StatusBadge status={s.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
