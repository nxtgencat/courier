import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChartBar,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Plus,
  Truck,
  Users,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useCourier } from '../store/CourierContext';


const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/shipments', label: 'Shipments', icon: Package, end: false },
  { to: '/customers', label: 'Customers', icon: Users, end: false },
  { to: '/tracking', label: 'Tracking', icon: MapPin, end: false },
  { to: '/status', label: 'Delivery status', icon: Truck, end: false },
  { to: '/notifications', label: 'Notifications', icon: Bell, end: false },
  { to: '/reports', label: 'Reports', icon: ChartBar, end: false },
];

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useCourier();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[248px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[248px] bg-card border-r border-line p-4 flex flex-col transition-transform lg:translate-x-0 lg:sticky lg:top-0 lg:h-[100dvh] ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 font-semibold text-lg px-2 h-12">
          <span className="size-8 rounded-xl bg-acc text-accfg grid place-items-center">
            <Package size={18} />
          </span>
          Routewing
        </div>
        <nav className="mt-6 space-y-1 flex-1" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `nav ${isActive ? 'on' : ''}`}
            >
              <item.icon size={19} strokeWidth={1.9} />
              <span className="flex-1">{item.label}</span>
              {item.to === '/notifications' && unreadCount > 0 ? (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-acc text-accfg text-[11px] grid place-items-center">
                  {unreadCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line pt-4 flex items-center gap-3">
          <div className="size-9 rounded-full bg-ink text-card grid place-items-center text-sm font-semibold">
            {(user?.name ?? 'R')[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-mute truncate">{user?.email}</p>
          </div>
          <button
            type="button"
            aria-label="Log out"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-mute hover:text-ink"
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-bg/85 backdrop-blur border-b border-line px-4 sm:px-8 flex items-center gap-3">
          <button type="button" onClick={() => setOpen((v) => !v)} className="lg:hidden" aria-label="Menu">
            <Menu size={24} />
          </button>
          <h2 className="font-semibold text-lg flex-1">{title}</h2>
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="btn size-10 !p-0 justify-center relative"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-acc text-accfg text-[11px] grid place-items-center">
                {unreadCount}
              </span>
            ) : null}
          </button>
          <button type="button" onClick={() => navigate('/shipments?new=1')} className="btn btn-p hidden sm:inline-flex">
            <Plus size={16} /> New shipment
          </button>
        </header>
        <main className="p-4 sm:p-8 max-w-[1280px] mx-auto">{children}</main>
      </div>

      {open ? <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 bg-black/40 z-30 lg:hidden" /> : null}

    </div>
  );
}

