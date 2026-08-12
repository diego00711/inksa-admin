import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  CreditCard,
  Database,
  Loader2,
  RefreshCcw,
  Send,
  Server,
  Smartphone,
  Wallet,
  XCircle,
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import authService from '../services/authService';

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

// Teste REAL da conta Asaas. O /api/health só olha se a variável de ambiente
// existe — numa troca de conta (PF→PJ, chave regerada) ele continuaria verde
// com a chave morta, e o erro só apareceria no primeiro pedido do cliente.
function useAsaasCheck() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const token = authService.getToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/integrations/asaas/check`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(20000),
      });
      setResult(await res.json());
    } catch (err) {
      setResult({ conectado: false, motivo: err.message || 'Falha ao testar a conta' });
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, check };
}

// Push tem DOIS lados, e os dois falharam calados por semanas: o servidor
// precisa do arquivo de credenciais do Firebase (sem ele o envio devolve
// false e ninguém acima olha), e o aparelho precisa ter registrado um token
// (o que dependia de cinco coisas darem certo em sequência). Um card só que
// responde a pergunta inteira.
function usePushCheck() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [envio, setEnvio] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const token = authService.getToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/integrations/push/check`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(20000),
      });
      setResult(await res.json());
    } catch (err) {
      setResult({ servidor: { pode_enviar: false, motivo: err.message || 'Falha ao consultar' } });
    } finally {
      setLoading(false);
    }
  }, []);

  const testar = useCallback(async (userId, userType) => {
    setEnviando(true);
    setEnvio(null);
    try {
      const token = authService.getToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/integrations/push/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ user_id: userId, user_type: userType }),
        signal: AbortSignal.timeout(20000),
      });
      setEnvio(await res.json());
    } catch (err) {
      setEnvio({ enviado: false, erro: err.message || 'Falha na requisição' });
    } finally {
      setEnviando(false);
    }
  }, []);

  return { result, loading, check, envio, enviando, testar };
}

export default function IntegrationsPage() {
  const { health, loading, error, lastChecked, check } = useHealthCheck();
  const asaas = useAsaasCheck();
  const push = usePushCheck();
  const [alvoPush, setAlvoPush] = useState({ id: '', tipo: 'client' });

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

      {/* Teste REAL da conta Asaas. Os cards abaixo mostram "configurado" só
          porque a variável existe — depois de trocar de conta (PF→PJ) isso
          continuaria verde com a chave morta. Aqui a gente pergunta ao Asaas. */}
      {usingAsaas && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-800">Conta Asaas — teste real</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Confirma se a chave ainda vale e de qual CNPJ é a conta. Use depois de
                trocar a chave ou o cadastro (PF → PJ).
              </p>
            </div>
            <button
              type="button"
              onClick={asaas.check}
              disabled={asaas.loading}
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
            >
              {asaas.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              {asaas.loading ? 'Testando…' : 'Testar conta'}
            </button>
          </div>

          {asaas.result && (
            asaas.result.conectado ? (
              <dl className="mt-4 grid gap-2 sm:grid-cols-2 text-sm border-t border-slate-100 pt-4">
                <div><dt className="text-slate-500">Conta</dt><dd className="font-medium text-slate-800">{asaas.result.conta?.conta || '—'}</dd></div>
                <div><dt className="text-slate-500">CPF/CNPJ</dt><dd className="font-medium text-slate-800">{asaas.result.conta?.cpf_cnpj || '—'}</dd></div>
                <div><dt className="text-slate-500">Tipo</dt><dd className="font-medium text-slate-800">{asaas.result.conta?.tipo_pessoa === 'JURIDICA' ? 'Pessoa Jurídica (CNPJ)' : asaas.result.conta?.tipo_pessoa === 'FISICA' ? 'Pessoa Física' : '—'}</dd></div>
                <div><dt className="text-slate-500">Ambiente</dt><dd className={`font-medium ${asaas.result.conta?.ambiente === 'production' ? 'text-emerald-700' : 'text-amber-700'}`}>{asaas.result.conta?.ambiente === 'production' ? 'Produção' : 'Sandbox (teste)'}</dd></div>
                <div>
                  <dt className="text-slate-500">Saldo</dt>
                  <dd className={`font-medium ${Number(asaas.result.saldo) > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {asaas.result.saldo === null || asaas.result.saldo === undefined
                      ? '—'
                      : Number(asaas.result.saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    {Number(asaas.result.saldo) <= 0 && ' — sem saldo o PIX de repasse falha'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Token do webhook</dt>
                  <dd className={`font-medium ${asaas.result.webhook_token_configurado ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {asaas.result.webhook_token_configurado ? 'Configurado' : 'AUSENTE — webhooks serão recusados'}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="mt-4 flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <XCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Não conectou: {asaas.result.motivo}</p>
                  {asaas.result.dica && <p className="mt-1">{asaas.result.dica}</p>}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Notificações push — os dois lados da ponte numa tela só. */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-800">Notificações push — teste real</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Confere se o servidor consegue enviar (credencial do Firebase) e se existe
              aparelho registrado pra receber. Push que não sai não gera erro em lugar nenhum.
            </p>
          </div>
          <button
            type="button"
            onClick={push.check}
            disabled={push.loading}
            className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
          >
            {push.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            {push.loading ? 'Verificando…' : 'Verificar push'}
          </button>
        </div>

        {push.result && (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 border-t border-slate-100 pt-4">
              <div className={`rounded-lg border p-3 text-sm ${push.result.servidor?.pode_enviar ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                <p className="font-semibold flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Servidor {push.result.servidor?.pode_enviar ? 'pronto pra enviar' : 'NÃO consegue enviar'}
                </p>
                {push.result.servidor?.motivo && <p className="mt-1">{push.result.servidor.motivo}</p>}
                {!push.result.servidor?.credencial_producao && (
                  <p className="mt-1 text-xs">
                    Falta o Secret File <code>firebase-service-account.json</code> em{' '}
                    <code>{push.result.servidor?.caminho_producao}</code> no Render.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Aparelhos registrados
                </p>
                <ul className="mt-1 space-y-0.5">
                  {['clientes', 'parceiros', 'entregadores'].map((k) => (
                    <li key={k} className="flex justify-between">
                      <span className="capitalize">{k}</span>
                      <span className={push.result.aparelhos?.[k]?.com_token > 0 ? 'font-medium text-emerald-700' : 'text-slate-400'}>
                        {push.result.aparelhos?.[k]?.com_token ?? 0} de {push.result.aparelhos?.[k]?.total ?? 0}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-700">Disparar um push de teste</p>
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={alvoPush.id}
                  onChange={(e) => setAlvoPush((a) => ({ ...a, id: e.target.value }))}
                  placeholder="ID do usuário (uuid do perfil)"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <select
                  value={alvoPush.tipo}
                  onChange={(e) => setAlvoPush((a) => ({ ...a, tipo: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="client">Cliente</option>
                  <option value="restaurant">Parceiro</option>
                  <option value="delivery">Entregador</option>
                </select>
                <button
                  type="button"
                  onClick={() => push.testar(alvoPush.id.trim(), alvoPush.tipo)}
                  disabled={push.enviando || !alvoPush.id.trim()}
                  className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {push.enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {push.enviando ? 'Enviando…' : 'Enviar teste'}
                </button>
              </div>

              {push.envio && (
                <div className={`mt-3 flex gap-3 rounded-lg border p-3 text-sm ${push.envio.enviado ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                  {push.envio.enviado ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
                  <div>
                    <p className="font-semibold">
                      {push.envio.enviado ? 'Push enviado ao FCM' : `Não enviou: ${push.envio.erro || push.envio.message || 'erro desconhecido'}`}
                    </p>
                    {push.envio.message_id && <p className="mt-1 text-xs break-all">message_id: {push.envio.message_id}</p>}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

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
