import React, { useState, useEffect } from 'react';
import { Phone, DollarSign, Globe, Save, CheckCircle, AlertCircle, Loader2, Truck, Bike, Calculator } from 'lucide-react';
import authService from '../services/authService';

// Frete que o cliente paga (modelo 'platform'): taxa fixa + por km acima do limite grátis.
function calcFreteCobrado(f, km) {
  const fixed = parseFloat(f.fixed_delivery_fee) || 0;
  const perKm = parseFloat(f.per_km_delivery_fee) || 0;
  const free = parseFloat(f.free_delivery_threshold_km) || 0;
  return km > free ? fixed + (km - free) * perKm : fixed;
}
// Repasse pago ao entregador: base + por km rodado. Independente do frete cobrado.
function calcRepasseEntregador(f, km) {
  const base = parseFloat(f.delivery_base_fee) || 0;
  const perKm = parseFloat(f.delivery_per_km_fee) || 0;
  return base + perKm * km;
}

const DEFAULTS = {
  contact_email: '',
  contact_whatsapp: '',
  contact_phone: '',
  support_hours: 'Seg a Sex, 8h às 18h',
  financial_platform_commission: '10',
  financial_delivery_commission: '8',
  financial_min_order_value: '15',
  platform_name: 'Inksa Delivery',
  platform_max_delivery_radius: '15',
  platform_maintenance_mode: 'false',
  // Taxas de entrega cobradas do cliente
  commission_rate: '10',
  fixed_delivery_fee: '3.00',
  per_km_delivery_fee: '1.50',
  free_delivery_threshold_km: '2.00',
  // Repasse pago ao entregador (modelo: base + por km)
  delivery_base_fee: '5.00',
  delivery_per_km_fee: '1.00',
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
  'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base sm:text-sm';

export default function SettingsPage() {
  const [fields, setFields] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [previewKm, setPreviewKm] = useState('4');

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Configurações</h1>
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
              placeholder="(49) 99999-9999"
              className={inputCls}
            />
          </Field>
          <Field label="Horário de atendimento">
            <input
              type="text"
              value={fields.support_hours}
              onChange={(e) => set('support_hours', e.target.value)}
              placeholder="Seg a Sex, 8h às 18h"
              className={inputCls}
            />
          </Field>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          💡 Esses dados aparecem no botão de Suporte nos 3 apps (Cliente, Restaurante, Entregador). Mudou aqui, muda lá em até 1 hora.
        </p>
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

      {/* Taxas de Entrega (cobradas do cliente) */}
      <SectionCard icon={Truck} title="Taxas de Entrega (cobradas do cliente)">
        <p className="text-xs text-gray-500 mb-4">
          Valores usados no cálculo do frete que o cliente paga no checkout.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Comissão da plataforma (%)" hint="Percentual cobrado do restaurante sobre o valor do pedido">
            <input
              type="number" min="0" max="99.99" step="0.1"
              value={fields.commission_rate}
              onChange={(e) => set('commission_rate', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Taxa fixa de entrega (R$)" hint="Valor base cobrado em toda entrega">
            <input
              type="number" min="0" step="0.01"
              value={fields.fixed_delivery_fee}
              onChange={(e) => set('fixed_delivery_fee', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Valor por km extra (R$)" hint="Adicional cobrado por km acima do limite grátis">
            <input
              type="number" min="0" step="0.01"
              value={fields.per_km_delivery_fee}
              onChange={(e) => set('per_km_delivery_fee', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Distância grátis (km)" hint="Até essa distância, cobra só a taxa fixa">
            <input
              type="number" min="0" step="0.1"
              value={fields.free_delivery_threshold_km}
              onChange={(e) => set('free_delivery_threshold_km', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </SectionCard>

      {/* Repasse ao Entregador */}
      <SectionCard icon={Bike} title="Repasse ao Entregador">
        <p className="text-xs text-gray-500 mb-4">
          Modelo: <strong>repasse = valor fixo por entrega + valor por km × distância</strong>.
          Independente do que o cliente paga.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Valor fixo por entrega (R$)" hint="Pago em toda entrega, independente da distância">
            <input
              type="number" min="0" step="0.01"
              value={fields.delivery_base_fee}
              onChange={(e) => set('delivery_base_fee', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Valor por km rodado (R$)" hint="Adicional por cada km da entrega">
            <input
              type="number" min="0" step="0.01"
              value={fields.delivery_per_km_fee}
              onChange={(e) => set('delivery_per_km_fee', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-100 text-xs text-blue-800">
          <strong>Exemplo:</strong> base R$ {fields.delivery_base_fee || '0'} + km R$ {fields.delivery_per_km_fee || '0'}
          {' '}→ entrega de 4 km paga R${' '}
          {(
            (parseFloat(fields.delivery_base_fee) || 0) +
            (parseFloat(fields.delivery_per_km_fee) || 0) * 4
          ).toFixed(2)}.
        </div>
      </SectionCard>

      {/* Margem da Plataforma no Frete (simulador) */}
      <SectionCard icon={Calculator} title="Margem da Plataforma no Frete">
        <p className="text-xs text-gray-500 mb-4">
          A margem é o que a Inksa <strong>retém do frete</strong> (frete cobrado do cliente − repasse ao entregador).
          Ela varia com a distância. Simule abaixo o impacto da configuração atual antes de salvar.
        </p>
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Distância (km)</label>
          <input
            type="number" min="0" step="0.5"
            value={previewKm}
            onChange={(e) => setPreviewKm(e.target.value)}
            className="w-28 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
          />
        </div>
        {(() => {
          const km = parseFloat(previewKm) || 0;
          const cobrado = calcFreteCobrado(fields, km);
          const repasse = calcRepasseEntregador(fields, km);
          const margem = cobrado - repasse;
          const negativa = margem < 0;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-md bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500">Frete cobrado do cliente</p>
                <p className="text-lg font-semibold text-gray-900">R$ {cobrado.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-md bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500">Repasse ao entregador</p>
                <p className="text-lg font-semibold text-gray-900">R$ {repasse.toFixed(2)}</p>
              </div>
              <div className={`p-3 rounded-md border ${negativa ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <p className={`text-xs ${negativa ? 'text-red-600' : 'text-green-700'}`}>Margem da plataforma</p>
                <p className={`text-lg font-bold ${negativa ? 'text-red-700' : 'text-green-700'}`}>R$ {margem.toFixed(2)}</p>
              </div>
            </div>
          );
        })()}
        {(() => {
          const km = parseFloat(previewKm) || 0;
          const margem = calcFreteCobrado(fields, km) - calcRepasseEntregador(fields, km);
          if (margem < 0) {
            return (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                Nesta distância a plataforma <strong>subsidia</strong> o frete (paga mais ao entregador do que cobra do cliente).
                Revise as taxas se não for intencional.
              </div>
            );
          }
          return null;
        })()}
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
