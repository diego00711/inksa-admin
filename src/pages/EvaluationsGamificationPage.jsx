import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Star, Trophy, Users, Zap } from 'lucide-react';
import {
  fetchEvaluationSummary,
  fetchEvaluations,
  fetchGamificationLeaderboard,
  fetchGamificationOverview,
} from '../services/evaluations';

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
];

const SCOPE_OPTIONS = [
  { value: 'restaurant', label: 'Restaurantes' },
  { value: 'customer', label: 'Clientes' },
  { value: 'delivery', label: 'Entregadores' },
];

const PERIOD_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export default function EvaluationsGamificationPage() {
  const [scope, setScope] = useState('restaurant');
  const [period, setPeriod] = useState('30d');
  const [refreshKey, setRefreshKey] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState(createEmptySummary());
  const [evaluations, setEvaluations] = useState([]);
  const [overview, setOverview] = useState(createEmptyOverview());
  const [achievements, setAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const range = useMemo(() => buildRange(period), [period]);
  const scopeLabel = SCOPE_OPTIONS.find((option) => option.value === scope)?.label ?? 'Escopo';

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const params = { scope, ...range };
        const [summaryResponse, evaluationsResponse, overviewResponse, leaderboardResponse] = await Promise.all([
          fetchEvaluationSummary(params),
          fetchEvaluations({ ...params, limit: 10 }),
          fetchGamificationOverview(params),
          fetchGamificationLeaderboard({ ...params, limit: 10 }),
        ]);

        if (cancelled) return;

        setSummary(normalizeSummary(summaryResponse));
        setEvaluations(normalizeEvaluations(evaluationsResponse));

        const { overview: overviewPayload, achievements: achievementsPayload } = normalizeOverview(overviewResponse);
        setOverview(overviewPayload);
        setAchievements(achievementsPayload);

        setLeaderboard(normalizeLeaderboard(leaderboardResponse));
        setLastUpdatedAt(new Date());
      } catch (err) {
        if (cancelled) return;
        console.error('Erro ao carregar avaliações/gamificação:', err);
        setSummary(createEmptySummary());
        setEvaluations([]);
        setOverview(createEmptyOverview());
        setAchievements([]);
        setLeaderboard([]);
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
    {
      label: 'XP acumulado',
      value: overview.totalXp !== null ? formatNumber(overview.totalXp) : '—',
      description: 'Somatório de pontos do programa',
      icon: <Zap className="h-5 w-5" />,
    },
    {
      label: 'Participantes ativos',
      value: overview.participants !== null ? formatNumber(overview.participants) : '—',
      description: scopeLabel,
      icon: <Trophy className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Avaliações & Gamificação</h1>
            <p className="text-sm text-gray-600">
              Consolide a satisfação dos clientes e o engajamento dos parceiros da plataforma.
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <RatingsPanel distribution={summary.distribution} total={summary.totalReviews} loading={isLoading} />
          <EvaluationsList items={evaluations} loading={isLoading} />
        </div>
        <GamificationSidebar
          overview={overview}
          achievements={achievements}
          loading={isLoading}
          scopeLabel={scopeLabel}
        />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Ranking de {scopeLabel.toLowerCase()}</h2>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum participante possui pontos para exibição no período selecionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Posição</th>
                  <th className="px-3 py-2 text-left">Participante</th>
                  <th className="px-3 py-2 text-left">XP</th>
                  <th className="px-3 py-2 text-left">Nível</th>
                  <th className="px-3 py-2 text-left">Badges</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-semibold text-gray-700">{entry.position}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">{entry.name}</span>
                        {entry.type && <span className="text-xs text-gray-500">{entry.type}</span>}
                        {entry.lastUpdate && (
                          <span className="text-xs text-gray-400">Atualizado em {formatDateTime(entry.lastUpdate)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">{entry.xp !== null ? formatNumber(entry.xp) : '—'}</td>
                    <td className="px-3 py-2">{entry.level || '—'}</td>
                    <td className="px-3 py-2">
                      {entry.badges.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {entry.badges.slice(0, 3).map((badge) => (
                            <span
                              key={badge.id}
                              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600"
                            >
                              <span>{badge.icon ?? '🏅'}</span>
                              <span>{badge.name}</span>
                            </span>
                          ))}
                          {entry.badges.length > 3 && (
                            <span className="text-xs text-gray-500">+{entry.badges.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sem conquistas</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
              {evaluation.comment && <p className="mt-3 text-sm text-gray-700">“{evaluation.comment}”</p>}
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

function GamificationSidebar({ overview, achievements, loading, scopeLabel }) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Resumo de gamificação</h2>
            <p className="text-xs text-gray-500">Dados referentes a {scopeLabel.toLowerCase()}.</p>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <GamificationStat label="Participantes ativos" value={overview.participants} />
          <GamificationStat label="XP total acumulado" value={overview.totalXp} />
          <GamificationStat label="Nível médio" value={overview.averageLevel} decimals={1} />
          <GamificationStat label="Desafios ativos" value={overview.activeChallenges} />
        </div>
        {overview.bestStreak !== null && overview.bestStreak > 0 && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
            🔥 Maior sequência ativa: {overview.bestStreak} dias
          </p>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Conquistas & Badges</h2>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>
        {achievements.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma conquista cadastrada para exibição.</p>
        ) : (
          <ul className="space-y-4">
            {achievements.map((achievement) => (
              <li key={achievement.id} className="rounded-md border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{achievement.name}</p>
                    {achievement.description && (
                      <p className="mt-1 text-xs text-gray-500">{achievement.description}</p>
                    )}
                  </div>
                  <span className="text-2xl">{achievement.icon ?? '🏅'}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                  {achievement.threshold !== null && <span>Meta: {formatNumber(achievement.threshold)}</span>}
                  {achievement.xp !== null && <span>Recompensa: {formatNumber(achievement.xp)} XP</span>}
                  {achievement.totalAwarded !== null && <span>Entregue: {formatNumber(achievement.totalAwarded)}x</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function GamificationStat({ label, value, decimals = 0 }) {
  return (
    <div className="rounded-md bg-gray-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-800">{value === null ? '—' : formatNumber(value, { decimals })}</p>
    </div>
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

function buildRange(period) {
  const today = new Date();
  const days = PERIOD_DAYS[period] ?? 30;
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));

  const toDate = today.toISOString().slice(0, 10);
  const fromDate = from.toISOString().slice(0, 10);

  return {
    period,
    from: fromDate,
    to: toDate,
  };
}

function createEmptySummary() {
  return {
    averageRating: null,
    totalReviews: 0,
    responseRate: null,
    distribution: {},
  };
}

function createEmptyOverview() {
  return {
    totalXp: null,
    participants: null,
    averageLevel: null,
    activeChallenges: null,
    bestStreak: null,
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

function normalizeOverview(raw) {
  const base = raw?.overview ?? raw ?? {};
  const achievementsSource = Array.isArray(raw?.achievements)
    ? raw.achievements
    : Array.isArray(raw?.badges)
      ? raw.badges
      : Array.isArray(base?.achievements)
        ? base.achievements
        : Array.isArray(base?.badges)
          ? base.badges
          : [];

  return {
    overview: {
      totalXp: parseNumber(base.total_xp ?? base.totalXp ?? base.points_total),
      participants: parseNumber(base.participants ?? base.total_participants ?? base.players),
      averageLevel: parseNumber(base.average_level ?? base.avg_level ?? base.level_avg),
      activeChallenges: parseNumber(base.active_challenges ?? base.challenges_active ?? base.challenges),
      bestStreak: parseNumber(base.best_streak ?? base.longest_streak ?? base.top_streak),
    },
    achievements: achievementsSource
      .map((entry, index) => normalizeAchievement(entry, index))
      .filter(Boolean),
  };
}

function normalizeAchievement(entry, index) {
  if (!entry) return null;

  if (typeof entry === 'string') {
    return {
      id: entry,
      name: entry,
      description: null,
      threshold: null,
      xp: null,
      totalAwarded: null,
      icon: null,
    };
  }

  return {
    id: entry.id ?? entry.slug ?? `achievement-${index}`,
    name: firstValue(entry.name, entry.title, 'Conquista'),
    description: firstValue(entry.description, entry.details, ''),
    threshold: parseNumber(entry.threshold ?? entry.goal ?? entry.target),
    xp: parseNumber(entry.xp ?? entry.points ?? entry.reward),
    totalAwarded: parseNumber(entry.total_awarded ?? entry.totalAwarded ?? entry.count),
    icon: entry.icon ?? null,
  };
}

function normalizeLeaderboard(raw) {
  const list = raw?.leaderboard ?? raw?.items ?? raw ?? [];
  if (!Array.isArray(list)) return [];

  return list.map((entry, index) => ({
    id: entry?.id ?? entry?.partner_id ?? entry?.user_id ?? `leaderboard-${index}`,
    position: entry?.position ?? entry?.rank ?? index + 1,
    name: firstValue(entry?.name, entry?.restaurant_name, entry?.partner_name, entry?.delivery_name, 'Participante'),
    type: firstValue(entry?.type, entry?.partner_type, entry?.category, ''),
    xp: parseNumber(entry?.xp ?? entry?.points ?? entry?.score),
    level: firstValue(entry?.level, entry?.rank_label, entry?.tier, ''),
    badges: Array.isArray(entry?.badges)
      ? entry.badges.map((badge, badgeIndex) => ({
          id: badge?.id ?? badge?.slug ?? `badge-${index}-${badgeIndex}`,
          name: firstValue(badge?.name, badge?.title, 'Badge'),
          icon: badge?.icon ?? null,
        }))
      : [],
    lastUpdate: firstValue(entry?.updated_at, entry?.updatedAt, entry?.last_update),
  }));
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? null;
}

function formatNumber(value, { decimals = 0 } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value));
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
