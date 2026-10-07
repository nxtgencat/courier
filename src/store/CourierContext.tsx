import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Customer, DeliveryStatus, Notice, NoticeKind, Shipment } from '../types';
import {
  apiAddCart,
  apiAddUser,
  apiDeleteCart,
  apiDeleteUser,
  apiUpdateCart,
  apiUpdateUser,
  fetchCarts,
  fetchProducts,
  fetchUsers,
} from '../lib/api';
import { buildNotices, buildShipments, mapUser, parcelTypesFrom } from '../lib/builders';
import { makeTrackingNumber } from '../lib/format';
import { KEYS, readJSON, writeJSON } from '../lib/storage';

export interface ShipmentInput {
  senderId: number;
  receiverId: number;
  pickup: string;
  drop: string;
  weight: number;
  type: string;
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
  parcelTypes: string[];
  loading: boolean;
  syncing: boolean;
  loadError: string | null;
  apiLive: boolean;
  customerName: (id: number) => string;
  shipmentById: (id: number) => Shipment | undefined;
  shipmentByTracking: (tn: string) => Shipment | undefined;
  unreadCount: number;
  createShipment: (input: ShipmentInput) => Promise<Shipment>;
  updateShipment: (id: number, input: ShipmentInput, status: DeliveryStatus) => Promise<void>;
  deleteShipment: (id: number) => Promise<Shipment | undefined>;
  updateStatus: (id: number, status: DeliveryStatus, actor: string) => void;
  createCustomer: (input: CustomerInput) => Promise<Customer>;
  updateCustomer: (id: number, input: CustomerInput) => Promise<void>;
  deleteCustomer: (id: number) => Promise<void>;
  pushNotice: (title: string, message: string, kind: NoticeKind) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  reload: () => void;
}

const CourierCtx = createContext<CourierState | null>(null);
let noticeSeq = 1000;

function applyCustomerOverlay(
  base: Customer[],
  added: Customer[],
  updated: Record<number, CustomerInput>,
  deleted: number[],
): Customer[] {
  const del = new Set(deleted);
  const merged = base.filter((c) => !del.has(c.id)).map((c) => (updated[c.id] ? { ...c, ...updated[c.id] } : c));
  return [...added, ...merged];
}

function applyShipmentOverlay(
  base: Shipment[],
  added: Shipment[],
  updated: Record<number, { input: ShipmentInput; status: DeliveryStatus }>,
  deleted: number[],
): Shipment[] {
  const del = new Set(deleted);
  const merged = base.filter((s) => !del.has(s.id)).map((s) => {
    const u = updated[s.id];
    if (!u) return s;
    const changed = s.status !== u.status;
    return {
      ...s,
      senderId: u.input.senderId,
      receiverId: u.input.receiverId,
      pickup: u.input.pickup,
      drop: u.input.drop,
      weight: u.input.weight,
      type: u.input.type,
      date: u.input.date,
      eta: u.input.eta,
      status: u.status,
      history: changed
        ? [...s.history, { status: u.status, at: new Date().toISOString(), location: s.drop.split(',')[0] ?? s.drop, note: 'Status updated' }]
        : s.history,
    };
  });
  return [...added, ...merged].sort((a, b) => b.date.localeCompare(a.date));
}

export function CourierProvider({ children }: { children: ReactNode }) {
  const [baseCustomers, setBaseCustomers] = useState<Customer[]>(() => readJSON<Customer[]>(KEYS.baseCustomers, []));
  const [baseShipments, setBaseShipments] = useState<Shipment[]>(() => readJSON<Shipment[]>(KEYS.baseShipments, []));
  const [baseTypes, setBaseTypes] = useState<string[]>(() => readJSON<string[]>(KEYS.baseTypes, []));
  const [custAdded, setCustAdded] = useState<Customer[]>(() => readJSON<Customer[]>(KEYS.custAdded, []));
  const [custUpdated, setCustUpdated] = useState<Record<number, CustomerInput>>(() => readJSON(KEYS.custUpdated, {}));
  const [custDeleted, setCustDeleted] = useState<number[]>(() => readJSON<number[]>(KEYS.custDeleted, []));
  const [shipAdded, setShipAdded] = useState<Shipment[]>(() => readJSON<Shipment[]>(KEYS.shipAdded, []));
  const [shipUpdated, setShipUpdated] = useState<Record<number, { input: ShipmentInput; status: DeliveryStatus }>>(() =>
    readJSON(KEYS.shipUpdated, {}),
  );
  const [shipDeleted, setShipDeleted] = useState<number[]>(() => readJSON<number[]>(KEYS.shipDeleted, []));
  const [extraNotices, setExtraNotices] = useState<Notice[]>(() => readJSON<Notice[]>(KEYS.noticeExtra, []));
  const [readIds, setReadIds] = useState<string[]>(() => readJSON<string[]>(KEYS.noticeRead, []));

  const hasCache = baseCustomers.length > 0 && baseShipments.length > 0;
  const [loading, setLoading] = useState(!hasCache);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiLive, setApiLive] = useState(hasCache);
  const [reloadKey, setReloadKey] = useState(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => writeJSON(KEYS.baseCustomers, baseCustomers), [baseCustomers]);
  useEffect(() => writeJSON(KEYS.baseShipments, baseShipments), [baseShipments]);
  useEffect(() => writeJSON(KEYS.baseTypes, baseTypes), [baseTypes]);
  useEffect(() => writeJSON(KEYS.custAdded, custAdded), [custAdded]);
  useEffect(() => writeJSON(KEYS.custUpdated, custUpdated), [custUpdated]);
  useEffect(() => writeJSON(KEYS.custDeleted, custDeleted), [custDeleted]);
  useEffect(() => writeJSON(KEYS.shipAdded, shipAdded), [shipAdded]);
  useEffect(() => writeJSON(KEYS.shipUpdated, shipUpdated), [shipUpdated]);
  useEffect(() => writeJSON(KEYS.shipDeleted, shipDeleted), [shipDeleted]);
  useEffect(() => writeJSON(KEYS.noticeExtra, extraNotices), [extraNotices]);
  useEffect(() => writeJSON(KEYS.noticeRead, readIds), [readIds]);

  const customers = useMemo(
    () => applyCustomerOverlay(baseCustomers, custAdded, custUpdated, custDeleted),
    [baseCustomers, custAdded, custUpdated, custDeleted],
  );
  const shipments = useMemo(
    () => applyShipmentOverlay(baseShipments, shipAdded, shipUpdated, shipDeleted),
    [baseShipments, shipAdded, shipUpdated, shipDeleted],
  );
  const parcelTypes = useMemo(() => {
    const fromBase = baseTypes.length > 0 ? baseTypes : [...new Set(shipments.map((s) => s.type))].sort();
    const fromAdded = [...new Set(shipAdded.map((s) => s.type))];
    return [...new Set([...fromBase, ...fromAdded])].sort();
  }, [baseTypes, shipments, shipAdded]);

  const customerName = useCallback(
    (id: number) => customers.find((c) => c.id === id)?.name ?? 'Unknown',
    [customers],
  );

  const derivedNotices = useMemo(() => buildNotices([...shipAdded, ...baseShipments], customerName), [shipAdded, baseShipments, customerName]);
  const notices = useMemo(() => {
    const read = new Set(readIds);
    const all = [...extraNotices, ...derivedNotices].map((n) => (read.has(n.id) ? { ...n, read: true } : n));
    return all.sort((a, b) => b.at - a.at).slice(0, 60);
  }, [extraNotices, derivedNotices, readIds]);

  useEffect(() => {
    let alive = true;
    const hadCache = readJSON<Customer[]>(KEYS.baseCustomers, []).length > 0;
    if (hadCache) setSyncing(true);
    else setLoading(true);
    setLoadError(null);

    Promise.all([fetchUsers(30), fetchProducts(60), fetchCarts(30)])
      .then(([u, p, c]) => {
        if (!alive || !mounted.current) return;
        const mapped = u.users.map(mapUser);
        const built = buildShipments(c.carts, u.users, p.products);
        const types = parcelTypesFrom(p.products);
        setBaseCustomers(mapped);
        setBaseShipments(built);
        setBaseTypes(types);
        setApiLive(true);
      })
      .catch(() => {
        if (!alive) return;
        const cached = readJSON<Customer[]>(KEYS.baseCustomers, []);
        if (cached.length === 0) setLoadError('Directory API unreachable. Check your connection and retry.');
        else {
          setLoadError('Directory API unreachable. Showing last synced data.');
          setApiLive(false);
        }
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
        setSyncing(false);
      });

    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const pushNotice = useCallback((title: string, message: string, kind: NoticeKind) => {
    noticeSeq += 1;
    const notice: Notice = { id: `local-${noticeSeq}`, title, message, kind, at: Date.now(), read: false };
    setExtraNotices((prev) => [notice, ...prev].slice(0, 60));
  }, []);

  const shipmentById = useCallback((id: number) => shipments.find((s) => s.id === id), [shipments]);
  const shipmentByTracking = useCallback(
    (tn: string) => shipments.find((s) => s.trackingNumber === tn.toUpperCase()),
    [shipments],
  );

  const createShipment = useCallback(
    async (input: ShipmentInput) => {
      const allIds = [...baseShipments.map((s) => s.id), ...shipAdded.map((s) => s.id)];
      const id = (allIds.length > 0 ? Math.max(...allIds) : 0) + 1;
      await apiAddCart({ userId: input.senderId, products: [{ id: 1, quantity: Math.max(1, Math.round(input.weight)) }] });
      const record: Shipment = {
        id,
        trackingNumber: makeTrackingNumber(id * 7 + Date.now() % 1000),
        senderId: input.senderId,
        receiverId: input.receiverId,
        pickup: input.pickup,
        drop: input.drop,
        weight: input.weight,
        type: input.type,
        date: input.date,
        eta: input.eta,
        status: 'Pending',
        history: [{ status: 'Pending', at: new Date().toISOString(), location: input.pickup.split(',')[0] ?? input.pickup, note: 'Order registered' }],
      };
      setShipAdded((prev) => [record, ...prev]);
      pushNotice('Shipment created', `${record.trackingNumber} was booked`, 'new');
      return record;
    },
    [baseShipments, shipAdded, pushNotice],
  );

  const updateShipment = useCallback(
    async (id: number, input: ShipmentInput, status: DeliveryStatus) => {
      await apiUpdateCart(id, { userId: input.senderId });
      const patch = { input, status };
      setShipUpdated((prev) => ({ ...prev, [id]: patch }));
      setShipAdded((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const changed = s.status !== status;
          return {
            ...s,
            ...input,
            status,
            history: changed
              ? [...s.history, { status, at: new Date().toISOString(), location: input.drop.split(',')[0] ?? input.drop, note: 'Status updated' }]
              : s.history,
          };
        }),
      );
    },
    [],
  );

  const deleteShipment = useCallback(
    async (id: number) => {
      const found = [...shipAdded, ...baseShipments].find((s) => s.id === id);
      await apiDeleteCart(id);
      setShipAdded((prev) => prev.filter((s) => s.id !== id));
      setShipDeleted((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setShipUpdated((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return found;
    },
    [shipAdded, baseShipments],
  );

  const updateStatus = useCallback(
    (id: number, status: DeliveryStatus, actor: string) => {
      let tn = '';
      const apply = (s: Shipment): Shipment => {
        if (s.id !== id || s.status === status) return s;
        tn = s.trackingNumber;
        return {
          ...s,
          status,
          history: [...s.history, { status, at: new Date().toISOString(), location: s.drop.split(',')[0] ?? s.drop, note: `Status updated by ${actor}` }],
        };
      };
      setShipAdded((prev) => prev.map(apply));
      setBaseShipments((prev) => prev.map(apply));
      setShipUpdated((prev) => {
        const current = shipments.find((s) => s.id === id);
        if (!current || current.status === status) return prev;
        return {
          ...prev,
          [id]: {
            input: {
              senderId: current.senderId,
              receiverId: current.receiverId,
              pickup: current.pickup,
              drop: current.drop,
              weight: current.weight,
              type: current.type,
              date: current.date,
              eta: current.eta,
            },
            status,
          },
        };
      });
      apiUpdateCart(id, { status }).catch(() => undefined);
      if (tn) {
        if (status === 'Delivered') pushNotice('Delivery completed', `${tn} is now Delivered`, 'ok');
        else if (status === 'Failed Delivery') pushNotice('Failed delivery alert', `${tn}: receiver unavailable`, 'bad');
        else pushNotice('Status updated', `${tn} is now ${status}`, 'up');
      }
    },
    [pushNotice, shipments],
  );

  const createCustomer = useCallback(
    async (input: CustomerInput) => {
      const res = await apiAddUser({ firstName: input.name.split(' ')[0], lastName: input.name.split(' ').slice(1).join(' ') || 'Customer', email: input.email });
      const allIds = [...baseCustomers.map((c) => c.id), ...custAdded.map((c) => c.id)];
      const id = res?.id && res.id > 200 ? res.id : (allIds.length > 0 ? Math.max(...allIds) : 0) + 1;
      const record: Customer = { id, ...input };
      setCustAdded((prev) => [record, ...prev]);
      return record;
    },
    [baseCustomers, custAdded],
  );

  const updateCustomer = useCallback(async (id: number, input: CustomerInput) => {
    await apiUpdateUser(id, { firstName: input.name.split(' ')[0], email: input.email });
    setCustUpdated((prev) => ({ ...prev, [id]: input }));
    setCustAdded((prev) => prev.map((c) => (c.id === id ? { ...c, ...input } : c)));
  }, []);

  const deleteCustomer = useCallback(async (id: number) => {
    await apiDeleteUser(id);
    setCustAdded((prev) => prev.filter((c) => c.id !== id));
    setCustDeleted((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setCustUpdated((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setExtraNotices((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => [...new Set([...prev, ...extraNotices.map((n) => n.id), ...derivedNotices.map((n) => n.id)])]);
    setExtraNotices((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [extraNotices, derivedNotices]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const unreadCount = useMemo(() => notices.filter((n) => !n.read).length, [notices]);

  const value = useMemo<CourierState>(
    () => ({
      customers,
      shipments,
      notices,
      parcelTypes,
      loading,
      syncing,
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
      parcelTypes,
      loading,
      syncing,
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
