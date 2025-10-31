import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home, Users, LogOut, FileText, Shield, PieChart,
  LifeBuoy, Settings, Link2, Image
} from 'lucide-react';

export function AdminLayout() {
  const { logout } = useAuth();
  const { pathname } = useLocation();

  const isActive = (to) => pathname === to;
  const isSection = (prefix) => pathname.startsWith(prefix);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col">
        <div className="h-16 flex items-center justify-center text-xl font-bold border-b border-gray-700">
          Inksa Admin
        </div>

        {/* Navegação principal */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <Link
            to="/"
            className={`flex items-center px-4 py-2 rounded-md hover:bg-gray-700 transition ${
              isActive('/') ? 'bg-gray-700' : ''
            }`}
          >
            <Home className="mr-3 h-5 w-5" /> Dashboard
          </Link>

          <Link
            to="/usuarios"
            className={`flex items-center px-4 py-2 rounded-md hover:bg-gray-700 transition ${
              isActive('/usuarios') ? 'bg-gray-700' : ''
            }`}
          >
            <Users className="mr-3 h-5 w-5" /> Usuários
          </Link>

          <Link
            to="/banners"
            className={`flex items-center px-4 py-2 rounded-md hover:bg-gray-700 transition ${
              isActive('/banners') ? 'bg-gray-700' : ''
            }`}
          >
            <Image className="mr-3 h-5 w-5" /> Banners
          </Link>

          <Link
            to="/logs"
            className={`flex items-center px-4 py-2 rounded-md hover:bg-gray-700 transition ${
              isActive('/logs') ? 'bg-gray-700' : ''
            }`}
          >
            <FileText className="mr-3 h-5 w-5" /> Logs
          </Link>

          <Link
            to="/admins"
            className={`flex items-center px-4 py-2 rounded-md hover:bg-gray-700 transition ${
              isActive('/admins') ? 'bg-gray-700' : ''
            }`}
          >
            <Shield className="mr-3 h-5 w-5" /> Admins
          </Link>

          <Link
            to="/relatorios"
            className={`flex items-center px-4 py-2 rounded-md hover:bg-gray-700 transition ${
              isActive('/relatorios') ? 'bg-gray-700' : ''
            }`}
          >
            <PieChart className="mr-3 h-5 w-5" /> Relatórios
          </Link>

          {/* SEÇÃO FINANCEIRO */}
          <div className="mt-3">
            <div
              className={`flex items-center px-4 py-2 rounded-md font-semibold ${
                isSection('/financeiro') ? 'bg-gray-700' : 'hover:bg-gray-700'
              } transition`}
            >
              <span className="mr-3">💰</span> Financeiro
            </div>
            <div className="ml-8 mt-1 space-y-1">
              <Link
                to="/financeiro"
                className={`block px-3 py-1 rounded hover:bg-gray-700/60 transition ${
                  isActive('/financeiro') ? 'bg-gray-700/60' : ''
                }`}
              >
                Resumo
              </Link>

              <Link
                to="/financeiro/payouts"
                className={`block px-3 py-1 rounded hover:bg-gray-700/60 transition ${
                  isActive('/financeiro/payouts') ? 'bg-gray-700/60' : ''
                }`}
              >
                Payouts
              </Link>
            </div>
          </div>

          <Link
            to="/suporte"
            className={`flex items-center px-4 py-2 rounded-md hover:bg-gray-700 transition ${
              isActive('/suporte') ? 'bg-gray-700' : ''
            }`}
          >
            <LifeBuoy className="mr-3 h-5 w-5" /> Suporte
          </Link>

          <Link
            to="/configuracoes"
            className={`flex items-center px-4 py-2 rounded-md hover:bg-gray-700 transition ${
              isActive('/configuracoes') ? 'bg-gray-700' : ''
            }`}
          >
            <Settings className="mr-3 h-5 w-5" /> Configurações
          </Link>

          <Link
            to="/integracoes"
            className={`flex items-center px-4 py-2 rounded-md hover:bg-gray-700 transition ${
              isActive('/integracoes') ? 'bg-gray-700' : ''
            }`}
          >
            <Link2 className="mr-3 h-5 w-5" /> Integrações
          </Link>
        </nav>

        {/* Botão de logout */}
        <div className="px-4 py-4 border-t border-gray-700">
          <button
            onClick={logout}
            className="w-full flex items-center px-4 py-2 rounded-md hover:bg-red-600"
          >
            <LogOut className="mr-3 h-5 w-5" /> Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
