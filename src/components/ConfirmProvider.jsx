import React, { createContext, useCallback, useContext, useState } from 'react';

// Confirmação bonita e reutilizável, baseada em promise — substitui o
// window.confirm() nativo.
// Uso: const confirm = useConfirm(); if (await confirm({ title, message, danger })) { ... }
const ConfirmContext = createContext(() => Promise.resolve(false));

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => setState({ ...opts, resolve }));
  }, []);

  const close = (result) => {
    setState((s) => {
      if (s) s.resolve(result);
      return null;
    });
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1">{state.title || 'Confirmar'}</h3>
            {state.message && <p className="text-sm text-gray-600 mb-5">{state.message}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {state.cancelText || 'Cancelar'}
              </button>
              <button
                onClick={() => close(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                  state.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {state.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
