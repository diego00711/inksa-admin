import React, { useEffect, useMemo, useState } from 'react';
import {
  Plug,
  Activity,
  AlertTriangle,
  RefreshCcw,
  Copy,
  ExternalLink,
  ShieldCheck,
  Settings2,
} from 'lucide-react';

const STORAGE_KEY = 'inksa.integrations.config';

const DEFAULT_INTEGRATIONS = [
  {
    id: 'ifood',
    name: 'iFood',
    description: 'Receba e sincronize pedidos automaticamente com o marketplace.',
    docsUrl: 'https://portal.ifood.com.br/docs',
    status: 'connected',
    lastSync: '2024-02-13T16:20:00',
    apiKey: 'ifood_live_***_92da',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Envio de notificações e confirmação de pedidos via WhatsApp.',
    docsUrl: 'https://business.whatsapp.com/',
    status: 'pending',
    lastSync: null,
    apiKey: '',
  },
  {
    id: 'rdstation',
    name: 'RD Station',
    description: 'Integração com CRM para nutrir leads captados pelo app.',
    docsUrl: 'https://ajuda.rdstation.com.br/',
    status: 'error',
    lastSync: '2024-02-11T10:05:00',
    apiKey: 'rd_prod_***_118f',
  },
  {
    id: 'webhooks',
    name: 'Webhooks personalizados',
    description: 'Cadastre URLs para receber eventos de pedidos, entregas e pagamentos.',
    docsUrl: 'https://docs.inksa.app/webhooks',
    status: 'connected',
    lastSync: '2024-02-13T17:05:00',
    endpoints: [
      { id: 'orders', label: 'Pedidos', url: 'https://webhook.site/orders-inksa' },
      { id: 'payouts', label: 'Pagamentos', url: 'https://webhook.site/payouts-inksa' },
    ],
  },
];

const STATUS_STYLES = {
  connected: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  pending: 'bg-amber-50 border-amber-200 text-amber-700',
  error: 'bg-rose-50 border-rose-200 text-rose-700',
};

function usePersistedIntegrations() {
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_INTEGRATIONS;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_INTEGRATIONS;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_INTEGRATIONS;
      return parsed;
    } catch (error) {
      console.warn('Falha ao carregar integrações', error);
      return DEFAULT_INTEGRATIONS;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Falha ao salvar integrações', error);
    }
  }, [state]);

  return [state, setState];
}

function IntegrationStatus({ status }) {
  const label =
    status === 'connected' ? 'Conectado' : status === 'pending' ? 'Configuração pendente' : 'Erro de conexão';
  const badgeClass = STATUS_STYLES[status] ?? 'bg-slate-100 border-slate-200 text-slate-600';
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}>
      <Activity className="h-4 w-4" />
      {label}
    </span>
  );
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = usePersistedIntegrations();
  const [selected, setSelected] = useState(integrations[0]);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setSelected((prev) => integrations.find((item) => item.id === prev?.id) ?? integrations[0]);
  }, [integrations]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const logs = useMemo(
    () => [
      {
        id: 'log-1',
        type: 'info',
        message: 'Sincronização do iFood concluída com sucesso.',
        timestamp: '2024-02-13T16:22:00',
      },
      {
        id: 'log-2',
        type: 'warning',
        message: 'Webhook de pagamentos atrasado 3 minutos (nova tentativa agendada).',
        timestamp: '2024-02-13T16:18:00',
      },
      {
        id: 'log-3',
        type: 'error',
        message: 'Token do RD Station expirado. Necessário atualizar credenciais.',
        timestamp: '2024-02-13T10:15:00',
      },
    ],
    []
  );

  const updateIntegration = (id, patch) => {
    setIntegrations((prev) => prev.map((integration) => (integration.id === id ? { ...integration, ...patch } : integration)));
    setFeedback({ type: 'success', message: 'Configuração salva localmente. Sincronize com o backend para concluir.' });
  };

  const regenerateKey = (integration) => {
    const newKey = `${integration.id}_${Math.random().toString(16).slice(2, 10)}_${Math.random().toString(16).slice(2, 6)}`;
    updateIntegration(integration.id, { apiKey: newKey, status: 'pending' });
    setFeedback({ type: 'success', message: 'Geramos uma nova chave. Atualize no fornecedor externo para finalizar.' });
  };

  const toggleStatus = (integration) => {
    const statusCycle = integration.status === 'connected' ? 'pending' : 'connected';
    updateIntegration(integration.id, { status: statusCycle, lastSync: new Date().toISOString() });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Integrações</h1>
        <p className="text-slate-600">Monitore conectores, tokens e endpoints críticos do ecossistema.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {integrations.map((integration) => (
          <button
            type="button"
            key={integration.id}
            onClick={() => setSelected(integration)}
            className={`text-left rounded-xl border px-4 py-5 shadow-sm transition hover:shadow-md focus:outline-none ${
              selected?.id === integration.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">{integration.name}</h2>
              <Plug className="h-5 w-5 text-blue-500" />
            </div>
            <p className="mt-2 text-sm text-slate-500">{integration.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <IntegrationStatus status={integration.status} />
              {integration.lastSync && (
                <span className="text-xs text-slate-400">
                  Última sincronização {new Date(integration.lastSync).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          </button>
        ))}
      </section>

      {selected && (
        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-800">{selected.name}</h2>
                <p className="text-sm text-slate-500">{selected.description}</p>
              </div>
              <IntegrationStatus status={selected.status} />
            </header>

            {feedback && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  feedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {feedback.message}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600" htmlFor="apiKey">
                  Chave de API / Token
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="apiKey"
                    value={selected.apiKey ?? ''}
                    onChange={(event) => updateIntegration(selected.id, { apiKey: event.target.value })}
                    placeholder="Cole aqui a chave fornecida pelo parceiro"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(selected.apiKey ?? '')}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600"
                    title="Copiar chave"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600" htmlFor="docsLink">
                  Documentação oficial
                </label>
                <a
                  id="docsLink"
                  href={selected.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-600 hover:border-blue-300"
                >
                  <ExternalLink className="h-4 w-4" /> Abrir documentação
                </a>
              </div>
            </div>

            {selected.endpoints && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-600">Endpoints configurados</h3>
                <ul className="space-y-2">
                  {selected.endpoints.map((endpoint) => (
                    <li key={endpoint.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
                      <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">{endpoint.label}</span>
                      <code className="flex-1 break-all text-xs text-slate-500">{endpoint.url}</code>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(endpoint.url)}
                        className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600"
                      >
                        Copiar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => regenerateKey(selected)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
              >
                <RefreshCcw className="h-4 w-4" /> Regenerar chave
              </button>
              <button
                type="button"
                onClick={() => toggleStatus(selected)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600"
              >
                <ShieldCheck className="h-4 w-4" /> {selected.status === 'connected' ? 'Forçar reconexão' : 'Marcar como conectado'}
              </button>
            </div>
          </article>

          <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center gap-3">
              <Settings2 className="h-5 w-5 text-blue-500" />
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Monitoramento em tempo real</h3>
                <p className="text-sm text-slate-500">Eventos recentes das integrações.</p>
              </div>
            </header>

            <ul className="space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
                  <p className="font-medium text-slate-800">{log.message}</p>
                  <p className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString('pt-BR')}</p>
                </li>
              ))}
            </ul>

            <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertTriangle className="mr-2 inline h-4 w-4" /> Atualize as credenciais expostas ou expiradas para retomar as sincronizações automáticas.
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
