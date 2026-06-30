import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mail, MessageCircle, Phone, Headset,
  CheckCircle2, Clock, AlertCircle, CircleDashed,
  Send, RefreshCw, Loader2, ArrowLeft, Search,
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import authService from '../services/authService';

const FALLBACK_SUPPORT = {
  email: 'suporte@inksadelivery.com.br',
  whatsapp: '5549999679697',
  phone: '(49) 99967-9697',
  hours: 'Seg a Sex, 8h às 18h',
};

const STATUS_META = {
  aberto:    { label: 'Aberto',       className: 'bg-slate-100 text-slate-700 border-slate-200',     Icon: CircleDashed },
  aguardando:{ label: 'Aguardando',   className: 'bg-amber-50 text-amber-700 border-amber-200',      Icon: AlertCircle },
  andamento: { label: 'Em andamento', className: 'bg-blue-50 text-blue-700 border-blue-200',         Icon: Clock },
  resolvido: { label: 'Resolvido',    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',Icon: CheckCircle2 },
};

function buildChannels(info) {
  return [
    { icon: Mail,          label: 'E-mail',     description: info.email || FALLBACK_SUPPORT.email,  sla: info.hours || FALLBACK_SUPPORT.hours, href: `mailto:${info.email || FALLBACK_SUPPORT.email}` },
    { icon: MessageCircle, label: 'WhatsApp',   description: info.phone || FALLBACK_SUPPORT.phone,  sla: info.hours || FALLBACK_SUPPORT.hours, href: `https://wa.me/${(info.whatsapp || FALLBACK_SUPPORT.whatsapp).replace(/\D/g, '')}` },
    { icon: Phone,         label: 'Telefone',   description: info.phone || FALLBACK_SUPPORT.phone,  sla: info.hours || FALLBACK_SUPPORT.hours },
    { icon: Headset,       label: 'Configurar',  description: 'Edite em Configurações → Contato',    sla: 'Mudança reflete nos apps em até 1h' },
  ];
}

function headers() {
  const token = authService.getToken();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function TicketRow({ ticket, onClick }) {
  const status = STATUS_META[ticket.status] || STATUS_META.aberto;
  return (
    <button onClick={onClick} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-3 border-b border-slate-100 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 truncate">{ticket.subject}</p>
        <p className="text-xs text-slate-500">
          {ticket.category} • {ticket.priority} • {ticket.user_type} • {new Date(ticket.updated_at).toLocaleString('pt-BR')}
        </p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 border ${status.className}`}>
        {status.label}
      </span>
    </button>
  );
}

function TicketDetail({ ticketId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}`, { headers: headers() });
      const json = await res.json();
      if (res.ok) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setBody('');
        await fetchData();
      }
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (newStatus) => {
    await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
  if (!data) return <p className="text-sm text-slate-500">Chamado não encontrado.</p>;

  const { ticket, messages } = data;
  const status = STATUS_META[ticket.status] || STATUS_META.aberto;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> Voltar para a lista
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-slate-900 text-lg">{ticket.subject}</h2>
            <p className="text-xs text-slate-500">
              {ticket.category} • Prioridade {ticket.priority} • Aberto em {new Date(ticket.created_at).toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-slate-500 mt-1">Usuário tipo: <strong>{ticket.user_type}</strong></p>
          </div>
          <select
            value={ticket.status}
            onChange={(e) => changeStatus(e.target.value)}
            className={`text-xs px-2 py-1 rounded-full font-medium border ${status.className}`}
          >
            <option value="aberto">Aberto</option>
            <option value="aguardando">Aguardando</option>
            <option value="andamento">Em andamento</option>
            <option value="resolvido">Resolvido</option>
          </select>
        </div>

        <div className="space-y-3 mt-4 max-h-[400px] overflow-y-auto pr-2">
          {messages.map((m) => {
            const isAdmin = m.author_role === 'admin';
            return (
              <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isAdmin ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-800'}`}>
                  <p className="text-xs font-semibold mb-0.5">{isAdmin ? 'Suporte Inksa' : `Cliente (${m.author_role})`}</p>
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{new Date(m.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={send} className="flex gap-2 mt-4">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escreva uma resposta…"
            className="flex-1 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
          <button type="submit" disabled={sending || !body.trim()} className="bg-blue-600 text-white rounded-full p-2 disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const [supportInfo, setSupportInfo] = useState(FALLBACK_SUPPORT);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public/support-info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSupportInfo({ ...FALLBACK_SUPPORT, ...d }))
      .catch(() => {});
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/support/tickets`, { headers: headers() });
      const json = await res.json();
      if (res.ok) setTickets(json.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const CHANNELS = useMemo(() => buildChannels(supportInfo), [supportInfo]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== 'todos' && t.status !== statusFilter) return false;
      if (search && !`${t.subject} ${t.category}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tickets, statusFilter, search]);

  const counts = useMemo(() => {
    return {
      todos: tickets.length,
      aberto: tickets.filter((t) => t.status === 'aberto').length,
      aguardando: tickets.filter((t) => t.status === 'aguardando').length,
      andamento: tickets.filter((t) => t.status === 'andamento').length,
      resolvido: tickets.filter((t) => t.status === 'resolvido').length,
    };
  }, [tickets]);

  if (selected) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <TicketDetail ticketId={selected} onBack={() => { setSelected(null); fetchTickets(); }} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Central de Suporte</h1>
          <p className="text-sm text-slate-500">Atendimento aos usuários dos apps</p>
        </div>
        <button onClick={fetchTickets} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* Canais de contato */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CHANNELS.map(({ icon: Icon, label, description, sla, href }) => {
          const Wrapper = href ? 'a' : 'article';
          const wrapperProps = href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {};
          return (
            <Wrapper
              key={label}
              {...wrapperProps}
              className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${href ? 'hover:border-blue-300 hover:shadow-md transition-all cursor-pointer' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-800">{label}</h3>
                  <p className="text-sm text-slate-500 truncate">{description}</p>
                </div>
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">{sla}</p>
            </Wrapper>
          );
        })}
      </section>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por assunto ou categoria…"
              className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {['todos', 'aberto', 'aguardando', 'andamento', 'resolvido'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {s === 'todos' ? 'Todos' : STATUS_META[s].label} ({counts[s]})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {tickets.length === 0 ? 'Nenhum chamado aberto ainda.' : 'Nenhum chamado com esses filtros.'}
            </p>
          </div>
        ) : (
          filtered.map((t) => (
            <TicketRow key={t.id} ticket={t} onClick={() => setSelected(t.id)} />
          ))
        )}
      </div>
    </div>
  );
}
