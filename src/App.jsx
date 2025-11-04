import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Notifications } from './components/Notifications';

import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './pages/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UsuariosPage } from './pages/UsuariosPage';
import { RestaurantesPage } from './pages/RestaurantesPage';
import { DashboardPage } from './pages/DashboardPage';

// Páginas premium
import LogsPage from './pages/LogsPage';
import AdminsPage from './pages/AdminsPage';
import ReportsPage from './pages/ReportsPage';
import FinanceDashboard from './pages/FinanceDashboard';
import SupportPage from './pages/SupportPage';
import SettingsPage from './pages/SettingsPage';
import IntegrationsPage from './pages/IntegrationsPage';

// Banner Manager e Payouts
import BannerManagementPage from './pages/BannerManagementPage';
import FinanceiroPayouts from './pages/FinanceiroPayouts';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Notifications />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/usuarios" element={<UsuariosPage />} />
                <Route path="/restaurantes" element={<RestaurantesPage />} />
                <Route path="/banners" element={<BannerManagementPage />} />

                {/* Rotas premium */}
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/admins" element={<AdminsPage />} />
                <Route path="/relatorios" element={<ReportsPage />} />
                <Route path="/financeiro" element={<FinanceDashboard />} />
                <Route path="/financeiro/payouts" element={<FinanceiroPayouts />} />
                <Route path="/suporte" element={<SupportPage />} />
                <Route path="/configuracoes" element={<SettingsPage />} />
                <Route path="/integracoes" element={<IntegrationsPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
