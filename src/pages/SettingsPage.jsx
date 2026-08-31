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
// % de administração retida pela plataforma sobre o frete (campo editável no
// admin, key financial_delivery_commission). Guardada como percentual humano
// (ex.: 15 = 15%). Limitada a 0..100.
function adminRate(f) {
  const pct = parseFloat(f.financial_delivery_commission);
  if (!isFinite(pct)) return 0;
  return Math.min(Math.max(pct, 0), 100) / 100;
}
// Repasse ao entregador = frete integral menos a % de administração.
// Nunca gera margem negativa (a margem é sempre uma fração positiva do frete).
function calcRepasseEntregador(f, km) {
  return calcFreteCobrado(f, km) * (1 - adminRate(f));
}

const DEFAULTS = {
  contact_email: '',
  contact_whatsapp: '',
  contact_phone: '',
  support_hours: 'Seg a Sex, 8h às 18h',
  financial_platform_commission: '10',
  financial_min_order_value: '15',
  platform_name: 'Inksa Delivery',
  platform_max_delivery_radius: '15',
  delivery_radius_bike_km: '2',
  delivery_radius_moto_km: '8',
  delivery_radius_carro_km: '10',
  // Distancia maxima da ENTREGA (loja -> cliente). Diferente do raio acima,
  // que mede entregador -> loja. 0 = sem limite.
  entrega_max_km_bike: '5',
  entrega_max_km_moto: '0',
  entrega_max_km_carro: '0',
  entrega_max_km_utilitario: '0',
  dispatch_assign_enabled: '1',
  dispatch_offer_seconds: '30',
  dispatch_decline_cooldown_min: '15',
  // Pesos da escolha do entregador (proporção, não precisa somar 100).
  dispatch_weight_distance: '50',
  dispatch_weight_idle: '20',
  dispatch_weight_rating: '15',
  dispatch_weight_balance: '15',
  dispatch_idle_target_minutes: '60',
  dispatch_daily_target: '10',
  dispatch_default_rating: '4',
  coupon_max_discount_pct: '30',
  idle_logout_minutes: '60',
  platform_maintenance_mode: 'false',
  // Taxas de entrega cobradas do cliente
  commission_rate: '10',
  fixed_delivery_fee: '3.00',
  per_km_delivery_fee: '1.50',
  frete_adicional_carro: '8.00',
  frete_km_carro: '2.50',
  frete_adicional_utilitario: '25.00',
  frete_km_utilitario: '3.50',
  free_delivery_threshold_km: '2.00',
  road_distance_factor: '1.40',
  // Repasse ao entregador: recebe o frete integral menos esta % de administração.
  // (key financial_delivery_commission, percentual humano — 15 = 15%)
  financial_delivery_commission: '15',
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
          💡 Esses dados aparecem no botão de Suporte nos 3 apps (Cliente, Parceiro, Entregador). Mudou aqui, muda lá em até 1 hora.
        </p>
      </SectionCard>

      {/* Financeiro */}
      <SectionCard icon={DollarSign} title="Financeiro">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Comissão da plataforma (%)" hint="Percentual cobrado do parceiro sobre o valor de cada pedido. É a comissão que o sistema aplica de fato.">
            <input
              type="number" min="0" max="99.99" step="0.1"
              value={fields.commission_rate}
              onChange={(e) => set('commission_rate', e.target.value)}
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
          {/* O sistema mede a distância em LINHA RETA (a que um pássaro voa).
              Ninguém entrega assim: contorna quarteirão, respeita mão única,
              atravessa em ponte. Sem este fator, TODO frete sai barato.
              Medido na rua em 29/08/2026: 1,00 km reto = mais de 1,5 km de
              percurso. 1,4 é o número que a logística urbana usa. */}
          <Field
            label="Fator de rua"
            hint="Multiplica a distância em linha reta pra chegar no percurso real. 1,4 é o padrão; meça uma entrega e ajuste."
          >
            <input
              type="number" min="1" max="3" step="0.05"
              value={fields.road_distance_factor}
              onChange={(e) => set('road_distance_factor', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </SectionCard>

      {/* Frete por carga */}
      <SectionCard icon={Truck} title="Frete por carga (carro e utilitário)">
        <p className="text-xs text-gray-500 mb-4">
          Cobra-se pelo que o <strong>pedido exige</strong>, não pelo veículo de quem aceita —
          o frete é mostrado no checkout, antes de existir entregador. O peso do pedido
          define a classe: acima de <strong>20&nbsp;kg</strong> exige carro, acima de{' '}
          <strong>80&nbsp;kg</strong> exige utilitário. Bike e moto usam os valores da seção
          acima, sem adicional.
        </p>
        <p className="text-xs text-gray-500 mb-4">
          O <strong>fixo</strong> paga o trabalho de carregar (60&nbsp;kg de ração são 10–15&nbsp;min
          a mais, iguais a 1&nbsp;km ou a 10). O <strong>por km</strong> substitui o valor normal e
          paga o custo de rodar: carro faz ~10&nbsp;km/L contra ~35&nbsp;km/L da moto.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Carro — adicional fixo (R$)" hint="Somado à taxa fixa quando o pedido exige carro">
            <input
              type="number" min="0" step="0.01"
              value={fields.frete_adicional_carro}
              onChange={(e) => set('frete_adicional_carro', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Carro — por km (R$)" hint="Substitui o valor por km normal">
            <input
              type="number" min="0" step="0.01"
              value={fields.frete_km_carro}
              onChange={(e) => set('frete_km_carro', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Utilitário — adicional fixo (R$)" hint="Pedidos acima de 80 kg">
            <input
              type="number" min="0" step="0.01"
              value={fields.frete_adicional_utilitario}
              onChange={(e) => set('frete_adicional_utilitario', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Utilitário — por km (R$)" hint="Substitui o valor por km normal">
            <input
              type="number" min="0" step="0.01"
              value={fields.frete_km_utilitario}
              onChange={(e) => set('frete_km_utilitario', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </SectionCard>

      {/* Repasse ao Entregador */}
      <SectionCard icon={Bike} title="Repasse ao Entregador">
        <p className="text-xs text-gray-500 mb-4">
          Modelo: <strong>o entregador recebe o frete integral menos a taxa de administração</strong> abaixo.
          A margem da plataforma é sempre essa % do frete — nunca fica negativa, em qualquer distância.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Taxa de administração sobre o frete (%)"
            hint="Percentual do frete que a plataforma retém. O restante vai integral para o entregador."
          >
            <input
              type="number" min="0" max="100" step="0.1"
              value={fields.financial_delivery_commission}
              onChange={(e) => set('financial_delivery_commission', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-100 text-xs text-blue-800">
          <strong>Exemplo:</strong> administração de {fields.financial_delivery_commission || '0'}%
          {' '}→ num frete de R$ 12,50, o entregador recebe R$ {(12.5 * (1 - adminRate(fields))).toFixed(2)}
          {' '}e a plataforma retém R$ {(12.5 * adminRate(fields)).toFixed(2)}.
        </div>
      </SectionCard>

      {/* Margem da Plataforma no Frete (simulador) */}
      <SectionCard icon={Calculator} title="Margem da Plataforma no Frete">
        <p className="text-xs text-gray-500 mb-4">
          A margem é o que a Inksa <strong>retém do frete</strong> (frete cobrado do cliente − repasse ao entregador).
          Ela varia com a distância. Simule abaixo o impacto da configuração atual antes de salvar.
        </p>
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Distância em linha reta (km)</label>
          <input
            type="number" min="0" step="0.5"
            value={previewKm}
            onChange={(e) => setPreviewKm(e.target.value)}
            className="w-28 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
          />
        </div>
        {(() => {
          // O simulador recebe a LINHA RETA, que é o que o sistema mede, e
          // aplica o fator antes de cobrar — igual ao servidor. Simular sobre
          // a distância de rua daria um número que nunca aparece na prática.
          const reta = parseFloat(previewKm) || 0;
          const fator = Math.max(parseFloat(fields.road_distance_factor) || 1.4, 1);
          const km = Math.round(reta * fator * 100) / 100;
          const cobrado = calcFreteCobrado(fields, km);
          const repasse = calcRepasseEntregador(fields, km);
          const margem = cobrado - repasse;
          const negativa = margem < 0;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3 text-xs text-gray-500">
                {reta.toFixed(2).replace('.', ',')} km em linha reta ={' '}
                <strong className="text-gray-700">{km.toFixed(2).replace('.', ',')} km de percurso</strong>{' '}
                (fator {fator.toFixed(2).replace('.', ',')}) — é sobre o percurso que a conta é feita.
              </div>
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
          // Mesmo fator do bloco acima. Sem isto os dois quadros mostrariam
          // margens diferentes pro mesmo cenário.
          const _reta = parseFloat(previewKm) || 0;
          const _fator = Math.max(parseFloat(fields.road_distance_factor) || 1.4, 1);
          const km = Math.round(_reta * _fator * 100) / 100;
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
          <Field
            label="Raio máximo de entrega (km)"
            hint="Separa as regiões: o cliente só vê parceiros dentro deste raio dele, e o entregador só vê pedidos cujo parceiro está dentro deste raio dele. Aumente para atender um raio maior (cidades vizinhas)."
          >
            <input
              type="number"
              min="1"
              step="1"
              value={fields.platform_max_delivery_radius}
              onChange={(e) => set('platform_max_delivery_radius', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field
            label="Raio de coleta por veículo (km)"
            hint="Distância do ENTREGADOR até a LOJA. Quem está mais longe que isso não recebe a oferta. Não limita o tamanho da entrega — para isso, use o campo abaixo. Deixe 0 para usar o raio máximo acima."
          >
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">🚲 Bike</label>
                <input type="number" min="0" step="1" value={fields.delivery_radius_bike_km}
                  onChange={(e) => set('delivery_radius_bike_km', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">🏍️ Moto</label>
                <input type="number" min="0" step="1" value={fields.delivery_radius_moto_km}
                  onChange={(e) => set('delivery_radius_moto_km', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">🚗 Carro</label>
                <input type="number" min="0" step="1" value={fields.delivery_radius_carro_km}
                  onChange={(e) => set('delivery_radius_carro_km', e.target.value)} className={inputCls} />
              </div>
            </div>
          </Field>
          <Field
            label="Distância máxima da entrega por veículo (km)"
            hint="Da LOJA até o CLIENTE. Uma bicicleta não deve pegar uma entrega de 12 km só porque estava parada na porta do restaurante — o raio de coleta acima não impede isso, porque mede outra coisa. Deixe 0 para não limitar."
          >
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">🚲 Bike</label>
                <input type="number" min="0" step="1" value={fields.entrega_max_km_bike}
                  onChange={(e) => set('entrega_max_km_bike', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">🏍️ Moto</label>
                <input type="number" min="0" step="1" value={fields.entrega_max_km_moto}
                  onChange={(e) => set('entrega_max_km_moto', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">🚗 Carro</label>
                <input type="number" min="0" step="1" value={fields.entrega_max_km_carro}
                  onChange={(e) => set('entrega_max_km_carro', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">🚐 Utilitário</label>
                <input type="number" min="0" step="1" value={fields.entrega_max_km_utilitario}
                  onChange={(e) => set('entrega_max_km_utilitario', e.target.value)} className={inputCls} />
              </div>
            </div>
          </Field>
          <Field
            label="Distribuição de pedidos"
            hint="Broadcast: todos no raio veem e o primeiro a aceitar leva. Atribuição: oferta ao entregador mais próximo com tempo; se recusar/expirar, passa pro próximo. Quem recusa fica um tempo sem receber ofertas."
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fields.dispatch_assign_enabled === '1'}
                onChange={(e) => set('dispatch_assign_enabled', e.target.checked ? '1' : '0')}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-700">Ativar modo <strong>Atribuição</strong> (oferta ao mais próximo)</span>
            </label>
            {fields.dispatch_assign_enabled === '1' && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tempo da oferta (s)</label>
                  <input type="number" min="10" step="5" value={fields.dispatch_offer_seconds}
                    onChange={(e) => set('dispatch_offer_seconds', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cooldown ao recusar (min)</label>
                  <input type="number" min="0" step="1" value={fields.dispatch_decline_cooldown_min}
                    onChange={(e) => set('dispatch_decline_cooldown_min', e.target.value)} className={inputCls} />
                </div>
              </div>
            )}

            {/* Pesos da escolha do entregador. Só ordenam quem JÁ passou nos
                filtros de raio/cooldown/cadastro — ninguém fora do raio recebe
                oferta por ter peso alto em outro fator. */}
            {fields.dispatch_assign_enabled === '1' && (
              <div className="mt-4 border-t pt-3">
                <p className="text-xs font-semibold text-gray-700 mb-1">Como escolher o entregador</p>
                <p className="text-xs text-gray-500 mb-3">
                  Peso de cada critério na escolha. Não precisa somar 100 — o que vale é a
                  proporção entre eles. Só <strong>proximidade</strong> (e o resto em 0) =
                  sempre o mais perto.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Proximidade</label>
                    <input type="number" min="0" step="5" value={fields.dispatch_weight_distance}
                      onChange={(e) => set('dispatch_weight_distance', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tempo parado</label>
                    <input type="number" min="0" step="5" value={fields.dispatch_weight_idle}
                      onChange={(e) => set('dispatch_weight_idle', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nota do entregador</label>
                    <input type="number" min="0" step="5" value={fields.dispatch_weight_rating}
                      onChange={(e) => set('dispatch_weight_rating', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Equilíbrio do dia</label>
                    <input type="number" min="0" step="5" value={fields.dispatch_weight_balance}
                      onChange={(e) => set('dispatch_weight_balance', e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Parado por (min) = nota cheia</label>
                    <input type="number" min="5" step="5" value={fields.dispatch_idle_target_minutes}
                      onChange={(e) => set('dispatch_idle_target_minutes', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Entregas/dia = fim do bônus</label>
                    <input type="number" min="1" step="1" value={fields.dispatch_daily_target}
                      onChange={(e) => set('dispatch_daily_target', e.target.value)} className={inputCls} />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Entregador ainda sem avaliação entra com nota {fields.dispatch_default_rating || '4'} —
                  senão nunca receberia pedido pra ser avaliado.
                </p>
              </div>
            )}
          </Field>
          <Field
            label="Desconto máximo do cupom do parceiro (%)"
            hint="Teto do cupom que o parceiro cria na tela Cupons dele. Esse desconto sai do repasse dele (a comissão da Inksa continua sobre o valor cheio), então o teto evita que alguém digite 90 achando que é R$ 90. Não limita os cupons criados aqui pela Inksa."
          >
            <input
              type="number" min="0" max="100" step="5"
              value={fields.coupon_max_discount_pct}
              onChange={(e) => set('coupon_max_discount_pct', e.target.value)}
              className={inputCls}
              placeholder="30"
            />
          </Field>
          <Field
            label="Logoff automático por inatividade (min)"
            hint="Parceiro e Entregador deslogam sozinhos após esse tempo sem toque/clique na tela (segurança de sessão esquecida). Use 0 para desligar. Vale a partir do próximo login/atualização do app."
          >
            <input
              type="number" min="0" step="5"
              value={fields.idle_logout_minutes}
              onChange={(e) => set('idle_logout_minutes', e.target.value)}
              className={inputCls}
              placeholder="60"
            />
          </Field>
          <div className="sm:col-span-2">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-700">Modo de manutenção</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Bloqueia acesso de clientes e parceiros à plataforma
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
