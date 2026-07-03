import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Trophy, Zap } from 'lucide-react';
import { fetchGamificationLeaderboard, fetchGamificationOverview } from '../services/evaluations';
import {
  PERIOD_OPTIONS,
  SCOPE_OPTIONS,
  buildRange,
  parseNumber,
  firstValue,
  formatNumber,
  formatDateTime,
} from '../utils/adminFormat';

export default function GamificationPage() {
  const [scope, setScope] = useState('restaurant');
  const [period, setPeriod] = useState('30d');
  const [refreshKey, setRefreshKey] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
        const [overviewResponse, leaderboardResponse] = await Promise.all([
          fetchGamificationOverview(params),
          fetchGamificationLeaderboard({ ...params, limit: 10 }),
        ]);

        if (cancelled) return;

        const { overview: overviewPayload, achievements: achievementsPayload } = normalizeOverview(overviewResponse);
        setOverview(overviewPayload);
        setAchievements(achievementsPayload);
        setLeaderboard(normalizeLeaderboard(leaderboardResponse));
        setLastUpdatedAt(new Date());
      } catch (err) {
        if (cancelled) return;
        console.error('Erro ao carregar gamificação:', err);
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
            <h1 className="text-xl sm:text-3xl font-bold text-gray-800">Gamificação</h1>
            <p className="text-sm text-gray-600">
              Acompanhe o engajamento, pontos e conquistas dos parceiros da plataforma.
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

      <GamificationSummary overview={overview} achievements={achievements} loading={isLoading} scopeLabel={scopeLabel} />

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

function GamificationSummary({ overview, achievements, loading, scopeLabel }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
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

function createEmptyOverview() {
  return {
    totalXp: null,
    participants: null,
    averageLevel: null,
    activeChallenges: null,
    bestStreak: null,
  };
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
    type: firstValue(entry?.profile_type, entry?.type, entry?.partner_type, entry?.category, ''),
    xp: parseNumber(entry?.xp ?? entry?.points ?? entry?.score ?? entry?.total_points),
    level: firstValue(entry?.level_name, entry?.level, entry?.rank_label, entry?.tier, ''),
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
