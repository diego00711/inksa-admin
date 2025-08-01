// Local: src/App.jsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './pages/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UsuariosPage } from './pages/UsuariosPage';
import { RestaurantesPage } from './pages/RestaurantesPage';
// ✅ 1. IMPORTAR A NOSSA NOVA PÁGINA DE DASHBOARD
import { DashboardPage } from './pages/DashboardPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              {/* ✅ 2. SUBSTITUIR O EXEMPLO PELA PÁGINA REAL */}
              <Route path="/" element={<DashboardPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route path="/restaurantes" element={<RestaurantesPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;