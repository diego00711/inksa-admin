import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Mail, MessageCircle, Phone, Headset,
  CheckCircle2, Clock, AlertCircle, CircleDashed,
  Paperclip, Send, XCircle, RefreshCw,
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';

const CHANNELS = [
  { icon: Mail,           label: 'E-mail',            description: 'suporte@inksa.app',                              sla: 'Resposta em até 4h úteis' },
  { icon: MessageCircle,  label: 'WhatsApp',           description: '(11) 9 4002-8922',                               sla: 'Atendimento 08h–22h' },
  { icon: Phone,          label: 'Telefone',           description: '0800 000 2024',                                  sla: 'Plantão 24/7 para incidentes críticos' },
  { icon: Headset,        label: 'Central do Parceiro',description: 'Portal com base de conhecimento e chat ao vivo', sla: 'Chat disponível em horário comercial' },
];

const FAQS = [
  { question: 'Como acompanho um chamado aberto?', answer: 'Consulte o status nesta tela ou clique no link enviado por e-mail no momento da abertura.' },
  { question: 'Quais são os níveis de criticidade?', answer: 'Baixo (dúvidas gerais), Médio (impacto parcial) e Crítico (paralisação do serviço).' },
  { question: 'Posso anexar evidências?', answer: 'Sim. Adicione a URL de prints, planilhas ou logs no campo de anexos para acelerar o diagnóstico.' },
];

const STATUS_META = {
  aberto:    { label: 'Aberto',           className: 'bg-slate-100 text-slate-700 border-slate-200',   Icon: CircleDashed },
  aguardando:{ label: 'Aguardando',       className: 'bg-amber-50 text-amber-700 border-amber-200',    Icon: AlertCircle  },
  andamento: { label: 'Em andamento',     className: 'bg-blue-50 text-blue-700 border-blue-200',       Icon: Clock        },
  resolvido: { label: 'Resolvido',        className: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
};

const CATEGORIES = ['Dúvida', 'Integração', 'Financeiro', 'Restaurantes', 'Usuários', 'Técnico', 'Outro'];
const PRIORITIES = ['Baixo', 'Médio', 'Alto', 'Crítico'];

const STORAGE_KEY = 'inksa.support.tickets';

function usePersistedTickets() {
  const [tickets, setTickets] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets)); } catch { /* ignore */ }
  }, [tickets]);

  return [tickets, setTickets];
}

function useBackendHealth() {
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`, { signal: AbortSignal.timeout(8000) });
      const data = await res.json().catch(() => ({}));
      setHealth({ ok: res.ok, ...data, checkedAt: new Date().toISOString() });
    } catch {
      setHealth({ ok: false, status: 'offline', checkedAt: new Date().toISOString() });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);
  return { health, checking, recheck: check };
}

export default function SupportPage() {
  const [tickets, setTickets] = usePersistedTickets();
  const { health, checking, recheck } = useBackendHealth();

  const [statusFilter,   setStatusFilter]   = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [confirmClose,   setConfirmClose]   = useState(null); // ticket id

  const [formData, setFormData] = useState({
    subject: '', description: '', category: 'Dúvida', priority: 'Baixo', attachment: '',
  });
  const [feedback, setFeedback] = useState(null);

  // Dismiss feedback after 4 s
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchStatus   = statusFilter   === 'todos'  || t.status   === statusFilter;
      const matchCategory = categoryFilter === 'todas'  || t.category === categoryFilter;
      return matchStatus && matchCategory;
    });
  }, [tickets, statusFilter, categoryFilter]);

  const usedCategories = useMemo(() => {
    const set = new Set(tickets.map((t) => t.category).filter(Boolean));
    return ['todas', ...CATEGORIES.filter((c) => set.has(c)), ...Array.from(set).filter((c) => !CATEGORIES.includes(c))];
  }, [tickets]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) {
      setFeedback({ type: 'error', message: 'Informe um título e descreva o ocorrido antes de enviar.' });
      return;
    }
    const ticket = {
      id: `SUP-${Date.now().toString(36).toUpperCase()}`,
      subject:     formData.subject.trim(),
      description: formData.description.trim(),
      createdAt:   new Date().toISOString(),
      requester:   'Admin',
      status:      'aberto',
      lastUpdate:  new Date().toISOString(),
      category:    formData.category,
      priority:    formData.priority,
      attachment:  formData.attachment.trim(),
    };
    setTickets((prev) => [ticket, ...prev]);
    setFeedback({ type: 'success', message: `Chamado ${ticket.id} registrado com sucesso.` });
    setFormData({ subject: '', description: '', category: 'Dúvida', priority: 'Baixo', attachment: '' });
  };

  const handleResolve = (ticketId) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, status: 'resolvido', lastUpdate: new Date().toISOString() } : t
      )
    );
    setConfirmClose(null);
  };

  const handleDelete = (ticketId) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    setConfirmClose(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Suporte &amp; Atendimento</h1>
        <p className="text-gray-600">Centralize chamados, acompanhe SLAs e mantenha o time informado.</p>
      </div>

      {/* Canais de contato */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CHANNELS.map(({ icon: Icon, label, description, sla }) => (
          <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold text-slate-800">{label}</h3>
                <p className="text-sm text-slate-500">{description}</p>
              </div>
            </div>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">{sla}</p>
          </article>
        ))}
      </section>

      {/* Lista + Formulário */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Lista de chamados */}
        <div className="lg:col-span-2 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Chamados</h2>
              <p className="text-sm text-slate-500">{tickets.length} no total</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="todos">Todos os status</option>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-blue-500 focus:outline-none"
              >
                {usedCategories.map((c) => (
                  <option key={c} value={c}>{c === 'todas' ? 'Todas as categorias' : c}</option>
                ))}
              </select>
            </div>
          </header>

          <ul className="space-y-3">
            {filteredTickets.length === 0 ? (
              <li className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 p-6 text-slate-400">
                <CircleDashed className="h-5 w-5 shrink-0" />
                Nenhum chamado encontrado com os filtros selecionados.
              </li>
            ) : (
              filteredTickets.map((ticket) => {
                const meta  = STATUS_META[ticket.status] ?? STATUS_META.aberto;
                const { Icon } = meta;
                return (
                  <li
                    key={ticket.id}
                    className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-mono font-medium text-slate-400">{ticket.id}</p>
                      <span className="text-xs text-slate-400">
                        {new Date(ticket.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">{ticket.subject}</h3>
                        <p className="text-sm text-slate-500">{ticket.category} • Prioridade {ticket.priority}</p>
                        {ticket.description && (
                          <p className="mt-1 text-xs text-slate-400 line-clamp-2">{ticket.description}</p>
                        )}
                      </div>
                      <span className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <p className="text-xs text-slate-400">
                        Última atualização {new Date(ticket.lastUpdate).toLocaleString('pt-BR')}
                      </p>
                      <div className="flex gap-2">
                        {ticket.status !== 'resolvido' && confirmClose !== ticket.id && (
                          <button
                            onClick={() => setConfirmClose(ticket.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Resolver
                          </button>
                        )}
                        {confirmClose === ticket.id && (
                          <span className="flex items-center gap-1 text-xs text-slate-600">
                            Confirmar?
                            <button onClick={() => handleResolve(ticket.id)} className="ml-1 text-emerald-600 hover:underline font-medium">Sim</button>
                            <button onClick={() => setConfirmClose(null)} className="ml-1 text-slate-400 hover:underline">Não</button>
                          </span>
                        )}
                        <button
                          onClick={() => handleDelete(ticket.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 transition"
                        >
                          <XCircle className="h-3 w-3" /> Excluir
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header>
            <h2 className="text-xl font-semibold text-slate-800">Abrir novo chamado</h2>
            <p className="text-sm text-slate-500">Registre problemas e acompanhe pelo painel.</p>
          </header>

          {feedback && (
            <div className={`rounded-lg border px-3 py-2 text-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              {feedback.message}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="subject">Título</label>
            <input
              id="subject" value={formData.subject}
              onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
              placeholder="Ex.: Falha ao sincronizar pedidos"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="description">Descrição</label>
            <textarea
              id="description" rows={4} value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Cenário, passos para reproduzir, impacto estimado."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600" htmlFor="category">Categoria</label>
              <select id="category" value={formData.category}
                onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600" htmlFor="priority">Prioridade</label>
              <select id="priority" value={formData.priority}
                onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600" htmlFor="attachment">Anexo (URL)</label>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <Paperclip className="h-4 w-4" />
              </span>
              <input id="attachment" value={formData.attachment}
                onChange={(e) => setFormData((p) => ({ ...p, attachment: e.target.value }))}
                placeholder="Link do arquivo ou print"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">
            <Send className="h-4 w-4" /> Enviar chamado
          </button>
        </form>
      </section>

      {/* Base de conhecimento + Status operacional */}
      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2">
        <article>
          <h2 className="text-xl font-semibold text-slate-800">Base de conhecimento</h2>
          <p className="mt-1 text-sm text-slate-500">Guia rápido para dúvidas recorrentes.</p>
          <ul className="mt-4 space-y-3">
            {FAQS.map((faq) => (
              <li key={faq.question} className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-medium text-slate-800">{faq.question}</h3>
                <p className="mt-2 text-sm text-slate-500">{faq.answer}</p>
              </li>
            ))}
          </ul>
        </article>

        {/* Status operacional — dado real do /api/health */}
        <article className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800">Status das operações</h2>
            <button onClick={recheck} disabled={checking}
              className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition">
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Verificando…' : 'Atualizar'}
            </button>
          </div>

          {!health && checking ? (
            <p className="text-sm text-slate-400">Verificando status…</p>
          ) : (
            <ul className="space-y-3">
              <StatusItem
                ok={health?.ok && health?.status === 'healthy'}
                label="API / Backend"
                detail={health?.ok ? 'Operacional' : 'Fora do ar ou sem resposta'}
              />
              <StatusItem
                ok={health?.database === 'connected'}
                label="Banco de dados (Supabase)"
                detail={health?.database === 'connected' ? 'Conectado' : 'Sem conexão'}
              />
              <StatusItem
                ok={health?.mercado_pago === 'configured'}
                label="Mercado Pago SDK"
                detail={health?.mercado_pago === 'configured' ? 'Configurado' : 'Token não configurado'}
              />
              {health?.checkedAt && (
                <li className="text-xs text-slate-400 pt-1">
                  Verificado em {new Date(health.checkedAt).toLocaleString('pt-BR')}
                </li>
              )}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}

function StatusItem({ ok, label, detail }) {
  return (
    <li className={`flex items-start gap-3 rounded-lg p-3 ${ok ? 'bg-emerald-100/60 text-emerald-700' : 'bg-rose-100/60 text-rose-700'}`}>
      {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />}
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs opacity-80">{detail}</p>
      </div>
    </li>
  );
}
