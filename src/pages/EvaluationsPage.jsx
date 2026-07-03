import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Star, Users } from 'lucide-react';
import { fetchEvaluationSummary, fetchEvaluations } from '../services/evaluations';
import {
  PERIOD_OPTIONS,
  SCOPE_OPTIONS,
  buildRange,
  parseNumber,
  firstValue,
  formatDateTime,
} from '../utils/adminFormat';

export default function EvaluationsPage() {
  const [scope, setScope] = useState('restaurant');
  const [period, setPeriod] = useState('30d');
  const [refreshKey, setRefreshKey] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState(createEmptySummary());
  const [evaluations, setEvaluations] = useState([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const range = useMemo(() => buildRange(period), [period]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const params = { scope, ...range };
        const [summaryResponse, evaluationsResponse] = await Promise.all([
          fetchEvaluationSummary(params),
          fetchEvaluations({ ...params, limit: 10 }),
        ]);

        if (cancelled) return;

        setSummary(normalizeSummary(summaryResponse));
        setEvaluations(normalizeEvaluations(evaluationsResponse));
        setLastUpdatedAt(new Date());
      } catch (err) {
        if (cancelled) return;
        console.error('Erro ao carregar avaliações:', err);
        setSummary(createEmptySummary());
        setEvaluations([]);
        setLastUpdatedAt(null);
        setError(err?.message || 'Não foi possível carregar os dados.');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [scope, range, refreshKey]);

  const summaryCards = [
    {
      label: 'Avaliação média',
      value: summary.averageRating !== null ? summary.averageRating.toFixed(1) : '—',
      description:
        summary.totalReviews > 0
          ? `${summary.totalReviews} avaliação${summary.totalReviews === 1 ? '' : 's'}`
          : 'Sem avaliações no período',
      icon: <Star className="h-5 w-5" />,
    },
    {
      label: 'Taxa de resposta',
      value: summary.responseRate !== null ? `${Math.round(summary.responseRate * 100)}%` : '—',
      description: 'Interações respondidas pela equipe',
      icon: <Users className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-800">Avaliações</h1>
            <p className="text-sm text-gray-600">
              Acompanhe a satisfação dos clientes com restaurantes e entregadores da plataforma.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="flex overflow-hidden rounded-md border border-gray-200 bg-white">
              {SCOPE_OPTIONS.map((option) => {
                const active = option.value === scope;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setScope(option.value)}
                    className={`px-3 py-2 text-sm font-medium transition ${
                      active ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setRefreshKey((value) => value + 1)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isLoading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          <span>
            Período: {range.from} a {range.to}
          </span>
          {lastUpdatedAt && (
            <span className="ml-3">Última atualização: {formatDateTime(lastUpdatedAt)}</span>
          )}
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="mt-1 text-xs text-gray-500">{card.description}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                {card.icon}
              </div>
            </div>
          </article>
        ))}
      </section>

      <RatingsPanel distribution={summary.distribution} total={summary.totalReviews} loading={isLoading} />
      <EvaluationsList items={evaluations} loading={isLoading} />
    </div>
  );
}

function RatingsPanel({ distribution, total, loading }) {
  const ratings = [5, 4, 3, 2, 1];
  const totalCount = total ?? ratings.reduce((acc, rating) => acc + Number(distribution?.[rating] ?? 0), 0);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Distribuição das notas</h2>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>
      {totalCount === 0 ? (
        <p className="text-sm text-gray-500">Ainda não há avaliações registradas no período informado.</p>
      ) : (
        <ul className="space-y-3">
          {ratings.map((rating) => {
            const count = Number(distribution?.[rating] ?? 0);
            const percent = totalCount ? Math.round((count / totalCount) * 100) : 0;
            return (
              <li key={rating}>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
                    {rating} estrela{rating > 1 ? 's' : ''}
                  </span>
                  <span>
                    {count} ({percent}%)
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500" style={{ width: `${percent}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EvaluationsList({ items, loading }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Avaliações recentes</h2>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Carregando avaliações...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma avaliação encontrada para o recorte selecionado.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((evaluation) => (
            <li key={evaluation.id} className="rounded-md border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{evaluation.target || 'Participante'}</p>
                  <p className="text-xs text-gray-500">
                    Cliente: {evaluation.reviewer}
                    {evaluation.orderCode ? ` • Pedido ${evaluation.orderCode}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <StarRating value={evaluation.rating} />
                  {evaluation.createdAt && (
                    <p className="text-xs text-gray-400">{formatDateTime(evaluation.createdAt)}</p>
                  )}
                </div>
              </div>
              {evaluation.comment && <p className="mt-3 text-sm text-gray-700">"{evaluation.comment}"</p>}
              {evaluation.response && (
                <div className="mt-3 rounded-md bg-white p-3 text-xs text-gray-600">
                  <p className="font-semibold text-gray-700">Resposta da equipe</p>
                  <p>{evaluation.response}</p>
                </div>
              )}
              {evaluation.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {evaluation.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StarRating({ value }) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) {
    return <span className="text-xs text-gray-400">Sem nota</span>;
  }

  return (
    <div className="flex items-center gap-1 text-yellow-500">
      {[1, 2, 3, 4, 5].map((index) => {
        const filled = rating >= index - 0.2;
        return (
          <Star
            key={index}
            className={`h-4 w-4 ${filled ? 'text-yellow-500' : 'text-gray-300'}`}
            fill={filled ? 'currentColor' : 'none'}
          />
        );
      })}
      <span className="ml-1 text-sm font-semibold text-gray-700">{rating.toFixed(1)}</span>
    </div>
  );
}

function createEmptySummary() {
  return {
    averageRating: null,
    totalReviews: 0,
    responseRate: null,
    distribution: {},
  };
}

function normalizeSummary(raw) {
  const payload = raw?.summary ?? raw ?? {};
  return {
    averageRating: parseNumber(payload.average_rating ?? payload.averageRating),
    totalReviews: parseInt(payload.total_reviews ?? payload.totalReviews ?? 0, 10) || 0,
    responseRate: parseNumber(payload.response_rate ?? payload.responseRate),
    distribution: payload.distribution ?? payload.ratings ?? {},
  };
}

function normalizeEvaluations(raw) {
  const list = raw?.items ?? raw?.data ?? raw ?? [];
  if (!Array.isArray(list)) return [];

  return list
    .map((item, index) => {
      const id = item?.id ?? item?.review_id ?? `evaluation-${index}`;
      const rating = parseNumber(item?.rating ?? item?.score ?? item?.stars);
      const comment = firstValue(item?.comment, item?.review, item?.feedback);

      if (rating === null && !comment) {
        return null;
      }

      return {
        id,
        rating,
        comment: comment ?? '',
        createdAt: firstValue(item?.created_at, item?.createdAt, item?.date),
        reviewer: firstValue(item?.reviewer_name, item?.customer_name, item?.client_name, 'Cliente'),
        target: firstValue(item?.target_name, item?.restaurant_name, item?.delivery_name),
        orderCode: firstValue(item?.order_code, item?.orderId, item?.order),
        response: firstValue(item?.response, item?.reply, item?.admin_response) ?? '',
        tags: Array.isArray(item?.tags)
          ? item.tags
          : Array.isArray(item?.labels)
            ? item.labels
            : [],
      };
    })
    .filter(Boolean);
}
