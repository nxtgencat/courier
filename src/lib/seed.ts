import type { Customer, Notice, Shipment } from '../types';
import { HUBS, PARCEL_TYPES, STATUSES } from '../types';
import { makeTrackingNumber, todayIso } from './format';

const NAMES: Array<[string, string, string]> = [
  ['Aarav Menon', 'Hyderabad', '500034'],
  ['Lakshmi Prasad', 'Warangal', '506002'],
  ['Ravi Teja', 'Vijayawada', '520010'],
  ['Sneha Kulkarni', 'Pune', '411001'],
  ['Imran Sheikh', 'Bengaluru', '560001'],
  ['Divya Nair', 'Kochi', '682016'],
  ['Karthik Rao', 'Chennai', '600017'],
  ['Meera Joshi', 'Mumbai', '400050'],
  ['Harsha Vardhan', 'Hyderabad', '500081'],
  ['Pooja Iyer', 'Chennai', '600028'],
  ['Naveen Chowdary', 'Vijayawada', '520008'],
  ['Farah Siddiqui', 'Bengaluru', '560038'],
];

const NOTES: Record<string, string> = {
  Pending: 'Order registered',
  'Picked Up': 'Collected from sender',
  'In Transit': 'Departed origin hub',
  'Out for Delivery': 'With delivery partner',
  Delivered: 'Handed to receiver',
  Cancelled: 'Cancelled by sender',
  'Failed Delivery': 'Receiver unavailable',
};

const PATTERN = [4, 4, 2, 3, 4, 0, 1, 4, 5, 2, 4, 6, 3, 4, 2, 1, 4, 4, 0, 2, 4, 3, 6, 4, 2, 4, 1, 4];

export function seedCustomers(): Customer[] {
  return NAMES.map(([name, city, zip], i) => ({
    id: i + 1,
    name,
    email: `${name.split(' ')[0].toLowerCase()}@mail.in`,
    phone: `98${48201000 + i * 7331}`.slice(0, 10),
    address: `${12 + i * 3}, Gandhi Road`,
    city,
    zip,
  }));
}

function historyFor(pattern: number, shipDate: Date, seed: number) {
  const flow: number[] =
    pattern === 5 ? [0, 5] : pattern === 6 ? [0, 1, 2, 3, 6] : Array.from({ length: pattern + 1 }, (_, k) => k);
  return flow.map((k, j) => {
    const status = STATUSES[k];
    return {
      status,
      at: new Date(shipDate.getTime() + j * 9 * 36e5).toISOString(),
      location: HUBS[(seed + j) % HUBS.length],
      note: NOTES[status],
    };
  });
}

export function seedShipments(customers: Customer[]): Shipment[] {
  return PATTERN.map((p, i) => {
    const shipDay = new Date();
    shipDay.setHours(0, 0, 0, 0);
    shipDay.setDate(shipDay.getDate() - (i % 25));
    const history = historyFor(p, shipDay, i);
    const sender = customers[i % customers.length];
    const receiver = customers[(i * 5 + 3) % customers.length];
    const eta = new Date(shipDay);
    eta.setDate(eta.getDate() + 2 + (i % 4));
    return {
      id: i + 1,
      trackingNumber: makeTrackingNumber(i + 1),
      senderId: sender.id,
      receiverId: receiver.id,
      pickup: `${sender.address}, ${sender.city}`,
      drop: `${receiver.address}, ${receiver.city}`,
      weight: +((0.4 + ((i * 1.37) % 18)).toFixed(1)),
      type: PARCEL_TYPES[i % PARCEL_TYPES.length],
      date: shipDay.toISOString().slice(0, 10),
      eta: eta.toISOString().slice(0, 10),
      status: history[history.length - 1].status,
      history,
    };
  });
}

export function seedNotices(): Notice[] {
  const now = Date.now();
  return [
    {
      id: 'n1',
      title: 'Delivery completed',
      message: 'RW482211IN reached Divya Nair',
      kind: 'ok',
      at: now - 36e5,
      read: false,
    },
    {
      id: 'n2',
      title: 'Failed delivery alert',
      message: 'RW482506IN: receiver unavailable',
      kind: 'bad',
      at: now - 5e6,
      read: false,
    },
    {
      id: 'n3',
      title: 'Shipment created',
      message: 'RW482580IN was booked',
      kind: 'new',
      at: now - 9e6,
      read: false,
    },
    {
      id: 'n4',
      title: 'Status updated',
      message: 'RW482321IN is now In Transit',
      kind: 'up',
      at: now - 2e7,
      read: true,
    },
    {
      id: 'n5',
      title: 'Delivery completed',
      message: 'RW482173IN reached Ravi Teja',
      kind: 'ok',
      at: now - 5e7,
      read: true,
    },
  ];
}

export { todayIso };
