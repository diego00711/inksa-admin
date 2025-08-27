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

// Novas páginas premium (apenas esqueleto)
import LogsPage from './pages/LogsPage';
import AdminsPage from './pages/AdminsPage';
import ReportsPage from './pages/ReportsPage';
import FinanceDashboard from './pages/FinanceDashboard';
import InvoicesList from './pages/InvoicesList';
import SupportPage from './pages/SupportPage';
import SettingsPage from './pages/SettingsPage';
import IntegrationsPage from './pages/IntegrationsPage';

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
                {/* Rotas premium */}
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/admins" element={<AdminsPage />} />
                <Route path="/relatorios" element={<ReportsPage />} />
                <Route path="/financeiro" element={<FinanceDashboard />} />
                <Route path="/financeiro/dashboard" element={<FinanceDashboard />} />
                <Route path="/financeiro/faturas" element={<InvoicesList />} />
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
