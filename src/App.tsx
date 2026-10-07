import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './store/AuthContext';
import { CourierProvider } from './store/CourierContext';
import { AuthPage } from './pages/AuthPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ShipmentsPage } from './pages/ShipmentsPage';
import { StatusBoardPage } from './pages/StatusBoardPage';
import { TrackingPage } from './pages/TrackingPage';

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <CourierProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/shipments" element={<Protected><ShipmentsPage /></Protected>} />
          <Route path="/customers" element={<Protected><CustomersPage /></Protected>} />
          <Route path="/tracking" element={<Protected><TrackingPage /></Protected>} />
          <Route path="/status" element={<Protected><StatusBoardPage /></Protected>} />
          <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
          <Route path="/reports" element={<Protected><ReportsPage /></Protected>} />
          <Route path="*" element={<Protected><DashboardPage /></Protected>} />
        </Routes>
        <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} closeOnClick />
      </CourierProvider>
    </AuthProvider>
  );
}
