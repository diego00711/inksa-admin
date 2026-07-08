import React, { useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { Loader2, Save, Trophy, Bike, Store, User, CheckCircle2 } from 'lucide-react';

const AUDIENCES = [
  { key: 'client',     label: 'Clientes',     icon: User,  unit: 'pedidos/mês' },
  { key: 'delivery',   label: 'Entregadores', icon: Bike,  unit: 'entregas/mês' },
  { key: 'restaurant', label: 'Restaurantes', icon: Store, unit: 'pedidos/mês' },
];

const inputCls = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

// Campos de benefício por público (chave no jsonb + rótulo + tipo)
const BENEFIT_FIELDS = {
  client: [
    { key: 'free_delivery_always', label: 'Frete grátis em todos os pedidos', type: 'bool' },
    { key: 'free_delivery_from_nth', label: 'Frete grátis a partir do Nº pedido do mês', type: 'int', placeholder: 'ex: 5' },
    { key: 'subtotal_discount_pct', label: '% de desconto no subtotal', type: 'num', placeholder: 'ex: 10' },
  ],
  delivery: [
    { key: 'per_delivery_bonus', label: 'Bônus por entrega (R$)', type: 'num', placeholder: 'ex: 0.50' },
    { key: 'freight_keep_extra_pct', label: 'Fica com +% do frete (reduz taxa de administração)', type: 'num', placeholder: 'ex: 5' },
    { key: 'priority', label: 'Prioridade na fila de pedidos', type: 'bool' },
  ],
  restaurant: [
    { key: 'featured_listing', label: 'Destaque na listagem para os clientes', type: 'bool' },
  ],
};

function LevelCard({ level, unit, benefitFields, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: level.name || '',
    emoji: level.emoji || '🏅',
    min_activity: level.min_activity ?? 0,
    is_active: level.is_active ?? true,
    benefits: { ...(level.benefits || {}) },
    extra: ((level.benefits || {}).extra || []).join(', '),
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setBenefit = (key, value) =>
    setForm((f) => ({ ...f, benefits: { ...f.benefits, [key]: value } }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const benefits = { ...form.benefits };
      // normaliza vazios
      benefitFields.forEach((bf) => {
        if (bf.type === 'bool') benefits[bf.key] = Boolean(benefits[bf.key]);
        else {
          const v = benefits[bf.key];
          benefits[bf.key] = v === '' || v === null || v === undefined ? null : Number(v);
        }
      });
      benefits.extra = form.extra.split(',').map((s) => s.trim()).filter(Boolean);
      await authService.updateClubLevel(level.id, {
        name: form.name,
        emoji: form.emoji,
        min_activity: parseInt(form.min_activity, 10) || 0,
        is_active: form.is_active,
        benefits,
      });
      setSaved(true);
      onSaved?.();
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert('Erro ao salvar: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-4">
        <input
          value={form.emoji}
          onChange={(e) => setForm({ ...form, emoji: e.target.value })}
          className="w-12 text-center text-2xl border border-gray-200 rounded-md py-1"
          maxLength={4}
        />
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="flex-1 text-lg font-bold text-gray-900 border-b border-transparent focus:border-gray-300 focus:outline-none"
        />
        <label className="flex items-center gap-2 text-xs text-gray-600 whitespace-nowrap">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          Ativo
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600">Entra neste nível a partir de ({unit})</label>
          <input
            type="number" min="0"
            value={form.min_activity}
            onChange={(e) => setForm({ ...form, min_activity: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-4 border-t pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Benefícios</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {benefitFields.map((bf) => (
            <div key={bf.key}>
              {bf.type === 'bool' ? (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(form.benefits[bf.key])}
                    onChange={(e) => setBenefit(bf.key, e.target.checked)}
                    className="h-4 w-4"
                  />
                  {bf.label}
                </label>
              ) : (
                <>
                  <label className="block text-xs font-medium text-gray-600">{bf.label}</label>
                  <input
                    type="number" min="0" step={bf.type === 'int' ? '1' : '0.01'}
                    value={form.benefits[bf.key] ?? ''}
                    placeholder={bf.placeholder}
                    onChange={(e) => setBenefit(bf.key, e.target.value)}
                    className={inputCls}
                  />
                </>
              )}
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600">Outros benefícios (texto, separados por vírgula)</label>
            <input
              value={form.extra}
              onChange={(e) => setForm({ ...form, extra: e.target.value })}
              placeholder="Ex: Cupons exclusivos, Prioridade no suporte"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

export default function ClubLevelsPage() {
  const [audience, setAudience] = useState('client');
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (aud) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.getClubLevels(aud);
      setLevels(res?.data ?? []);
    } catch (e) {
      setError(e?.message || 'Erro ao carregar níveis');
      setLevels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(audience); }, [audience, load]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" /> Clube Inksa — Níveis e Benefícios
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure os níveis e o que cada um ganha. O nível é calculado pela atividade do mês.
        </p>
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        {AUDIENCES.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              onClick={() => setAudience(a.key)}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                audience === a.key ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" /> {a.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : levels.length === 0 ? (
        <p className="text-center text-gray-400 py-12">Nenhum nível configurado para {AUDIENCES.find(a => a.key === audience)?.label}.</p>
      ) : (
        <div className="space-y-4">
          {levels.map((lvl) => (
            <LevelCard
              key={lvl.id}
              level={lvl}
              unit={AUDIENCES.find((a) => a.key === audience)?.unit}
              benefitFields={BENEFIT_FIELDS[audience] || []}
              onSaved={() => load(audience)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
