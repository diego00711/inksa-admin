import { request } from './api';

export function fetchEvaluationSummary(params = {}) {
  return request('/api/admin/evaluations/summary', {
    params,
    service: 'gamification',
  });
}

export function fetchEvaluations(params = {}) {
  return request('/api/admin/evaluations', {
    params,
    service: 'gamification',
  });
}

export function fetchGamificationOverview(params = {}) {
  return request('/api/admin/gamification/overview', {
    params,
    service: 'gamification',
  });
}

export function fetchGamificationLeaderboard(params = {}) {
  return request('/api/admin/gamification/leaderboard', {
    params,
    service: 'gamification',
  });
}

export function fetchGamificationParticipant(scope, participantId) {
  if (!scope || !participantId) {
    throw new Error('Escopo e participante são obrigatórios.');
  }
  return request(`/api/admin/gamification/${scope}/${participantId}`, {
    service: 'gamification',
  });
}

export function triggerGamificationRecalculation(params = {}) {
  return request('/api/admin/gamification/recalculate', {
    method: 'POST',
    body: params,
    service: 'gamification',
  });
}
