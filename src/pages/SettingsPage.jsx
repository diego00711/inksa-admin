import React, { useState, useEffect } from 'react';
import { Bell, Globe, Shield, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import authService from '../services/authService';

const SETTINGS_KEY = 'inksa_admin_settings';

const defaultSettings = {
  notifications: {
    newOrders: true,
    newUsers: true,
    pendingRestaurants: true,
    lowStock: false,
  },
  platform: {
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    maintenanceMode: false,
  },
  security: {
    sessionTimeout: 60,
    requireMfa: false,
  },
};

function mergeWithDefaults(saved) {
  return {
    notifications: { ...defaultSettings.notifications, ...(saved?.notifications ?? {}) },
    platform: { ...defaultSettings.platform, ...(saved?.platform ?? {}) },
    security: { ...defaultSettings.security, ...(saved?.security ?? {}) },
  };
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? mergeWithDefaults(JSON.parse(raw)) : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
  const [apiAvailable, setApiAvailable] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await authService.getSystemSettings();
        const merged = mergeWithDefaults(data?.data ?? data ?? {});
        setSettings(merged);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
        setApiAvailable(true);
      } catch {
        setSettings(loadFromStorage());
        setApiAvailable(false);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const set = (section, key, value) =>
    setSettings((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      if (apiAvailable) {
        await authService.updateSystemSettings(settings);
      }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setSaveStatus('success');
    } catch {
      // fallback: salva apenas localmente
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setSaveStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          {!apiAvailable && (
            <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Modo offline — alterações salvas localmente
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saveStatus === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Salvando...' : saveStatus === 'success' ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      {saveStatus === 'error' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Não foi possível salvar no servidor. Configurações salvas localmente.
        </div>
      )}

      {/* Notificações */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Notificações
        </h3>
        <div className="space-y-3">
          {[
            { key: 'newOrders', label: 'Novos pedidos criados' },
            { key: 'newUsers', label: 'Novos usuários cadastrados' },
            { key: 'pendingRestaurants', label: 'Restaurantes aguardando aprovação' },
            { key: 'lowStock', label: 'Alertas de baixo estoque' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between py-1 cursor-pointer">
              <span className="text-sm text-gray-700">{label}</span>
              <input
                type="checkbox"
                checked={settings.notifications[key]}
                onChange={(e) => set('notifications', key, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Plataforma */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Plataforma
        </h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Moeda</label>
            <select
              value={settings.platform.currency}
              onChange={(e) => set('platform', 'currency', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="BRL">BRL — Real Brasileiro</option>
              <option value="USD">USD — Dólar Americano</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Fuso horário</label>
            <select
              value={settings.platform.timezone}
              onChange={(e) => set('platform', 'timezone', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="America/Sao_Paulo">São Paulo (UTC−3)</option>
              <option value="America/Manaus">Manaus (UTC−4)</option>
              <option value="America/Fortaleza">Fortaleza (UTC−3)</option>
              <option value="America/Belem">Belém (UTC−3)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-700">Modo de manutenção</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Bloqueia acesso de clientes e restaurantes à plataforma
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.platform.maintenanceMode}
                onChange={(e) => set('platform', 'maintenanceMode', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Segurança */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Segurança
        </h3>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tempo limite de sessão (minutos)
            </label>
            <input
              type="number"
              min="5"
              max="480"
              value={settings.security.sessionTimeout}
              onChange={(e) => set('security', 'sessionTimeout', Number(e.target.value))}
              className="mt-1 block w-28 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">Entre 5 e 480 minutos</p>
          </div>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-medium text-gray-700">
                Autenticação de dois fatores (MFA)
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Exige verificação adicional no login de admins
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.security.requireMfa}
              onChange={(e) => set('security', 'requireMfa', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
