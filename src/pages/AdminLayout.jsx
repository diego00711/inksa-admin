import React, { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Users,
  LogOut,
  Store,
  FileText,
  Shield,
  PieChart,
  LifeBuoy,
  Settings,
  Link2,
  Image,
  DollarSign,
  Star,
  UserCircle,
} from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: Home, page: 'dashboard' },
  { to: '/usuarios', label: 'Usuários', icon: Users, page: 'usuarios' },
  { to: '/restaurantes', label: 'Restaurantes', icon: Store, page: 'restaurantes' },
  { to: '/avaliacoes', label: 'Avaliações & Gamificação', icon: Star, page: 'avaliacoes' },
  { to: '/banners', label: 'Banners', icon: Image, page: 'banners' },
  { to: '/logs', label: 'Logs', icon: FileText, page: 'logs' },
  { to: '/admins', label: 'Administradores', icon: Shield, page: 'administradores', matchers: ['/admins', '/administradores'] },
  { to: '/relatorios', label: 'Relatórios', icon: PieChart, page: 'relatorios' },
  { to: '/financeiro', label: 'Financeiro', icon: DollarSign, page: 'financeiro' },
  { to: '/financeiro/payouts', label: 'Payouts', icon: null, page: 'payouts', matchers: ['/financeiro/payouts'] },
  { to: '/suporte', label: 'Suporte', icon: LifeBuoy, page: 'suporte' },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, page: 'configuracoes' },
  { to: '/integracoes', label: 'Integrações', icon: Link2, page: 'integracoes' },
  { to: '/perfil', label: 'Meu Perfil', icon: UserCircle, page: null },
];

export function AdminLayout() {
  const { logout, user, hasPermission, permissionsLoaded } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const normalizedPath = React.useMemo(() => {
    if (!pathname) return '/';
    const trimmed = pathname.replace(/\/+$/, '');
    return trimmed.length > 0 ? trimmed : '/';
  }, [pathname]);

  const visibleLinks = React.useMemo(
    () => NAV_LINKS.filter((link) => hasPermission(link.page)),
    [hasPermission],
  );

  useEffect(() => {
    if (!permissionsLoaded) return;
    const activeLink = NAV_LINKS.find((link) => {
      if (!link.page) return false;
      const matchers = link.matchers ?? [link.to];
      return matchers.some((m) => {
        const nm = m.replace(/\/+$/, '') || '/';
        return normalizedPath === nm || normalizedPath.startsWith(`${nm}/`);
      });
    });
    if (activeLink && !hasPermission(activeLink.page)) {
      navigate('/', { replace: true });
    }
  }, [permissionsLoaded, normalizedPath, hasPermission, navigate]);

  const isLinkActive = (link) => {
    const baseMatchers = link.matchers ?? [link.to];
    return baseMatchers.some((matcher) => {
      if (!matcher) return false;
      const normalizedMatcher = matcher.replace(/\/+$/, '') || '/';
      return (
        normalizedPath === normalizedMatcher ||
        normalizedPath.startsWith(`${normalizedMatcher}/`)
      );
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col">
        <div className="h-16 flex items-center justify-center text-xl font-bold border-b border-gray-700">
          Inksa Admin
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center px-4 py-2 rounded-md hover:bg-gray-700 transition ${
                  isLinkActive(link) ? 'bg-gray-700' : ''
                }`}
              >
                {Icon ? (
                  <Icon className="mr-3 h-5 w-5" />
                ) : (
                  <span className="mr-3">💸</span>
                )}
                {link.label}
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="px-4 py-3 border-t border-gray-700 bg-gray-900/40">
            <Link to="/perfil" className="flex items-center gap-3 rounded-md p-2 hover:bg-gray-700 transition">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">
                  {(user.name || user.full_name || user.email || 'A')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0].toUpperCase())
                    .join('')}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name || user.full_name || (user.email || '').split('@')[0] || 'Administrador'}
                </p>
                <p className="text-xs text-gray-400 truncate capitalize">
                  {user.role || user.user_type || 'admin'}
                </p>
              </div>
            </Link>
          </div>
        )}
        <div className="px-4 py-4 border-t border-gray-700">
          <button
            onClick={logout}
            className="w-full flex items-center px-4 py-2 rounded-md hover:bg-red-600"
          >
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
