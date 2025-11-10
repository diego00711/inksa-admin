import { request } from './api';

export function fetchEvaluationSummary(params = {}) {
  return request('/api/admin/evaluations/summary', { params });
}

export function fetchEvaluations(params = {}) {
  return request('/api/admin/evaluations', { params });
}

export function fetchGamificationOverview(params = {}) {
  return request('/api/admin/gamification/overview', { params });
}

export function fetchGamificationLeaderboard(params = {}) {
  return request('/api/admin/gamification/leaderboard', { params });
}

export function fetchGamificationParticipant(scope, participantId) {
  if (!scope || !participantId) {
    throw new Error('Escopo e participante são obrigatórios.');
  }
  return request(`/api/admin/gamification/${scope}/${participantId}`);
}

export function triggerGamificationRecalculation(params = {}) {
  return request('/api/admin/gamification/recalculate', {
    method: 'POST',
    body: params,
  });
}
