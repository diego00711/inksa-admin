import React, { useState } from 'react';

// Componente de busca global (usuários, pedidos, restaurantes)
export function GlobalSearch({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center w-full max-w-lg mx-auto">
      <input
        className="flex-1 px-4 py-2 rounded-l bg-white border border-gray-300 focus:outline-none"
        placeholder="Buscar por usuário, pedido, restaurante..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button
        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-r hover:bg-blue-700"
        type="submit"
      >
        Buscar
      </button>
    </form>
  );
}
