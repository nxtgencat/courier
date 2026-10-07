export type DeliveryStatus =
  | 'Pending'
  | 'Picked Up'
  | 'In Transit'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Failed Delivery';

export type ParcelType = string;

export interface TrackingEvent {
  status: DeliveryStatus;
  at: string;
  location: string;
  note: string;
}

export interface Shipment {
  id: number;
  trackingNumber: string;
  senderId: number;
  receiverId: number;
  pickup: string;
  drop: string;
  weight: number;
  type: ParcelType;
  date: string;
  eta: string;
  status: DeliveryStatus;
  history: TrackingEvent[];
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
}

export type NoticeKind = 'ok' | 'bad' | 'new' | 'up';

export interface Notice {
  id: string;
  title: string;
  message: string;
  kind: NoticeKind;
  at: number;
  read: boolean;
}

export interface AuthUser {
  name: string;
  email: string;
}

export const STATUSES: DeliveryStatus[] = [
  'Pending',
  'Picked Up',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Failed Delivery',
];

export function statusClass(status: DeliveryStatus): string {
  return `s-${status.split(' ')[0]}`;
}
