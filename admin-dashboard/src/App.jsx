import React, { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react'; // Apenas um ícone para o teste

// =================================================================================
// VERSÃO SIMPLIFICADA DA PÁGINA DE LOGIN (PARA TESTE)
// =================================================================================
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (email === 'admin@inksa.com' && password === 'admin123') {
        localStorage.setItem('isLoggedIn', 'true');
        onLogin(true);
      } else {
        setError('Credenciais inválidas. Tente novamente.');
      }
      setLoading(false);
    }, 1000);
  };

  return (
    // Contêiner principal para centralizar tudo
    <div className="flex min-h-full items-center justify-center bg-gray-100 p-4">
      {/* O "Card" de login */}
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
        {/* Cabeçalho do Card */}
        <div className="text-center">
          <img
            src="/logo.png"
            alt="Inksa Admin Logo"
            // Classes para controlar o tamanho da logo
            className="mx-auto h-24 w-24"
          />
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
            Inksa Admin
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Dashboard de Administrador
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
              placeholder="admin@inksa.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// =================================================================================
// COMPONENTE PRINCIPAL DA APLICAÇÃO
// =================================================================================
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={setIsLoggedIn} />;
  }

  // Dashboard simplificado para o teste
  return (
    <div className="flex min-h-full items-center justify-center bg-gray-100 p-4">
      <div className="text-center">
        <h1 className="text-2xl">Login efetuado com sucesso!</h1>
        <button
          onClick={handleLogout}
          className="mt-4 flex items-center justify-center rounded-md border border-transparent bg-slate-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-700"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );
}

export default App;
