export interface ApiUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: { address: string; city: string; postalCode: string };
}

export interface ApiProduct {
  id: number;
  title: string;
  category: string;
  weight: number;
}

export interface ApiCartItem {
  id: number;
  title: string;
  quantity: number;
}

export interface ApiCart {
  id: number;
  userId: number;
  totalQuantity: number;
  products: ApiCartItem[];
}

async function getJSON<T>(url: string, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Request failed ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

async function sendJSON<T>(url: string, method: string, body: unknown): Promise<T> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Request failed ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

export function fetchUsers(limit = 30): Promise<{ users: ApiUser[] }> {
  return getJSON<{ users: ApiUser[] }>(`https://dummyjson.com/users?limit=${limit}`);
}

export function fetchProducts(limit = 60): Promise<{ products: ApiProduct[] }> {
  return getJSON<{ products: ApiProduct[] }>(`https://dummyjson.com/products?limit=${limit}&select=id,title,category,weight`);
}

export function fetchCarts(limit = 30): Promise<{ carts: ApiCart[] }> {
  return getJSON<{ carts: ApiCart[] }>(`https://dummyjson.com/carts?limit=${limit}`);
}

export function apiAddUser(payload: Record<string, unknown>): Promise<ApiUser> {
  return sendJSON<ApiUser>('https://dummyjson.com/users/add', 'POST', payload);
}

export function apiUpdateUser(id: number, payload: Record<string, unknown>): Promise<ApiUser> {
  return sendJSON<ApiUser>(`https://dummyjson.com/users/${id}`, 'PUT', payload);
}

export function apiDeleteUser(id: number): Promise<{ id: number }> {
  return sendJSON<{ id: number }>(`https://dummyjson.com/users/${id}`, 'DELETE', {});
}

export function apiAddCart(payload: Record<string, unknown>): Promise<ApiCart> {
  return sendJSON<ApiCart>('https://dummyjson.com/carts/add', 'POST', payload);
}

export function apiUpdateCart(id: number, payload: Record<string, unknown>): Promise<ApiCart> {
  return sendJSON<ApiCart>(`https://dummyjson.com/carts/${id}`, 'PUT', payload);
}

export function apiDeleteCart(id: number): Promise<{ id: number }> {
  return sendJSON<{ id: number }>(`https://dummyjson.com/carts/${id}`, 'DELETE', {});
}
