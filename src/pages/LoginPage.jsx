// Local: src/pages/LoginPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// NOVO: Importar o nosso hook useAuth
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  // NOVO: Obter a função de login do nosso contexto
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    console.log("Iniciando tentativa de login...");

    try {
      // ALTERADO: Usar a função 'login' do contexto em vez do AuthService diretamente
      await login(email, password);
      console.log("Login através do AuthContext bem-sucedido.");
      
      console.log("A tentar redirecionar para o dashboard...");
      navigate('/'); // Redireciona para o dashboard após o login
      console.log("Redirecionamento chamado.");

    } catch (err) {
      console.error("ERRO CAPTURADO no handleSubmit:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // O resto do seu componente JSX permanece exatamente o mesmo
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <img src="/inka-logo.png" alt="Inksa Logo" className="w-24 h-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">Painel de Admin</h1>
          <p className="mt-2 text-gray-600">Bem-vindo(a). Por favor, faça login.</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Senha</label>
            <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <div>
            <button type="submit" disabled={isLoading} className="w-full px-4 py-2 font-semibold text-white bg-gray-800 rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:bg-gray-400">
              {isLoading ? 'A entrar...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}