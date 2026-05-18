import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useContext, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { NotificationContext } from './context/NotificationContext';
import { Notifications } from './components/Notifications';

import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './pages/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UsuariosPage } from './pages/UsuariosPage';
import { RestaurantesPage } from './pages/RestaurantesPage';
import { DashboardPage } from './pages/DashboardPage';
import EvaluationsGamificationPage from './pages/EvaluationsGamificationPage';

// Páginas premium
import LogsPage from './pages/LogsPage';
import AdminsPage from './pages/AdminsPage';
const AdminsPageComponent = AdminsPage;
import ReportsPage from './pages/ReportsPage';
import FinanceDashboard from './pages/FinanceDashboard';
import SupportPage from './pages/SupportPage';
import SettingsPage from './pages/SettingsPage';
import IntegrationsPage from './pages/IntegrationsPage';

// Banner Manager e Payouts
import BannerManagementPage from './pages/BannerManagementPage';
import FinanceiroPayouts from './pages/FinanceiroPayouts';
import ProfilePage from './pages/ProfilePage';

// Cupons
import CouponsPage from './pages/CouponsPage';

// Componente interno: escuta o evento global 'auth:unauthorized',
// exibe notificação e redireciona para /login.
// Precisa estar dentro de BrowserRouter para usar useNavigate.
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

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AuthUnauthorizedListener />
          <Notifications />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/usuarios" element={<UsuariosPage />} />
                <Route path="/restaurantes" element={<RestaurantesPage />} />
                <Route path="/avaliacoes" element={<EvaluationsGamificationPage />} />
                <Route path="/banners" element={<BannerManagementPage />} />
                <Route path="/cupons" element={<CouponsPage />} />

                {/* Rotas premium */}
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/admins" element={<AdminsPage />} />
                <Route path="/administradores" element={<AdminsPageComponent />} />
                <Route path="/relatorios" element={<ReportsPage />} />
                <Route path="/financeiro" element={<FinanceDashboard />} />
                <Route path="/financeiro/payouts" element={<FinanceiroPayouts />} />
                <Route path="/suporte" element={<SupportPage />} />
                <Route path="/configuracoes" element={<SettingsPage />} />
                <Route path="/integracoes" element={<IntegrationsPage />} />
                <Route path="/perfil" element={<ProfilePage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
