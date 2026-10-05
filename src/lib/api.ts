import type { Customer } from '../types';

interface DummyUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: { address: string; city: string; postalCode: string };
}

const FIRST_NAMES = ['Aarav', 'Lakshmi', 'Ravi', 'Sneha', 'Imran', 'Divya'];
const CITIES: Array<[string, string]> = [
  ['Hyderabad', '500034'],
  ['Warangal', '506002'],
  ['Vijayawada', '520010'],
  ['Pune', '411001'],
  ['Bengaluru', '560001'],
  ['Kochi', '682016'],
];

function mapDummy(users: DummyUser[]): Customer[] {
  return users.slice(0, 12).map((u, i) => {
    const city = CITIES[i % CITIES.length];
    const phoneDigits = u.phone.replace(/\D/g, '').slice(-10).padStart(10, '9');
    const mobile = /^[6-9]/.test(phoneDigits) ? phoneDigits : `98${String(48201000 + i * 7331).slice(0, 8)}`;
    return {
      id: i + 1,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email.toLowerCase(),
      phone: mobile.slice(0, 10),
      address: u.address?.address || `${12 + i * 3}, Gandhi Road`,
      city: city[0],
      zip: (u.address?.postalCode || city[1]).replace(/\D/g, '').slice(0, 6).padEnd(6, '0'),
    };
  });
}

function mapFallback(): Customer[] {
  return FIRST_NAMES.concat(['Karthik', 'Meera', 'Harsha', 'Pooja', 'Naveen', 'Farah']).map((n, i) => ({
    id: i + 1,
    name: `${n} ${['Menon', 'Prasad', 'Teja', 'Kulkarni', 'Sheikh', 'Nair', 'Rao', 'Joshi', 'Vardhan', 'Iyer', 'Chowdary', 'Siddiqui'][i]}`,
    email: `${n.toLowerCase()}@mail.in`,
    phone: `98${48201000 + i * 7331}`.slice(0, 10),
    address: `${12 + i * 3}, Gandhi Road`,
    city: CITIES[i % CITIES.length][0],
    zip: CITIES[i % CITIES.length][1],
  }));
}

export async function fetchCustomersFromDummyJSON(): Promise<{ data: Customer[]; live: boolean }> {
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch('https://dummyjson.com/users?limit=12', { signal: ctrl.signal });
    window.clearTimeout(timer);
    if (!res.ok) throw new Error(`DummyJSON responded ${res.status}`);
    const json = (await res.json()) as { users: DummyUser[] };
    if (!Array.isArray(json.users) || json.users.length === 0) throw new Error('Empty DummyJSON payload');
    return { data: mapDummy(json.users), live: true };
  } catch {
    return { data: mapFallback(), live: false };
  }
}
