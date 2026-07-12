import React, { useEffect, useState } from 'react';
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
  Menu,
  X,
  Tag,
  Gift,
  AlertTriangle,
  Activity,
  Trophy,
  Medal,
  HeartHandshake,
  Banknote,
} from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: Home, page: 'dashboard' },
  { to: '/metricas', label: 'Métricas', icon: Activity, page: 'metricas' },
  { to: '/usuarios', label: 'Usuários', icon: Users, page: 'usuarios' },
  { to: '/restaurantes', label: 'Restaurantes', icon: Store, page: 'restaurantes' },
  { to: '/avaliacoes', label: 'Avaliações', icon: Star, page: 'avaliacoes' },
  { to: '/gamificacao', label: 'Gamificação', icon: Trophy, page: 'gamificacao' },
  { to: '/banners', label: 'Banners', icon: Image, page: 'banners' },
  { to: '/cupons', label: 'Cupons', icon: Tag, page: 'cupons' },
  { to: '/recompensas', label: 'Recompensas', icon: Gift, page: 'recompensas' },
  { to: '/clube', label: 'Clube Inksa', icon: Medal, page: 'clube' },
  { to: '/social', label: 'Inksa Social', icon: HeartHandshake, page: null },
  { to: '/logs', label: 'Logs', icon: FileText, page: 'logs' },
  { to: '/admins', label: 'Administradores', icon: Shield, page: 'administradores', matchers: ['/admins', '/administradores'] },
  { to: '/relatorios', label: 'Relatórios', icon: PieChart, page: 'relatorios' },
  { to: '/financeiro', label: 'Financeiro', icon: DollarSign, page: 'financeiro' },
  { to: '/financeiro/payouts', label: 'Payouts', icon: null, page: 'payouts', matchers: ['/financeiro/payouts'] },
  { to: '/financeiro/dividas', label: 'Dívidas em dinheiro', icon: Banknote, page: null, matchers: ['/financeiro/dividas'] },
  { to: '/ocorrencias', label: 'Ocorrências', icon: AlertTriangle, page: null },
  { to: '/suporte', label: 'Suporte', icon: LifeBuoy, page: 'suporte' },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, page: 'configuracoes' },
  { to: '/integracoes', label: 'Integrações', icon: Link2, page: 'integracoes' },
  { to: '/perfil', label: 'Meu Perfil', icon: UserCircle, page: null },
];

export function AdminLayout() {
  const { logout, user, hasPermission, permissionsLoaded } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0`}
      >
        <div className="h-16 flex items-center justify-between px-4 text-xl font-bold border-b border-gray-700">
          <span>Inksa Admin</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-gray-700"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-2 rounded-md hover:bg-gray-700 transition min-h-[44px] ${
                  isLinkActive(link) ? 'bg-gray-700' : ''
                }`}
              >
                {Icon ? (
                  <Icon className="mr-3 h-5 w-5 shrink-0" />
                ) : (
                  <span className="mr-3">💸</span>
                )}
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="px-4 py-3 border-t border-gray-700 bg-gray-900/40">
            <Link to="/perfil" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-md p-2 hover:bg-gray-700 transition">
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
            className="w-full flex items-center px-4 py-2 rounded-md hover:bg-red-600 min-h-[44px]"
          >
            <LogOut className="mr-3 h-5 w-5" />Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar mobile com botão hamburguer */}
        <header className="lg:hidden flex items-center h-14 px-4 bg-gray-800 text-white shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-lg font-bold">Inksa Admin</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
