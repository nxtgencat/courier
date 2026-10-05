import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Customer, DeliveryStatus, Notice, NoticeKind, Shipment } from '../types';
import { HUBS } from '../types';
import { fetchCustomersFromDummyJSON } from '../lib/api';
import { makeTrackingNumber } from '../lib/format';
import { seedCustomers, seedNotices, seedShipments } from '../lib/seed';
import { KEYS, readJSON, writeJSON } from '../lib/storage';

export interface ShipmentInput {
  senderId: number;
  receiverId: number;
  pickup: string;
  drop: string;
  weight: number;
  type: Shipment['type'];
  date: string;
  eta: string;
}

export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
}

interface CourierState {
  customers: Customer[];
  shipments: Shipment[];
  notices: Notice[];
  loading: boolean;
  loadError: string | null;
  apiLive: boolean;
  customerName: (id: number) => string;
  shipmentById: (id: number) => Shipment | undefined;
  shipmentByTracking: (tn: string) => Shipment | undefined;
  unreadCount: number;
  createShipment: (input: ShipmentInput) => Shipment;
  updateShipment: (id: number, input: ShipmentInput, status: DeliveryStatus) => void;
  deleteShipment: (id: number) => Shipment | undefined;
  updateStatus: (id: number, status: DeliveryStatus, actor: string) => boolean;
  createCustomer: (input: CustomerInput) => Customer;
  updateCustomer: (id: number, input: CustomerInput) => void;
  deleteCustomer: (id: number) => void;
  pushNotice: (title: string, message: string, kind: NoticeKind) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  reload: () => void;
}

const CourierCtx = createContext<CourierState | null>(null);
let noticeSeq = 100;

function loadCustomers(): Customer[] {
  const stored = readJSON<Customer[] | null>(KEYS.customers, null);
  if (stored && stored.length > 0) return stored;
  return seedCustomers();
}

function loadShipments(): Shipment[] {
  const stored = readJSON<Shipment[] | null>(KEYS.shipments, null);
  if (stored && stored.length > 0) return stored;
  const cust = readJSON<Customer[] | null>(KEYS.customers, null) ?? seedCustomers();
  return seedShipments(cust);
}

function loadNotices(): Notice[] {
  const stored = readJSON<Notice[] | null>(KEYS.notices, null);
  if (stored) return stored;
  return seedNotices();
}

export function CourierProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(loadCustomers);
  const [shipments, setShipments] = useState<Shipment[]>(loadShipments);
  const [notices, setNotices] = useState<Notice[]>(loadNotices);
  const [loading, setLoading] = useState<boolean>(() => readJSON(KEYS.customers, null) == null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiLive, setApiLive] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    writeJSON(KEYS.customers, customers);
  }, [customers]);
  useEffect(() => {
    writeJSON(KEYS.shipments, shipments);
  }, [shipments]);
  useEffect(() => {
    writeJSON(KEYS.notices, notices);
  }, [notices]);

  useEffect(() => {
    if (readJSON(KEYS.customers, null) != null && reloadKey === 0) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setLoadError(null);
    fetchCustomersFromDummyJSON()
      .then(({ data, live }) => {
        if (!alive) return;
        setCustomers(data);
        setApiLive(live);
        if (!live) setLoadError('Directory API unreachable. Showing local dispatch data.');
        if (readJSON(KEYS.shipments, null) == null) setShipments(seedShipments(data));
      })
      .catch(() => {
        if (!alive) return;
        setLoadError('Directory API unreachable. Showing local dispatch data.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const customerName = useCallback(
    (id: number) => customers.find((c) => c.id === id)?.name ?? 'Unknown',
    [customers],
  );
  const shipmentById = useCallback((id: number) => shipments.find((s) => s.id === id), [shipments]);
  const shipmentByTracking = useCallback(
    (tn: string) => shipments.find((s) => s.trackingNumber === tn.toUpperCase()),
    [shipments],
  );

  const pushNotice = useCallback((title: string, message: string, kind: NoticeKind) => {
    noticeSeq += 1;
    const id = `n${noticeSeq}`;
    setNotices((prev) => [{ id, title, message, kind, at: Date.now(), read: false }, ...prev].slice(0, 60));
  }, []);

  const createShipment = useCallback(
    (input: ShipmentInput) => {
      const id = shipments.length > 0 ? Math.max(...shipments.map((s) => s.id)) + 1 : 1;
      const trackingNumber = makeTrackingNumber(id);
      const record: Shipment = {
        id,
        trackingNumber,
        senderId: input.senderId,
        receiverId: input.receiverId,
        pickup: input.pickup,
        drop: input.drop,
        weight: input.weight,
        type: input.type,
        date: input.date,
        eta: input.eta,
        status: 'Pending',
        history: [{ status: 'Pending', at: new Date().toISOString(), location: HUBS[0], note: 'Order registered' }],
      };
      setShipments((prev) => [record, ...prev]);
      pushNotice('Shipment created', `${trackingNumber} was booked`, 'new');
      return record;
    },
    [shipments, pushNotice],
  );

  const updateShipment = useCallback((id: number, input: ShipmentInput, status: DeliveryStatus) => {
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const changed = s.status !== status;
        return {
          ...s,
          senderId: input.senderId,
          receiverId: input.receiverId,
          pickup: input.pickup,
          drop: input.drop,
          weight: input.weight,
          type: input.type,
          date: input.date,
          eta: input.eta,
          status,
          history: changed
            ? [...s.history, { status, at: new Date().toISOString(), location: HUBS[s.id % HUBS.length], note: 'Status updated' }]
            : s.history,
        };
      }),
    );
  }, []);

  const deleteShipment = useCallback(
    (id: number) => {
      const found = shipments.find((s) => s.id === id);
      setShipments((prev) => prev.filter((s) => s.id !== id));
      return found;
    },
    [shipments],
  );

  const updateStatus = useCallback(
    (id: number, status: DeliveryStatus, actor: string) => {
      let changed = false;
      let tn = '';
      setShipments((prev) =>
        prev.map((s) => {
          if (s.id !== id || s.status === status) return s;
          changed = true;
          tn = s.trackingNumber;
          return {
            ...s,
            status,
            history: [
              ...s.history,
              { status, at: new Date().toISOString(), location: HUBS[s.id % HUBS.length], note: `Status updated by ${actor}` },
            ],
          };
        }),
      );
      if (changed) {
        if (status === 'Delivered') pushNotice('Delivery completed', `${tn} is now Delivered`, 'ok');
        else if (status === 'Failed Delivery') pushNotice('Failed delivery alert', `${tn}: receiver unavailable`, 'bad');
        else pushNotice('Status updated', `${tn} is now ${status}`, 'up');
      }
      return changed;
    },
    [pushNotice],
  );

  const createCustomer = useCallback((input: CustomerInput) => {
    const record: Customer = { id: Date.now() % 100000, ...input };
    setCustomers((prev) => [record, ...prev]);
    return record;
  }, []);

  const updateCustomer = useCallback((id: number, input: CustomerInput) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...input } : c)));
  }, []);

  const deleteCustomer = useCallback((id: number) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotices((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotices((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const unreadCount = useMemo(() => notices.filter((n) => !n.read).length, [notices]);

  const value = useMemo<CourierState>(
    () => ({
      customers,
      shipments,
      notices,
      loading,
      loadError,
      apiLive,
      customerName,
      shipmentById,
      shipmentByTracking,
      unreadCount,
      createShipment,
      updateShipment,
      deleteShipment,
      updateStatus,
      createCustomer,
      updateCustomer,
      deleteCustomer,
      pushNotice,
      markRead,
      markAllRead,
      reload,
    }),
    [
      customers,
      shipments,
      notices,
      loading,
      loadError,
      apiLive,
      customerName,
      shipmentById,
      shipmentByTracking,
      unreadCount,
      createShipment,
      updateShipment,
      deleteShipment,
      updateStatus,
      createCustomer,
      updateCustomer,
      deleteCustomer,
      pushNotice,
      markRead,
      markAllRead,
      reload,
    ],
  );

  return <CourierCtx.Provider value={value}>{children}</CourierCtx.Provider>;
}

export function useCourier(): CourierState {
  const ctx = useContext(CourierCtx);
  if (!ctx) throw new Error('useCourier must be used inside CourierProvider');
  return ctx;
}
