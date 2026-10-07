export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked, keep in memory only
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const KEYS = {
  user: 'rw_user',
  baseCustomers: 'rw_base_customers',
  baseShipments: 'rw_base_shipments',
  baseTypes: 'rw_base_types',
  custAdded: 'rw_cust_added',
  custUpdated: 'rw_cust_updated',
  custDeleted: 'rw_cust_deleted',
  shipAdded: 'rw_ship_added',
  shipUpdated: 'rw_ship_updated',
  shipDeleted: 'rw_ship_deleted',
  noticeExtra: 'rw_notice_extra',
  noticeRead: 'rw_notice_read',
} as const;
