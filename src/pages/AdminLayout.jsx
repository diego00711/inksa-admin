import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Users, LogOut } from 'lucide-react';

export function AdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col">
        <div className="h-16 flex items-center justify-center text-xl font-bold border-b border-gray-700">Inksa Admin</div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link to="/" className="flex items-center px-4 py-2 rounded-md hover:bg-gray-700"><Home className="mr-3 h-5 w-5" />Dashboard</Link>
          <Link to="/usuarios" className="flex items-center px-4 py-2 rounded-md hover:bg-gray-700"><Users className="mr-3 h-5 w-5" />Usuários</Link>
        </nav>
        <div className="px-4 py-4 border-t border-gray-700">
          <button onClick={logout} className="w-full flex items-center px-4 py-2 rounded-md hover:bg-red-600"><LogOut className="mr-3 h-5 w-5" />Sair</button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
