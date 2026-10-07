import type { ApiCart, ApiProduct, ApiUser } from './api';
import type { Customer, DeliveryStatus, Notice, Shipment } from '../types';
import { STATUSES } from '../types';
import { makeTrackingNumber } from './format';

const STATUS_NOTES: Record<DeliveryStatus, string> = {
  Pending: 'Order registered',
  'Picked Up': 'Collected from sender',
  'In Transit': 'Departed origin hub',
  'Out for Delivery': 'With delivery partner',
  Delivered: 'Handed to receiver',
  Cancelled: 'Cancelled by sender',
  'Failed Delivery': 'Receiver unavailable',
};

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function addressOf(u: ApiUser): string {
  return `${u.address.address}, ${u.address.city} ${u.address.postalCode}`;
}

export function mapUser(u: ApiUser): Customer {
  return {
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email.toLowerCase(),
    phone: u.phone.slice(0, 20),
    address: u.address.address,
    city: u.address.city,
    zip: u.address.postalCode,
  };
}

function flowFor(status: DeliveryStatus): DeliveryStatus[] {
  if (status === 'Cancelled') return ['Pending', 'Cancelled'];
  if (status === 'Failed Delivery') return ['Pending', 'Picked Up', 'In Transit', 'Out for Delivery', 'Failed Delivery'];
  const idx = STATUSES.indexOf(status);
  return STATUSES.slice(0, idx + 1);
}

export function buildShipments(carts: ApiCart[], users: ApiUser[], products: ApiProduct[]): Shipment[] {
  const byId = new Map(users.map((u) => [u.id, u]));
  return carts.map((cart) => {
    const sender = byId.get(cart.userId) ?? users[cart.id % users.length];
    let receiver = users[(cart.userId + cart.totalQuantity + cart.products.length) % users.length] ?? users[0];
    if (receiver.id === sender.id) receiver = users[(sender.id + 1) % users.length] ?? receiver;

    const firstItem = cart.products[0];
    const product = products.find((p) => p.id === firstItem?.id) ?? products[cart.id % products.length];

    const weight = product && product.weight > 0 ? product.weight : Math.max(1, cart.totalQuantity);
    const type = product ? product.category : 'general';

    const shipOffset = -((cart.id * 13) % 180);
    const date = isoDate(shipOffset);
    const eta = isoDate(shipOffset + 2 + (cart.id % 5));

    const status: DeliveryStatus = STATUSES[(cart.id * 5 + cart.totalQuantity) % STATUSES.length];
    const flow = flowFor(status);

    const midA = users[(sender.id + 3) % users.length]?.address.city ?? sender.address.city;
    const midB = users[(receiver.id + users.length - 2) % users.length]?.address.city ?? receiver.address.city;
    const route = [sender.address.city, midA, midB, receiver.address.city];

    const base = new Date(date);
    base.setHours(9, 0, 0, 0);
    const history = flow.map((s, j) => ({
      status: s,
      at: new Date(base.getTime() + j * 9 * 36e5).toISOString(),
      location: j === flow.length - 1 && (s === 'Delivered' || s === 'Failed Delivery') ? receiver.address.city : route[j % route.length],
      note: STATUS_NOTES[s],
    }));

    return {
      id: cart.id,
      trackingNumber: makeTrackingNumber(cart.id),
      senderId: sender.id,
      receiverId: receiver.id,
      pickup: addressOf(sender),
      drop: addressOf(receiver),
      weight: +weight.toFixed(1),
      type,
      date,
      eta,
      status,
      history,
    };
  });
}

export function buildNotices(shipments: Shipment[], customerName: (id: number) => string): Notice[] {
  const events = shipments
    .flatMap((s) => s.history.map((h, j) => ({ ...h, tn: s.trackingNumber, first: j === 0, senderId: s.senderId })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return events.map((e, i) => {
    const kind = e.status === 'Delivered' ? 'ok' : e.status === 'Failed Delivery' ? 'bad' : e.first ? 'new' : 'up';
    const title =
      e.status === 'Delivered'
        ? 'Delivery completed'
        : e.status === 'Failed Delivery'
          ? 'Failed delivery alert'
          : e.first
            ? 'Shipment created'
            : 'Status updated';
    const message =
      e.status === 'Delivered'
        ? `${e.tn} reached ${customerName(e.senderId)}`
        : e.status === 'Failed Delivery'
          ? `${e.tn}: receiver unavailable`
          : e.first
            ? `${e.tn} was booked`
            : `${e.tn} is now ${e.status}`;
    return {
      id: `api-${e.tn}-${i}`,
      title,
      message,
      kind,
      at: new Date(e.at).getTime(),
      read: i >= 3,
    };
  });
}

export function parcelTypesFrom(products: ApiProduct[]): string[] {
  return [...new Set(products.map((p) => p.category))].sort();
}
