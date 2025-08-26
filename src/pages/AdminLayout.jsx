import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Users, LogOut, Store, FileText, Shield, PieChart, LifeBuoy, Settings, Link2 } from 'lucide-react';

export function AdminLayout() {
  const { logout } = useAuth();
  const { pathname } = useLocation();

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: <Home className="mr-3 h-5 w-5" /> },
    { to: '/usuarios', label: 'Usuários', icon: <Users className="mr-3 h-5 w-5" /> },
    { to: '/restaurantes', label: 'Restaurantes', icon: <Store className="mr-3 h-5 w-5" /> },
    { to: '/logs', label: 'Logs', icon: <FileText className="mr-3 h-5 w-5" /> },
    { to: '/admins', label: 'Admins', icon: <Shield className="mr-3 h-5 w-5" /> },
    { to: '/relatorios', label: 'Relatórios', icon: <PieChart className="mr-3 h-5 w-5" /> },
    { to: '/financeiro', label: 'Financeiro', icon: <span className="mr-3">💰</span> },
    { to: '/suporte', label: 'Suporte', icon: <LifeBuoy className="mr-3 h-5 w-5" /> },
    { to: '/configuracoes', label: 'Configurações', icon: <Settings className="mr-3 h-5 w-5" /> },
    { to: '/integracoes', label: 'Integrações', icon: <Link2 className="mr-3 h-5 w-5" /> },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col">
        <div className="h-16 flex items-center justify-center text-xl font-bold border-b border-gray-700">
          Inksa Admin
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center px-4 py-2 rounded-md hover:bg-gray-700 transition
                ${pathname === link.to ? 'bg-gray-700' : ''}
              `}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-700">
          <button onClick={logout} className="w-full flex items-center px-4 py-2 rounded-md hover:bg-red-600">
            <LogOut className="mr-3 h-5 w-5" />Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
