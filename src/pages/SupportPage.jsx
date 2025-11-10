import React, { useMemo, useState, useEffect } from 'react';
import {
  Mail,
  MessageCircle,
  Phone,
  Headset,
  CheckCircle2,
  Clock,
  AlertCircle,
  CircleDashed,
  Paperclip,
  Send,
} from 'lucide-react';

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

const FAQS = [
  {
    question: 'Como acompanho um chamado aberto?',
    answer:
      'Você pode consultar o status acessando Configurações > Suporte ou clicando no link enviado por e-mail no momento da abertura.',
  },
  {
    question: 'Quais são os níveis de criticidade?',
    answer:
      'Classificamos em Baixo (dúvidas gerais), Médio (impacto parcial) e Crítico (paralisação do serviço). Utilize a categoria correta para priorização.',
  },
  {
    question: 'Posso anexar evidências?',
    answer:
      'Sim. Adicione prints, planilhas ou logs no campo de anexos. Isso acelera o diagnóstico da equipe técnica.',
  },
];

const STATUS_STYLES = {
  resolvido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  andamento: 'bg-blue-50 text-blue-700 border-blue-200',
  aguardando: 'bg-amber-50 text-amber-700 border-amber-200',
};

const STORAGE_KEY = 'inksa.support.tickets';

function usePersistedTickets(initialTickets) {
  const [tickets, setTickets] = useState(() => {
    if (typeof window === 'undefined') return initialTickets;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return initialTickets;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return initialTickets;
      return parsed;
    } catch (err) {
      console.warn('Falha ao carregar tickets locais', err);
      return initialTickets;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch (err) {
      console.warn('Falha ao persistir tickets', err);
    }
  }, [tickets]);

  return [tickets, setTickets];
}

export default function SupportPage() {
  const [tickets, setTickets] = usePersistedTickets([
    {
      id: 'SUP-1523',
      subject: 'Integração com gateway de pagamentos',
      createdAt: '2024-02-12T09:24:00',
      requester: 'Paula Fernandes',
      status: 'andamento',
      lastUpdate: '2024-02-13T16:10:00',
      category: 'Integração',
    },
    {
      id: 'SUP-1507',
      subject: 'Erro ao atualizar cardápio',
      createdAt: '2024-02-10T14:05:00',
      requester: 'Rogério Lima',
      status: 'aguardando',
      lastUpdate: '2024-02-11T11:40:00',
      category: 'Restaurantes',
    },
    {
      id: 'SUP-1488',
      subject: 'Dúvida sobre relatório financeiro',
      createdAt: '2024-02-08T08:35:00',
      requester: 'Carla Souza',
      status: 'resolvido',
      lastUpdate: '2024-02-08T18:20:00',
      category: 'Financeiro',
    },
  ]);
  const [filter, setFilter] = useState('todos');
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'Dúvida',
    priority: 'Baixo',
    attachment: '',
  });
  const [feedback, setFeedback] = useState(null);

  const filteredTickets = useMemo(() => {
    if (filter === 'todos') return tickets;
    return tickets.filter((ticket) => ticket.status === filter);
  }, [tickets, filter]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) {
      setFeedback({ type: 'error', message: 'Informe um título e descreva o ocorrido antes de enviar.' });
      return;
    }

    const draftTicket = {
      id: `SUP-${Math.floor(Math.random() * 9000 + 1000)}`,
      subject: formData.subject.trim(),
      createdAt: new Date().toISOString(),
      requester: 'Você',
      status: 'aguardando',
      lastUpdate: new Date().toISOString(),
      category: formData.category,
      priority: formData.priority,
      attachment: formData.attachment,
      localOnly: true,
    };
    setTickets((prev) => [draftTicket, ...prev]);
    setFeedback({ type: 'success', message: 'Chamado registrado localmente. Ao sincronizar com o backend ele será enviado automaticamente.' });
    setFormData({ subject: '', description: '', category: 'Dúvida', priority: 'Baixo', attachment: '' });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Suporte & Atendimento</h1>
        <p className="text-gray-600">Centralize chamados, acompanhe SLAs e mantenha o time informado.</p>
      </div>

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

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Chamados recentes</h2>
              <p className="text-sm text-slate-500">Acompanhe o status dos atendimentos em andamento.</p>
            </div>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="todos">Todos</option>
              <option value="andamento">Em andamento</option>
              <option value="aguardando">Aguardando resposta</option>
              <option value="resolvido">Resolvidos</option>
            </select>
          </header>
          <ul className="space-y-3">
            {filteredTickets.map((ticket) => {
              const StatusIcon =
                ticket.status === 'resolvido' ? CheckCircle2 : ticket.status === 'andamento' ? Clock : AlertCircle;
              return (
                <li
                  key={ticket.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-500">{ticket.id}</p>
                    <span className="text-xs uppercase tracking-wide text-slate-400">{new Date(ticket.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">{ticket.subject}</h3>
                      <p className="text-sm text-slate-500">{ticket.category}</p>
                      <p className="text-xs text-slate-400">Solicitante: {ticket.requester}</p>
                    </div>
                    <span
                      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                        STATUS_STYLES[ticket.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <StatusIcon className="h-4 w-4" />
                      {ticket.status === 'andamento'
                        ? 'Em andamento'
                        : ticket.status === 'aguardando'
                          ? 'Aguardando cliente'
                          : 'Resolvido'}
                    </span>
                  </div>
                  {ticket.localOnly && (
                    <p className="text-xs font-medium text-amber-600">Rascunho local - aguarda sincronização com o backend.</p>
                  )}
                  <p className="text-xs text-slate-400">
                    Última atualização {new Date(ticket.lastUpdate).toLocaleString('pt-BR')}
                    {ticket.priority ? ` • Prioridade ${ticket.priority}` : ''}
                  </p>
                </li>
              );
            })}
            {!filteredTickets.length && (
              <li className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 p-6 text-slate-400">
                <CircleDashed className="h-5 w-5" />
                Nenhum chamado encontrado com o filtro selecionado.
              </li>
            )}
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header>
            <h2 className="text-xl font-semibold text-slate-800">Abrir novo chamado</h2>
            <p className="text-sm text-slate-500">Registre problemas e acompanhe pelo painel.</p>
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="subject">
              Título
            </label>
            <input
              id="subject"
              value={formData.subject}
              onChange={(event) => setFormData((prev) => ({ ...prev, subject: event.target.value }))}
              placeholder="Ex.: Falha ao sincronizar pedidos"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="description">
              Descrição
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Explique o cenário, passos para reproduzir, impacto e anexos relevantes."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600" htmlFor="category">
                Categoria
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option>Integração</option>
                <option>Financeiro</option>
                <option>Restaurantes</option>
                <option>Dúvida</option>
                <option>Outro</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600" htmlFor="priority">
                Prioridade
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(event) => setFormData((prev) => ({ ...prev, priority: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option>Baixo</option>
                <option>Médio</option>
                <option>Alto</option>
                <option>Crítico</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="attachment">
              Anexos (URL ou referência)
            </label>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Paperclip className="h-4 w-4" />
              </span>
              <input
                id="attachment"
                value={formData.attachment}
                onChange={(event) => setFormData((prev) => ({ ...prev, attachment: event.target.value }))}
                placeholder="Cole aqui o link do arquivo ou print"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Send className="h-4 w-4" /> Enviar chamado
          </button>
        </form>
      </section>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2">
        <article>
          <h2 className="text-xl font-semibold text-slate-800">Base de conhecimento</h2>
          <p className="mt-1 text-sm text-slate-500">Guia rápido para dúvidas recorrentes dos times de operações.</p>
          <ul className="mt-4 space-y-3">
            {FAQS.map((faq) => (
              <li key={faq.question} className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-medium text-slate-800">{faq.question}</h3>
                <p className="mt-2 text-sm text-slate-500">{faq.answer}</p>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-semibold text-slate-800">Status das operações</h2>
          <p className="mt-1 text-sm text-slate-500">Monitore incidentes em andamento e avisos gerais para o ecossistema.</p>
          <ul className="mt-4 space-y-3">
            <li className="flex items-start gap-3 rounded-lg bg-emerald-100/60 p-3 text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-5 w-5" /> Plataformas operacionais funcionando normalmente.
            </li>
            <li className="flex items-start gap-3 rounded-lg bg-amber-100/70 p-3 text-amber-700">
              <AlertCircle className="mt-0.5 h-5 w-5" /> Aviso: atraso de até 5 minutos nos webhooks de pedidos (monitorando).
            </li>
            <li className="flex items-start gap-3 rounded-lg bg-blue-100/70 p-3 text-blue-700">
              <Clock className="mt-0.5 h-5 w-5" /> Próxima janela de manutenção: 20/02 às 23h (enviaremos lembrete automático).
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
