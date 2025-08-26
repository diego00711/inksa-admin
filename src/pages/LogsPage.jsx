import React, { useEffect, useState } from 'react';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    fetch('https://inksa-auth-flask-dev.onrender.com/api/logs')
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao buscar logs');
        return res.json();
      })
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => {
        setErro(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Logs & Auditoria</h1>
      <div className="bg-white p-6 rounded shadow">
        {loading && <p>Carregando logs...</p>}
        {erro && <p className="text-red-500">Erro: {erro}</p>}
        {!loading && !erro && logs.length === 0 && (
          <p>Nenhum log encontrado.</p>
        )}
        {!loading && !erro && logs.length > 0 && (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 px-4">Data/Hora</th>
                  <th className="text-left py-2 px-4">Admin</th>
                  <th className="text-left py-2 px-4">Ação</th>
                  <th className="text-left py-2 px-4">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2 px-4">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-2 px-4">{log.admin}</td>
                    <td className="py-2 px-4">{log.action}</td>
                    <td className="py-2 px-4">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
