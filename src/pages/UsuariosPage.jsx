// src/pages/UsuariosPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { getAdminUsers } from '../services/admin';

export function UsuariosPage() {
  const [tab, setTab] = useState('todos'); // 'todos' | 'client' | 'restaurant' | 'delivery' | 'admin'
  const [city, setCity] = useState('');
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const json = await getAdminUsers({
          user_type: tab === 'todos' ? undefined : tab,
          city: city || undefined,
        });
        setUsers(json?.data || []);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [tab, city]);

  const total = users.length;
  const tabs = useMemo(
    () => ([
      { id: 'todos', label: 'Todos' },
      { id: 'client', label: 'Client' },
      { id: 'restaurant', label: 'Restaurant' },
      { id: 'delivery', label: 'Delivery' },
      { id: 'admin', label: 'Admin' },
    ]),
    []
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gestão de Usuários</h1>

      <div className="flex flex-wrap gap-2 items-center">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1 rounded border ${tab === t.id ? 'bg-gray-800 text-white' : 'bg-white'}`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Filtrar por cidade"
            className="border rounded px-3 py-1"
          />
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="text-sm text-gray-600 mb-3">Total de usuários: <strong>{total}</strong></div>

        {loading && <div>Carregando…</div>}
        {err && <div className="text-red-600">Erro ao carregar usuários: {err}</div>}

        {!loading && !err && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">ID</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Nome</th>
                  <th className="p-2">Cidade</th>
                  <th className="p-2">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t">
                    <td className="p-2 font-mono">{u.id}</td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">{u.user_type}</td>
                    <td className="p-2">{u.full_name || '-'}</td>
                    <td className="p-2">{u.city || '-'}</td>
                    <td className="p-2">{u.created_at}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td className="p-2 text-gray-500" colSpan="6">Nenhum usuário encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
