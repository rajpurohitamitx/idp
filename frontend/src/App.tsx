import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { ImageAnalysisPage } from './pages/ImageAnalysisPage';
import { CamerasPage } from './pages/CamerasPage';
import { SensorsPage } from './pages/SensorsPage';
import { WorkersPage } from './pages/WorkersPage';
import { AccessPage } from './pages/AccessPage';
import { AlertsPage } from './pages/AlertsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { RestrictedZonesPage } from './pages/RestrictedZonesPage';
import { DevicesPage } from './pages/DevicesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center text-slate-500 text-sm">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/live-monitoring" element={<LiveMonitoringPage />} />
              <Route path="/image-analysis" element={<ImageAnalysisPage />} />
              <Route path="/cameras" element={<CamerasPage />} />
              <Route path="/sensors" element={<SensorsPage />} />
              <Route path="/workers" element={<WorkersPage />} />
              <Route path="/access" element={<AccessPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/restricted-zones" element={<RestrictedZonesPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
