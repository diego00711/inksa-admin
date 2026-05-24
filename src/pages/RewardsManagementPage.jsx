import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Gift, X, Loader2, RefreshCw, Plus, Edit2, Trash2,
  CheckCircle, Package, Upload,
} from 'lucide-react';
import { NotificationContext } from '../context/NotificationContext';
import authService from '../services/authService';
import { API_BASE_URL } from '../services/api';

const REWARD_TYPES = [
  { value: 'gift',         label: 'Brinde físico' },
  { value: 'discount_pct', label: 'Desconto em %' },
  { value: 'free_delivery',label: 'Frete grátis' },
  { value: 'credit',       label: 'Crédito na conta' },
];

const AUDIENCE_OPTIONS = [
  { value: 'client',     label: 'Clientes' },
  { value: 'delivery',   label: 'Entregadores' },
  { value: 'restaurant', label: 'Restaurantes' },
];

const EMPTY_FORM = {
  name: '', description: '', points_required: '',
  reward_type: 'gift', benefit_value: '',
  target_audience: ['client'],
  stock: '', valid_until: '', icon: '🎁', is_active: true, image_url: '',
};

function typeLabel(v) { return REWARD_TYPES.find(t => t.value === v)?.label ?? v; }
function audienceLabel(arr) {
  if (!arr?.length) return '—';
  if (arr.length === 3) return 'Todos';
  return arr.map(a => AUDIENCE_OPTIONS.find(o => o.value === a)?.label ?? a).join(', ');
}

export default function RewardsManagementPage() {
  const { notify } = useContext(NotificationContext);
  const [activeTab, setActiveTab] = useState('rewards');

  const [rewards, setRewards]         = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [filterAudience, setFilterAudience] = useState('');
  const [filterStatus, setFilterStatus]     = useState('');

  const [summary, setSummary] = useState({ active_rewards: 0, redemptions_this_month: 0, top_reward: null });

  const [redemptions, setRedemptions]               = useState([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);
  const [filterRedemptionStatus, setFilterRedemptionStatus] = useState('');

  const [showModal, setShowModal]         = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [formData, setFormData]           = useState(EMPTY_FORM);
  const [saving, setSaving]               = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [imageFile, setImageFile]             = useState(null);
  const [imagePreview, setImagePreview]       = useState('');
  const [uploadingImage, setUploadingImage]   = useState(false);

  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${authService.getToken()}`,
    'Content-Type': 'application/json',
  }), []);

  const loadRewards = useCallback(async () => {
    setLoadingRewards(true);
    try {
      const p = new URLSearchParams();
      if (filterAudience) p.set('audience', filterAudience);
      if (filterStatus)   p.set('status', filterStatus);
      const res = await fetch(`${API_BASE_URL}/api/gamification/rewards?${p}`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRewards(json.data?.items ?? []);
    } catch {
      notify('Erro ao carregar recompensas', 'error');
      setRewards([]);
    } finally {
      setLoadingRewards(false);
    }
  }, [filterAudience, filterStatus, getHeaders, notify]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/gamification/rewards/summary`, { headers: getHeaders() });
      if (!res.ok) return;
      const json = await res.json();
      setSummary(json.data ?? {});
    } catch { /* non-critical */ }
  }, [getHeaders]);

  const loadRedemptions = useCallback(async () => {
    setLoadingRedemptions(true);
    try {
      const p = new URLSearchParams();
      if (filterRedemptionStatus) p.set('status', filterRedemptionStatus);
      const res = await fetch(`${API_BASE_URL}/api/gamification/rewards/redemptions?${p}`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRedemptions(json.data?.items ?? []);
    } catch {
      notify('Erro ao carregar resgates', 'error');
      setRedemptions([]);
    } finally {
      setLoadingRedemptions(false);
    }
  }, [filterRedemptionStatus, getHeaders, notify]);

  useEffect(() => { loadRewards(); loadSummary(); }, [loadRewards, loadSummary]);
  useEffect(() => { if (activeTab === 'redemptions') loadRedemptions(); }, [activeTab, loadRedemptions]);

  function openCreate() {
    setEditingReward(null);
    setFormData(EMPTY_FORM);
    setImageFile(null);
    setImagePreview('');
    setShowModal(true);
  }
  function openEdit(r) {
    setEditingReward(r);
    setFormData({
      name: r.name ?? '', description: r.description ?? '',
      points_required: r.points_required ?? '', reward_type: r.reward_type ?? 'gift',
      benefit_value: r.benefit_value ?? '', target_audience: r.target_audience ?? ['client'],
      stock: r.stock ?? '', valid_until: r.valid_until ? r.valid_until.split('T')[0] : '',
      icon: r.icon ?? '🎁', is_active: r.is_active ?? true, image_url: r.image_url ?? '',
    });
    setImageFile(null);
    setImagePreview('');
    setShowModal(true);
  }

  function handleImageChange(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      notify('Formato inválido. Use JPG, PNG ou WebP', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notify('Imagem muito grande. Máximo 2 MB', 'error');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function toggleAudience(val) {
    setFormData(p => ({
      ...p,
      target_audience: p.target_audience.includes(val)
        ? p.target_audience.filter(a => a !== val)
        : [...p.target_audience, val],
    }));
  }

  async function handleSave() {
    if (!formData.name.trim()) { notify('Nome é obrigatório', 'error'); return; }
    if (!formData.points_required || parseInt(formData.points_required) <= 0) {
      notify('Pontos necessários inválidos', 'error'); return;
    }
    if (!formData.target_audience.length) { notify('Selecione pelo menos um público', 'error'); return; }

    setSaving(true);
    let uploadedImageUrl = formData.image_url;

    if (imageFile) {
      setUploadingImage(true);
      try {
        const fd = new FormData();
        fd.append('image', imageFile);
        const uploadRes = await fetch(`${API_BASE_URL}/api/gamification/rewards/upload-image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authService.getToken()}` },
          body: fd,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error(err.message || 'Erro no upload da imagem');
        }
        const uploadData = await uploadRes.json();
        uploadedImageUrl = uploadData.data?.url ?? uploadData.url ?? '';
      } catch (e) {
        notify(`Erro ao enviar imagem: ${e.message}`, 'error');
        setSaving(false);
        setUploadingImage(false);
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    const body = {
      ...formData,
      image_url:       uploadedImageUrl,
      points_required: parseInt(formData.points_required),
      benefit_value:   formData.benefit_value !== '' ? parseFloat(formData.benefit_value) : null,
      stock:           formData.stock !== '' ? parseInt(formData.stock) : null,
      valid_until:     formData.valid_until || null,
    };
    try {
      const url = editingReward
        ? `${API_BASE_URL}/api/gamification/rewards/${editingReward.id}`
        : `${API_BASE_URL}/api/gamification/rewards`;
      const res = await fetch(url, {
        method: editingReward ? 'PUT' : 'POST',
        headers: getHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      notify(editingReward ? 'Recompensa atualizada!' : 'Recompensa criada!', 'success');
      setShowModal(false);
      loadRewards(); loadSummary();
    } catch (e) {
      notify(`Erro: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(reward) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/gamification/rewards/${reward.id}`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ is_active: !reward.is_active }),
      });
      if (!res.ok) throw new Error();
      notify(reward.is_active ? 'Recompensa desativada' : 'Recompensa ativada', 'success');
      loadRewards(); loadSummary();
    } catch { notify('Erro ao alterar status', 'error'); }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/gamification/rewards/${id}`, {
        method: 'DELETE', headers: getHeaders(),
      });
      if (!res.ok) throw new Error();
      notify('Recompensa excluída', 'success');
      setConfirmDeleteId(null);
      loadRewards(); loadSummary();
    } catch { notify('Erro ao excluir recompensa', 'error'); }
  }

  async function handleMarkDelivered(redemptionId) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/gamification/rewards/redemptions/${redemptionId}/deliver`,
        { method: 'PATCH', headers: getHeaders() },
      );
      if (!res.ok) throw new Error();
      notify('Marcado como entregue', 'success');
      loadRedemptions();
    } catch { notify('Erro ao marcar como entregue', 'error'); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recompensas</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie as recompensas do programa de fidelidade</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Nova Recompensa
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Recompensas ativas', value: summary.active_rewards ?? 0,          icon: Gift,        bg: 'bg-green-100',  ic: 'text-green-600' },
          { label: 'Resgates este mês',  value: summary.redemptions_this_month ?? 0,  icon: Package,     bg: 'bg-blue-100',   ic: 'text-blue-600' },
          { label: 'Mais resgatada',     value: summary.top_reward ? `${summary.top_reward.name} (${summary.top_reward.count}×)` : '—',
                                                                                       icon: CheckCircle, bg: 'bg-purple-100', ic: 'text-purple-600', small: true },
        ].map(({ label, value, icon: Icon, bg, ic, small }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
                <Icon className={`h-5 w-5 ${ic}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`${small ? 'text-sm font-semibold truncate' : 'text-2xl font-bold'} text-gray-900`}>{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          {[{ id: 'rewards', label: 'Recompensas' }, { id: 'redemptions', label: 'Resgates' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >{tab.label}</button>
          ))}
        </nav>
      </div>

      {/* ── REWARDS TAB ── */}
      {activeTab === 'rewards' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
            <select value={filterAudience} onChange={e => setFilterAudience(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todos os públicos</option>
              {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
            <button onClick={loadRewards} className="p-1.5 text-gray-500 hover:text-gray-700 transition">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loadingRewards ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Gift className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma recompensa encontrada.</p>
              <button onClick={openCreate} className="mt-3 text-indigo-600 text-sm hover:underline">
                Criar primeira recompensa
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Recompensa</th>
                    <th className="px-4 py-3">Pontos</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Público</th>
                    <th className="px-4 py-3">Estoque</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rewards.map((reward, i) => (
                    <tr key={reward.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {reward.image_url ? (
                            <img src={reward.image_url} alt={reward.name}
                              className="w-8 h-8 object-cover rounded shrink-0" />
                          ) : (
                            <span className="text-xl shrink-0">{reward.icon || '🎁'}</span>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{reward.name}</p>
                            {reward.description && (
                              <p className="text-xs text-gray-500 truncate max-w-[200px]">{reward.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-indigo-600">
                        {reward.points_required?.toLocaleString('pt-BR')} pts
                      </td>
                      <td className="px-4 py-3 text-gray-600">{typeLabel(reward.reward_type)}</td>
                      <td className="px-4 py-3 text-gray-600">{audienceLabel(reward.target_audience)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {reward.stock == null
                          ? <span className="text-xs text-green-600 font-medium">Ilimitado</span>
                          : reward.stock}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          reward.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {reward.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(reward)} title="Editar"
                            className="p-1.5 text-gray-400 hover:text-indigo-600 transition rounded">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleToggleActive(reward)}
                            title={reward.is_active ? 'Desativar' : 'Ativar'}
                            className={`p-1.5 transition rounded ${
                              reward.is_active ? 'text-gray-400 hover:text-yellow-600' : 'text-gray-400 hover:text-green-600'
                            }`}>
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button onClick={() => setConfirmDeleteId(reward.id)} title="Excluir"
                            className="p-1.5 text-gray-400 hover:text-red-600 transition rounded">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── REDEMPTIONS TAB ── */}
      {activeTab === 'redemptions' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
            <select value={filterRedemptionStatus} onChange={e => setFilterRedemptionStatus(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="delivered">Entregue</option>
            </select>
            <button onClick={loadRedemptions} className="p-1.5 text-gray-500 hover:text-gray-700 transition">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loadingRedemptions ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : redemptions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum resgate encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Recompensa</th>
                    <th className="px-4 py-3">Pontos</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {redemptions.map((r, i) => (
                    <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{r.user_name || 'Usuário'}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.user_id?.slice(0, 8)}…</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.user_type === 'client'     ? 'bg-blue-100 text-blue-700'   :
                          r.user_type === 'delivery'   ? 'bg-orange-100 text-orange-700' :
                                                         'bg-purple-100 text-purple-700'
                        }`}>
                          {AUDIENCE_OPTIONS.find(o => o.value === r.user_type)?.label ?? r.user_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span>{r.icon || '🎁'}</span>
                          <span className="text-gray-900">{r.reward_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-indigo-600">
                        {r.points_used?.toLocaleString('pt-BR')} pts
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {r.status === 'delivered' ? 'Entregue' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === 'pending' && (
                          <button onClick={() => handleMarkDelivered(r.id)}
                            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition">
                            Marcar entregue
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingReward ? 'Editar Recompensa' : 'Nova Recompensa'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Nome */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nome da recompensa *</label>
                  <input type="text" value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Camiseta Inksa"
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                {/* Descrição */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea rows={2} value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Descrição da recompensa..."
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>

                {/* Pontos */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Pontos necessários *</label>
                  <input type="number" min="1" value={formData.points_required}
                    onChange={e => setFormData(p => ({ ...p, points_required: e.target.value }))}
                    placeholder="500"
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                {/* Imagem */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Imagem da recompensa</label>
                  {(imagePreview || formData.image_url) ? (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview || formData.image_url}
                        alt="Preview"
                        className="w-[200px] h-[200px] object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(''); setFormData(p => ({ ...p, image_url: '' })); }}
                        className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow hover:bg-red-50 transition"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition">
                      <Upload className="h-6 w-6 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Arrastar ou <span className="text-indigo-600">escolher foto</span></span>
                      <span className="text-[10px] text-gray-400 mt-0.5">JPG, PNG ou WebP — máx. 2MB</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                        onChange={e => handleImageChange(e.target.files?.[0])} />
                    </label>
                  )}
                </div>

                {/* Ícone emoji (fallback) */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ícone emoji (fallback)</label>
                  <input type="text" value={formData.icon}
                    onChange={e => setFormData(p => ({ ...p, icon: e.target.value }))}
                    placeholder="🎁"
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={formData.reward_type}
                    onChange={e => setFormData(p => ({ ...p, reward_type: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {REWARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {/* Valor do benefício */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Valor do benefício</label>
                  <input type="number" min="0" step="0.01" value={formData.benefit_value}
                    onChange={e => setFormData(p => ({ ...p, benefit_value: e.target.value }))}
                    placeholder="Ex: 10 (% ou R$)"
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                {/* Estoque */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Estoque (vazio = ilimitado)</label>
                  <input type="number" min="0" value={formData.stock}
                    onChange={e => setFormData(p => ({ ...p, stock: e.target.value }))}
                    placeholder="Ilimitado"
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                {/* Validade */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Validade</label>
                  <input type="date" value={formData.valid_until}
                    onChange={e => setFormData(p => ({ ...p, valid_until: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                {/* Público */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Público</label>
                  <div className="flex flex-wrap gap-4">
                    {AUDIENCE_OPTIONS.map(o => (
                      <label key={o.value} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                        <input type="checkbox"
                          checked={formData.target_audience.includes(o.value)}
                          onChange={() => toggleAudience(o.value)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Toggle ativo */}
                <div className="col-span-2 flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer"
                      checked={formData.is_active}
                      onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} />
                    <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </label>
                  <span className="text-sm text-gray-700">Recompensa ativa</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || uploadingImage}
                className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {(saving || uploadingImage) && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploadingImage ? 'Enviando imagem…' : editingReward ? 'Salvar alterações' : 'Criar recompensa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <Trash2 className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Excluir recompensa?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
