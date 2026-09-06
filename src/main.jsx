import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConfirmProvider } from './components/ConfirmProvider.jsx'
import { iniciarAutoAtualizacao } from './utils/autoAtualiza'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}


// TELA BRANCA DEPOIS DE DEPLOY — a causa, medida em produção em 05/09/2026:
// o host devolve o index.html (HTTP 200, content-type text/html) para
// QUALQUER caminho, inclusive /assets/*. Uma aba aberta antes do deploy pede o
// chunk antigo da rota, recebe HTML no lugar de JavaScript, o browser recusa
// executar como módulo, o import dinâmico rejeita — e a tela fica BRANCA.
//
// O admin é onde mais se deixa aba aberta o dia inteiro, então é onde mais
// acontece.
//
// Recarrega UMA vez pra pegar o index novo, com trava de tempo pra nunca virar
// loop. Vale inclusive nas rotas sensíveis: aqui o dado já se perdeu de
// qualquer jeito — a escolha é entre voltar funcionando e ficar no branco.
window.addEventListener('vite:preloadError', () => {
  const last = Number(sessionStorage.getItem('preloadErrReloadAt')) || 0;
  if (Date.now() - last < 10000) return;
  sessionStorage.setItem('preloadErrReloadAt', String(Date.now()));
  // JOGA O CACHE FORA ANTES DE RECARREGAR. Sem isto o reload le o MESMO cache
  // envenenado do service worker (HTML gravado sob nome de .js) e a tela branca
  // volta identica — foi exatamente o que aconteceu em 05/09/2026, quando o
  // reload sozinho nao resolveu nada. Ver o comentario em public/sw.js.
  const limpar = ('caches' in window)
    ? caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).catch(() => {})
    : Promise.resolve();
  limpar.finally(() => window.location.reload());
});

// Pega a versao nova sem o usuario ter que fechar e abrir o app.
// So recarrega ao voltar pro app depois de um tempo fora, e nunca nas
// telas abaixo, onde recarregar apagaria o que a pessoa esta fazendo.
iniciarAutoAtualizacao({ rotasSensiveis: ['configuracoes', 'banners', 'cupons', 'recompensas', 'clube', 'social', 'admins', 'administradores', 'perfil'] });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfirmProvider>
      <App />
    </ConfirmProvider>
  </StrictMode>,
)
