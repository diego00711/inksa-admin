import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Database,
  Loader2,
  RefreshCcw,
  Server,
  Wallet,
  XCircle,
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';

function useHealthCheck() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`, {
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      setHealth(data);
      setLastChecked(new Date());
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        setError('Timeout — backend não respondeu em 10 s');
      } else {
        setError(err.message || 'Falha ao contatar o servidor');
      }
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { health, loading, error, lastChecked, check };
}

function StatusBadge({ ok }) {
  if (ok === null || ok === undefined) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
        <Activity className="h-3.5 w-3.5" /> Verificando…
      </span>
    );
  }
  return ok ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
      <XCircle className="h-3.5 w-3.5" /> Desconectado
    </span>
  );
}

function IntegrationCard({ icon: Icon, iconColor, title, description, statusOk, detail, loading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconColor}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 shrink-0" />
        ) : (
          <StatusBadge ok={statusOk} />
        )}
      </div>
      {detail && (
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {detail}
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const { health, loading, error, lastChecked, check } = useHealthCheck();

  const backendOk = health ? health.status === 'healthy' || health.status === 'ok' : null;
  const dbOk = health ? health.database === 'connected' : null;
  const mpOk = health ? health.mercado_pago === 'configured' : null;

  // Provider ATIVO de pagamento/repasse (Asaas é o atual; MP virou legado).
  const paymentProvider = health?.payment_provider ?? null; // 'asaas' | 'mercadopago'
  const payoutProvider = health?.payout_provider ?? null;   // 'asaas' | 'mercadopago' | 'mock'
  const asaasOk = health ? health.asaas === 'configured' : null;
  const asaasEnv = health?.asaas_env ?? null;                // 'sandbox' | 'production'
  const usingAsaas = paymentProvider === 'asaas';
  const payLabel = usingAsaas ? 'Asaas' : 'Mercado Pago';
  const payOk = usingAsaas ? asaasOk : mpOk;
  const payoutLabel =
    payoutProvider === 'asaas' ? 'Asaas (PIX)'
    : payoutProvider === 'mercadopago' ? 'Mercado Pago'
    : 'Simulado (teste)';
  // mock "funciona" (repasse manual/assistido), então não marca como desconectado.
  const payoutOk =
    payoutProvider === 'asaas' ? asaasOk
    : payoutProvider === 'mercadopago' ? mpOk
    : payoutProvider === 'mock' ? true
    : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-800">Integrações</h1>
          <p className="text-slate-500 mt-1">
            Status em tempo real dos serviços e plataformas conectados ao Inksa.
          </p>
        </div>
        <button
          type="button"
          onClick={check}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Verificando…' : 'Testar todas'}
        </button>
      </div>

      {lastChecked && (
        <p className="text-xs text-slate-400">
          Última verificação: {lastChecked.toLocaleString('pt-BR')}
        </p>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <IntegrationCard
          icon={Server}
          iconColor="bg-indigo-500"
          title="Backend / API"
          description="Servidor Flask hospedado no Render."
          statusOk={backendOk}
          loading={loading}
          detail={
            health
              ? `Endpoint: ${API_BASE_URL} — status: ${health.status}`
              : loading
              ? 'Aguardando resposta do servidor…'
              : error
              ? 'Servidor inacessível ou sem resposta.'
              : null
          }
        />

        <IntegrationCard
          icon={Database}
          iconColor="bg-emerald-500"
          title="Banco de dados (Supabase)"
          description="PostgreSQL gerenciado pelo Supabase."
          statusOk={dbOk}
          loading={loading}
          detail={
            health
              ? `Conexão: ${health.database ?? 'desconhecida'}`
              : loading
              ? 'Verificando conexão com o banco…'
              : error
              ? 'Não foi possível verificar o banco de dados.'
              : null
          }
        />

        <IntegrationCard
          icon={CreditCard}
          iconColor="bg-sky-500"
          title={`Pagamentos — ${payLabel}`}
          description="Gateway que processa PIX e cartão dos pedidos."
          statusOk={payOk}
          loading={loading}
          detail={
            health
              ? usingAsaas
                ? `Provider ativo: Asaas (${asaasEnv || 'sandbox'}). ${
                    payOk ? 'Chave de API configurada.' : 'ASAAS_API_KEY ausente no servidor.'
                  }`
                : `Provider ativo: Mercado Pago. ${
                    payOk ? 'SDK inicializado.' : 'Access token não configurado.'
                  }`
              : loading
              ? 'Verificando provider de pagamento…'
              : error
              ? 'Não foi possível verificar o pagamento.'
              : null
          }
        />

        <IntegrationCard
          icon={Wallet}
          iconColor="bg-amber-500"
          title={`Repasses — ${payoutLabel}`}
          description="Provider que envia os repasses (PIX) a parceiros e entregadores."
          statusOk={payoutOk}
          loading={loading}
          detail={
            health
              ? payoutProvider === 'asaas'
                ? `PIX automático via Asaas. ${asaasOk ? 'Pronto para transferir.' : 'ASAAS_API_KEY ausente.'}`
                : payoutProvider === 'mercadopago'
                ? 'Repasse via Mercado Pago.'
                : 'Modo simulado (mock) — repasse feito de forma manual/assistida no admin.'
              : loading
              ? 'Verificando provider de repasse…'
              : null
          }
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Resumo do ambiente</h2>

        {loading && !health ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando status…
          </div>
        ) : error && !health ? (
          <div className="text-sm text-rose-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Serviço</th>
                  <th className="py-2 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 pr-6 font-medium text-slate-700">Backend (Flask)</td>
                  <td className="py-3 pr-6"><StatusBadge ok={backendOk} /></td>
                  <td className="py-3 text-slate-500">{health?.status ?? '—'}</td>
                </tr>
                <tr>
                  <td className="py-3 pr-6 font-medium text-slate-700">Supabase / PostgreSQL</td>
                  <td className="py-3 pr-6"><StatusBadge ok={dbOk} /></td>
                  <td className="py-3 text-slate-500">{health?.database ?? '—'}</td>
                </tr>
                <tr>
                  <td className="py-3 pr-6 font-medium text-slate-700">Pagamentos ({payLabel})</td>
                  <td className="py-3 pr-6"><StatusBadge ok={payOk} /></td>
                  <td className="py-3 text-slate-500">
                    {paymentProvider ?? '—'}{usingAsaas && asaasEnv ? ` · ${asaasEnv}` : ''}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-6 font-medium text-slate-700">Repasses (PIX-out)</td>
                  <td className="py-3 pr-6"><StatusBadge ok={payoutOk} /></td>
                  <td className="py-3 text-slate-500">{payoutProvider ?? '—'}</td>
                </tr>
                <tr>
                  <td className="py-3 pr-6 font-medium text-slate-700">CORS habilitado</td>
                  <td className="py-3 pr-6"><StatusBadge ok={health?.cors_enabled ?? null} /></td>
                  <td className="py-3 text-slate-500">{health?.cors_enabled != null ? String(health.cors_enabled) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
