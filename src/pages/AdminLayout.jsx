import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Users, LogOut, Store, FileText, Shield, PieChart, LifeBuoy, Settings, Link2, ChevronDown, ChevronRight, DollarSign, Receipt } from 'lucide-react';

export function AdminLayout() {
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const [financeMenuOpen, setFinanceMenuOpen] = useState(
    pathname.startsWith('/financeiro')
  );

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: <Home className="mr-3 h-5 w-5" /> },
    { to: '/usuarios', label: 'Usuários', icon: <Users className="mr-3 h-5 w-5" /> },
    { to: '/logs', label: 'Logs', icon: <FileText className="mr-3 h-5 w-5" /> },
    { to: '/admins', label: 'Admins', icon: <Shield className="mr-3 h-5 w-5" /> },
    { to: '/relatorios', label: 'Relatórios', icon: <PieChart className="mr-3 h-5 w-5" /> },
    { to: '/suporte', label: 'Suporte', icon: <LifeBuoy className="mr-3 h-5 w-5" /> },
    { to: '/configuracoes', label: 'Configurações', icon: <Settings className="mr-3 h-5 w-5" /> },
    { to: '/integracoes', label: 'Integrações', icon: <Link2 className="mr-3 h-5 w-5" /> },
  ];

  const financeSubLinks = [
    { to: '/financeiro/dashboard', label: 'Dashboard', icon: <DollarSign className="mr-3 h-4 w-4" /> },
    { to: '/financeiro/faturas', label: 'Faturas', icon: <Receipt className="mr-3 h-4 w-4" /> },
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
          
          {/* Financial Menu with Submenu */}
          <div>
            <button
              onClick={() => setFinanceMenuOpen(!financeMenuOpen)}
              className={`w-full flex items-center justify-between px-4 py-2 rounded-md hover:bg-gray-700 transition
                ${pathname.startsWith('/financeiro') ? 'bg-gray-700' : ''}
              `}
            >
              <div className="flex items-center">
                <DollarSign className="mr-3 h-5 w-5" />
                Financeiro
              </div>
              {financeMenuOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            
            {financeMenuOpen && (
              <div className="ml-4 mt-2 space-y-1">
                {financeSubLinks.map(subLink => (
                  <Link
                    key={subLink.to}
                    to={subLink.to}
                    className={`flex items-center px-4 py-2 rounded-md hover:bg-gray-700 transition text-sm
                      ${pathname === subLink.to ? 'bg-gray-600' : ''}
                    `}
                  >
                    {subLink.icon}
                    {subLink.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
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
