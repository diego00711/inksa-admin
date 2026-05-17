// src/services/apiClient.js
// Wrapper global de fetch com interceptação de 401/403.
// Ao detectar resposta não autorizada, limpa o token do localStorage
// e dispara o evento customizado 'auth:unauthorized' para que o App
// redirecione o usuário para a tela de login com uma notificação.

const AUTH_TOKEN_KEY = 'adminAuthToken';
const ADMIN_USER_DATA_KEY = 'adminUser';

/**
 * Substituto de `fetch` que intercepta status 401 e 403.
 * Mantém a mesma assinatura de `fetch(input, init)`.
 */
export async function apiFetch(input, init = {}) {
  let response;
  try {
    response = await fetch(input, init);
  } catch (networkError) {
    // Erros de rede (sem conectividade, CORS bloqueado, etc.)
    throw networkError;
  }

  if (response.status === 401 || response.status === 403) {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_DATA_KEY);
    } catch {
      // Ignora falhas de acesso ao localStorage
    }
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  return response;
}
