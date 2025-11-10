import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock,
  Headset,
  Loader2,
  Mail,
  MessageCircle,
  Paperclip,
  Phone,
  Send,
  Ticket,
  Truck,
  Users,
} from 'lucide-react';
import supportService from '../services/support';

const CHANNELS = [
  {
    icon: Mail,
    label: 'E-mail',
    description: 'suporte@inksa.app',
    sla: 'Resposta em até 4h úteis',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    description: '(11) 9 4002-8922',
    sla: 'Atendimento 08h-22h',
  },
  {
    icon: Phone,
    label: 'Telefone',
    description: '0800 000 2024',
    sla: 'Plantão 24/7 para incidentes críticos',
  },
  {
    icon: Headset,
    label: 'Central do Parceiro',
    description: 'Portal com base de conhecimento e chat ao vivo',
    sla: 'Chat disponível em horário comercial',
  },
];

const STATUS_PAYLOAD = {
  todos: undefined,
  andamento: 'open',
  aguardando: 'pending',
  resolvido: 'resolved',
};

const STATUS_STYLES = {
  resolvido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  andamento: 'bg-blue-50 text-blue-700 border-blue-200',
  aguardando: 'bg-amber-50 text-amber-700 border-amber-200',
};

const ORIGIN_CANONICAL = {
  restaurant: 'restaurant',
  restaurants: 'restaurant',
  partner: 'restaurant',
  client: 'client',
  customer: 'client',
  customers: 'client',
  app_customer: 'client',
  delivery: 'delivery',
  courier: 'delivery',
  rider: 'delivery',
  driver: 'delivery',
};

const ORIGIN_LABELS = {
  restaurant: 'Restaurantes',
  client: 'Clientes',
  delivery: 'Entregadores',
  other: 'Outros canais',
};

function normalizeStatus(value) {
  const status = (value || '').toString().toLowerCase();
  if (['resolved', 'resolvido', 'closed', 'done', 'completed'].includes(status)) return 'resolvido';
  if (['pending', 'aguardando', 'waiting', 'new'].includes(status)) return 'aguardando';
  return 'andamento';
}

function normalizeTicket(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const status = normalizeStatus(raw.status ?? raw.state ?? raw.current_status);
  const origin = (raw.origin || raw.source || raw.channel || '').toString().toLowerCase();

  return {
    id: raw.id ?? raw.ticket_id ?? raw.code ?? raw.uuid ?? String(raw._id ?? ''),
    subject: raw.subject ?? raw.title ?? 'Chamado sem título',
    description: raw.description ?? raw.body ?? raw.message ?? '',
    status,
    category: raw.category ?? raw.topic ?? 'Geral',
    priority: raw.priority ?? 'Médio',
    requester: raw.requester_name ?? raw.requester ?? raw.customer_name ?? 'Usuário',
    requesterEmail: raw.requester_email ?? raw.email ?? '',
    createdAt: raw.created_at ?? raw.opened_at ?? raw.createdAt ?? null,
    lastUpdate: raw.updated_at ?? raw.last_update ?? raw.lastUpdated ?? raw.created_at ?? null,
    origin,
    reference: raw.reference ?? raw.order_id ?? null,
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    raw,
  };
}

function normalizeTickets(payload) {
  if (!payload) return [];
  const collection = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.tickets)
    ? payload.tickets
    : [];

  return collection
    .map((ticket) => normalizeTicket(ticket))
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {};
      const apiStatus = STATUS_PAYLOAD[filter];
      if (apiStatus) {
        params.status = apiStatus;
      }

      const response = await supportService.listSupportTickets(params);
      const normalized = normalizeTickets(response);
      setTickets(normalized);
      setSelectedTicket((current) => {
        if (current) {
          const sameTicket = normalized.find((ticket) => ticket.id === current.id);
          if (sameTicket) return sameTicket;
        }
        return normalized[0] ?? null;
      });
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('Erro ao carregar chamados:', err);
      setError(err?.message || 'Não foi possível carregar os chamados.');
      setTickets([]);
      setSelectedTicket(null);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const filteredTickets = useMemo(() => {
    if (filter === 'todos') return tickets;
    return tickets.filter((ticket) => ticket.status === filter);
  }, [tickets, filter]);

  const originStats = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        const key = ORIGIN_CANONICAL[ticket.origin] ?? 'other';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { other: 0 }
    );
  }, [tickets]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastSyncedAt) return 'Nunca sincronizado';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(lastSyncedAt);
  }, [lastSyncedAt]);

  const handleReply = async (event) => {
    event.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsReplying(true);
    setError(null);

    try {
      await supportService.replyToSupportTicket(selectedTicket.id, replyMessage.trim());
      setReplyMessage('');
      await loadTickets();
    } catch (err) {
      console.error('Erro ao responder chamado:', err);
      setError(err?.message || 'Não foi possível enviar a resposta.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleStatusUpdate = async (ticketId, status) => {
    setIsUpdatingStatus(true);
    setError(null);
    try {
      await supportService.updateSupportTicketStatus(ticketId, STATUS_PAYLOAD[status] || status);
      await loadTickets();
    } catch (err) {
      console.error('Erro ao atualizar status do chamado:', err);
      setError(err?.message || 'Não foi possível atualizar o status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Central de Suporte</h1>
            <p className="text-sm text-gray-600">
              Acompanhe chamados abertos pelos apps de restaurante, cliente e entregador em tempo real.
            </p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Última sincronização:</p>
            <p className="font-medium text-gray-700">{lastUpdatedLabel}</p>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </header>

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

      <section className="grid gap-4 md:grid-cols-3">
        {[['restaurant', Users], ['client', Ticket], ['delivery', Truck]].map(([key, IconComponent]) => {
          const count = originStats[key] || 0;
          const label = ORIGIN_LABELS[key] ?? 'Outros canais';
          return (
            <article
              key={key}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800">{count}</p>
              </div>
              <span className="rounded-full bg-slate-100 p-3 text-slate-500">
                <IconComponent className="h-6 w-6" />
              </span>
            </article>
          );
        })}
        <article className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-500">Outros canais</p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">{originStats.other || 0}</p>
          </div>
          <span className="rounded-full bg-slate-100 p-3 text-slate-500">
            <CircleDashed className="h-6 w-6" />
          </span>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Chamados</h2>
              <p className="text-sm text-slate-500">Últimos chamados recebidos pelos canais digitais.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="todos">Todos</option>
                <option value="andamento">Em andamento</option>
                <option value="aguardando">Aguardando</option>
                <option value="resolvido">Resolvidos</option>
              </select>
              <button
                type="button"
                onClick={loadTickets}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                {isLoading ? 'Sincronizando...' : 'Atualizar'}
              </button>
            </div>
          </header>

          <div className="divide-y divide-slate-100">
            {isLoading && (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Buscando chamados...
              </div>
            )}

            {!isLoading && filteredTickets.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-500">
                Nenhum chamado encontrado para o filtro selecionado.
              </div>
            )}

            {!isLoading &&
              filteredTickets.map((ticket) => {
                const active = selectedTicket?.id === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full py-4 text-left transition ${
                      active ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-800">{ticket.subject}</p>
                        <p className="text-sm text-slate-500">
                          {ticket.category} · {ticket.requester}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Aberto em {formatDateTime(ticket.createdAt)} · Última atualização {formatDateTime(ticket.lastUpdate)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                          STATUS_STYLES[ticket.status] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Detalhes do chamado</h2>
            <p className="text-sm text-slate-500">Visualize e responda chamados encaminhados pelos demais apps.</p>
          </div>

          {selectedTicket ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">{selectedTicket.subject}</p>
                <p className="mt-1 whitespace-pre-line text-slate-600">{selectedTicket.description || 'Sem descrição fornecida.'}</p>
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>
                    <strong>Categoria:</strong> {selectedTicket.category}
                  </p>
                  <p>
                    <strong>Origem:</strong> {ORIGIN_LABELS[selectedTicket.origin] ?? 'Outros canais'}
                  </p>
                  {selectedTicket.requesterEmail && (
                    <p>
                      <strong>Contato:</strong> {selectedTicket.requesterEmail}
                    </p>
                  )}
                  {selectedTicket.reference && (
                    <p>
                      <strong>Referência:</strong> {selectedTicket.reference}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedTicket.id, 'andamento')}
                  disabled={isUpdatingStatus || selectedTicket.status === 'andamento'}
                  className="flex-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Clock className="mr-2 inline h-4 w-4" /> Em andamento
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedTicket.id, 'resolvido')}
                  disabled={isUpdatingStatus || selectedTicket.status === 'resolvido'}
                  className="flex-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 className="mr-2 inline h-4 w-4" /> Resolver
                </button>
              </div>

              <form onSubmit={handleReply} className="space-y-3">
                <label className="block text-sm font-medium text-slate-600" htmlFor="support-reply">
                  Responder chamado
                </label>
                <textarea
                  id="support-reply"
                  value={replyMessage}
                  onChange={(event) => setReplyMessage(event.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Escreva uma orientação ou solicite mais informações ao parceiro..."
                />
                <button
                  type="submit"
                  disabled={isReplying || !replyMessage.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isReplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isReplying ? 'Enviando...' : 'Enviar resposta'}
                </button>
              </form>

              {selectedTicket.attachments?.length > 0 && (
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                  <p className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
                    <Paperclip className="h-4 w-4" /> Anexos recebidos
                  </p>
                  <ul className="space-y-1">
                    {selectedTicket.attachments.map((attachment) => (
                      <li key={attachment.id ?? attachment.url}>
                        <a
                          href={attachment.url || attachment.link}
                          className="text-indigo-600 hover:text-indigo-500"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {attachment.name || attachment.filename || attachment.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-sm text-slate-500">
              <Ticket className="mb-3 h-10 w-10 text-slate-300" />
              Selecione um chamado na lista para visualizar os detalhes e responder ao solicitante.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

