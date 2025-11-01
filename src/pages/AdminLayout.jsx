import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useState } from 'react';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    notify('Você saiu da conta.', 'info');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-700 text-white hidden md:block">
        <div className="p-4 text-center font-semibold text-xl border-b border-indigo-500">
          Inksa Admin
        </div>
        <nav className="p-4 space-y-2">
          <Link to="/" className="block px-3 py-2 rounded hover:bg-indigo-600">
            Dashboard
          </Link>
          <Link to="/usuarios" className="block px-3 py-2 rounded hover:bg-indigo-600">
            Usuários
          </Link>
          <Link to="/restaurantes" className="block px-3 py-2 rounded hover:bg-indigo-600">
            Restaurantes
          </Link>
          <Link to="/financeiro/payouts" className="block px-3 py-2 rounded hover:bg-indigo-600">
            Payouts
          </Link>
          <Link to="/banners" className="block px-3 py-2 rounded hover:bg-indigo-600">
            Banners
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded hover:bg-red-600 mt-4"
          >
            Sair
          </button>
        </nav>
      </aside>

      {/* Mobile menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-indigo-700 text-white flex items-center justify-between p-3">
        <span className="font-semibold">Inksa Admin</span>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-xl">
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute top-0 left-0 w-2/3 bg-indigo-700 text-white p-4 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Link to="/" className="block py-2" onClick={() => setMenuOpen(false)}>
              Dashboard
            </Link>
            <Link to="/usuarios" className="block py-2" onClick={() => setMenuOpen(false)}>
              Usuários
            </Link>
            <Link to="/restaurantes" className="block py-2" onClick={() => setMenuOpen(false)}>
              Restaurantes
            </Link>
            <Link to="/financeiro/payouts" className="block py-2" onClick={() => setMenuOpen(false)}>
              Payouts
            </Link>
            <Link to="/banners" className="block py-2" onClick={() => setMenuOpen(false)}>
              Banners
            </Link>
            <button
              onClick={() => {
                handleLogout();
                setMenuOpen(false);
              }}
              className="block py-2 text-red-300"
            >
              Sair
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-6 mt-10 md:mt-0">
        <Outlet />
      </main>
    </div>
  );
}

// ✅ Corrigido: export default incluído
export default AdminLayout;
