import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConfirmProvider } from './components/ConfirmProvider.jsx'
import { iniciarAutoAtualizacao } from './utils/autoAtualiza'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}


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
