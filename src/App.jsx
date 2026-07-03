import { lazy, Suspense, useState, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { NotificationContext } from './context/NotificationContext';
import { Notifications } from './components/Notifications';
import WakingUpScreen from './components/WakingUpScreen';

// --- Components (NOT lazy) ---
import { AdminLayout } from './pages/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// --- Lazy-loaded pages ---
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const UserMetricsPage = lazy(() => import('./pages/UserMetricsPage'));
const UsuariosPage = lazy(() => import('./pages/UsuariosPage').then(m => ({ default: m.UsuariosPage })));
const RestaurantesPage = lazy(() => import('./pages/RestaurantesPage').then(m => ({ default: m.RestaurantesPage })));
const EvaluationsPage = lazy(() => import('./pages/EvaluationsPage'));
const GamificationPage = lazy(() => import('./pages/GamificationPage'));
const BannerManagementPage = lazy(() => import('./pages/BannerManagementPage'));
const CouponsPage = lazy(() => import('./pages/CouponsPage'));
const RewardsManagementPage = lazy(() => import('./pages/RewardsManagementPage'));
const LogsPage = lazy(() => import('./pages/LogsPage'));
const AdminsPage = lazy(() => import('./pages/AdminsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const FinanceDashboard = lazy(() => import('./pages/FinanceDashboard'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const OcorrenciasPage = lazy(() => import('./pages/OcorrenciasPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'));
const FinanceiroPayouts = lazy(() => import('./pages/FinanceiroPayouts'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-gray-50">
    <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
  </div>
);

function AuthUnauthorizedListener() {
  const { notify } = useContext(NotificationContext);
  const navigate = useNavigate();

  useEffect(() => {
    function handleUnauthorized() {
      notify('Sessão expirada, faça login novamente', 'error', 6000);
      navigate('/login', { replace: true });
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [notify, navigate]);

  return null;
}

function AdminApp() {
  const [serverReady, setServerReady] = useState(false);

  return (
    <>
      <WakingUpScreen onReady={() => setServerReady(true)} />
      <AuthUnauthorizedListener />
      <Notifications />
      {serverReady && (
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/metricas" element={<UserMetricsPage />} />
                <Route path="/usuarios" element={<UsuariosPage />} />
                <Route path="/restaurantes" element={<RestaurantesPage />} />
                <Route path="/avaliacoes" element={<EvaluationsPage />} />
                <Route path="/gamificacao" element={<GamificationPage />} />
                <Route path="/banners" element={<BannerManagementPage />} />
                <Route path="/cupons" element={<CouponsPage />} />
                <Route path="/recompensas" element={<RewardsManagementPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/admins" element={<AdminsPage />} />
                <Route path="/administradores" element={<AdminsPage />} />
                <Route path="/relatorios" element={<ReportsPage />} />
                <Route path="/financeiro" element={<FinanceDashboard />} />
                <Route path="/financeiro/payouts" element={<FinanceiroPayouts />} />
                <Route path="/ocorrencias" element={<OcorrenciasPage />} />
                <Route path="/suporte" element={<SupportPage />} />
                <Route path="/configuracoes" element={<SettingsPage />} />
                <Route path="/integracoes" element={<IntegrationsPage />} />
                <Route path="/perfil" element={<ProfilePage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AdminApp />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
