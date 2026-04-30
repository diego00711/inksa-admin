import React, { useState, useEffect } from 'react';
import { Phone, DollarSign, Globe, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import authService from '../services/authService';

const DEFAULTS = {
  contact_email: '',
  contact_whatsapp: '',
  contact_phone: '',
  financial_platform_commission: '10',
  financial_delivery_commission: '8',
  financial_min_order_value: '15',
  platform_name: 'Inksa Delivery',
  platform_max_delivery_radius: '15',
  platform_maintenance_mode: 'false',
};

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

const inputCls =
  'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm';

export default function SettingsPage() {
  const [fields, setFields] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    authService
      .getSystemSettings()
      .then((result) => {
        const data = result?.data ?? result ?? {};
        setFields((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key, value) => setFields((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      await authService.updateSystemSettings(fields);
      setSaveStatus('success');
    } catch {
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
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
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
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Não foi possível salvar as configurações. Tente novamente.
        </div>
      )}

      {/* Contato */}
      <SectionCard icon={Phone} title="Contato">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="E-mail de contato">
            <input
              type="email"
              value={fields.contact_email}
              onChange={(e) => set('contact_email', e.target.value)}
              placeholder="contato@inksa.com"
              className={inputCls}
            />
          </Field>
          <Field label="WhatsApp">
            <input
              type="text"
              value={fields.contact_whatsapp}
              onChange={(e) => set('contact_whatsapp', e.target.value)}
              placeholder="+55 49 99999-9999"
              className={inputCls}
            />
          </Field>
          <Field label="Telefone">
            <input
              type="text"
              value={fields.contact_phone}
              onChange={(e) => set('contact_phone', e.target.value)}
              placeholder="+55 49 3333-3333"
              className={inputCls}
            />
          </Field>
        </div>
      </SectionCard>

      {/* Financeiro */}
      <SectionCard icon={DollarSign} title="Financeiro">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Comissão da plataforma (%)" hint="Percentual cobrado sobre cada pedido">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={fields.financial_platform_commission}
              onChange={(e) => set('financial_platform_commission', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Comissão de entrega (%)" hint="Percentual retido sobre a taxa de entrega">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={fields.financial_delivery_commission}
              onChange={(e) => set('financial_delivery_commission', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Pedido mínimo (R$)" hint="Valor mínimo para aceitar um pedido">
            <input
              type="number"
              min="0"
              step="0.01"
              value={fields.financial_min_order_value}
              onChange={(e) => set('financial_min_order_value', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </SectionCard>

      {/* Plataforma */}
      <SectionCard icon={Globe} title="Plataforma">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome da plataforma">
            <input
              type="text"
              value={fields.platform_name}
              onChange={(e) => set('platform_name', e.target.value)}
              placeholder="Inksa Delivery"
              className={inputCls}
            />
          </Field>
          <Field label="Raio máximo de entrega (km)">
            <input
              type="number"
              min="1"
              step="1"
              value={fields.platform_max_delivery_radius}
              onChange={(e) => set('platform_max_delivery_radius', e.target.value)}
              className={inputCls}
            />
          </Field>
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
                checked={fields.platform_maintenance_mode === 'true'}
                onChange={(e) => set('platform_maintenance_mode', e.target.checked ? 'true' : 'false')}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
