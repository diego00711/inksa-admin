// src/pages/CouponsPage.jsx

import React, { useState, useEffect, useContext } from 'react';
import authService from '../services/authService';
import { API_BASE_URL } from '../services/api';
import { NotificationContext } from '../context/NotificationContext';
import { Loader2 } from 'lucide-react';

const DISCOUNT_TYPES = [
  { value: 'percentage', label: '% Percentual' },
  { value: 'fixed', label: 'R$ Fixo' },
  { value: 'free_delivery', label: 'Frete Grátis' },
];

const getInitialFormData = () => ({
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_value: '',
  max_uses: '',
  valid_until: '',
});

const CouponsPage = () => {
  const { notify } = useContext(NotificationContext);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [formData, setFormData] = useState(getInitialFormData());

  const API_URL = API_BASE_URL;

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      setError('');
      const token = authService.getToken();

      const response = await fetch(`${API_URL}/api/coupons/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

      const data = await response.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.coupons)
        ? data.coupons
        : [];
      setCoupons(list);
    } catch (err) {
      console.error('Erro ao carregar cupons:', err);
      setError('Erro ao carregar cupons: ' + err.message);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      setError('O código do cupom é obrigatório');
      return;
    }
    if (formData.discount_type !== 'free_delivery' && !formData.discount_value) {
      setError('O valor do desconto é obrigatório');
      return;
    }
    if (!formData.valid_until) {
      setError('A data de validade é obrigatória');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const token = authService.getToken();

      const payload = {
        code: formData.code.toUpperCase().trim(),
        discount_type: formData.discount_type,
        discount_value:
          formData.discount_type === 'free_delivery'
            ? 0
            : parseFloat(formData.discount_value) || 0,
        min_order_value: formData.min_order_value
          ? parseFloat(formData.min_order_value)
          : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses, 10) : null,
        valid_until: formData.valid_until,
      };

      const response = await fetch(`${API_URL}/api/coupons/admin`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Erro HTTP: ${response.status}`);
      }

      notify('Cupom criado com sucesso!', 'success');
      await loadCoupons();
      resetForm();
    } catch (err) {
      setError('Erro ao criar cupom: ' + err.message);
      notify('Erro ao criar cupom: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (coupon) => {
    try {
      setError('');
      const token = authService.getToken();

      const response = await fetch(`${API_URL}/api/coupons/admin/${coupon.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Erro HTTP: ${response.status}`);
      }

      notify(
        `Cupom ${coupon.is_active ? 'desativado' : 'ativado'} com sucesso!`,
        'success',
      );
      await loadCoupons();
    } catch (err) {
      setError('Erro ao alterar status: ' + err.message);
      notify('Erro ao alterar status: ' + err.message, 'error');
    }
  };

  const handleDelete = async (coupon) => {
    setConfirmDeleteId(null);
    try {
      setError('');
      const token = authService.getToken();

      const response = await fetch(`${API_URL}/api/coupons/admin/${coupon.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Erro HTTP: ${response.status}`);
      }

      notify('Cupom removido com sucesso!', 'success');
      await loadCoupons();
    } catch (err) {
      setError('Erro ao remover cupom: ' + err.message);
      notify('Erro ao remover cupom: ' + err.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
    setShowForm(false);
    setError('');
  };

  const formatDiscountType = (type) => {
    const found = DISCOUNT_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  const formatValue = (coupon) => {
    if (coupon.discount_type === 'free_delivery') return '—';
    if (coupon.discount_type === 'percentage') return `${coupon.discount_value}%`;
    return `R$ ${parseFloat(coupon.discount_value || 0).toFixed(2)}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        <span className="ml-3 text-gray-500">Carregando cupons...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-3xl font-bold">Gerenciar Cupons</h1>
        <button
          onClick={() => {
            setFormData(getInitialFormData());
            setError('');
            setShowForm(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors min-h-[44px]"
        >
          Novo Cupom
        </button>
      </div>

      {/* Erro global */}
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6"
          role="alert"
        >
          <strong className="font-bold">Erro: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Modal de criação */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto mx-4">
            <h2 className="text-xl font-bold mb-4">Novo Cupom</h2>

            <form onSubmit={handleSubmit}>
              {/* Código */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="EX: DESCONTO10"
                  maxLength={30}
                />
              </div>

              {/* Tipo de desconto */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Tipo de Desconto <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_type: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DISCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor do desconto — oculto para frete grátis */}
              {formData.discount_type !== 'free_delivery' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Valor do Desconto{' '}
                    {formData.discount_type === 'percentage' ? '(%)' : '(R$)'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData({ ...formData, discount_value: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={
                      formData.discount_type === 'percentage' ? 'Ex: 10' : 'Ex: 15.00'
                    }
                  />
                </div>
              )}

              {/* Pedido mínimo */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Pedido Mínimo (R$){' '}
                  <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.min_order_value}
                  onChange={(e) =>
                    setFormData({ ...formData, min_order_value: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 50.00"
                />
              </div>

              {/* Máximo de usos */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Máximo de Usos{' '}
                  <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.max_uses}
                  onChange={(e) =>
                    setFormData({ ...formData, max_uses: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 100"
                />
              </div>

              {/* Válido até */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Válido Até <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) =>
                    setFormData({ ...formData, valid_until: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {submitting ? 'Criando...' : 'Criar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabela de cupons */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {coupons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum cupom encontrado.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pedido Mín.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Usos / Máx.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Válido até
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td className="px-4 py-4">
                      <span className="font-mono font-semibold text-sm text-gray-900">
                        {coupon.code}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {formatDiscountType(coupon.discount_type)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {formatValue(coupon)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {coupon.min_order_value
                        ? `R$ ${parseFloat(coupon.min_order_value).toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {coupon.use_count ?? 0}
                      {coupon.max_uses ? ` / ${coupon.max_uses}` : ' / ∞'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {formatDate(coupon.valid_until)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          coupon.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {coupon.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleStatus(coupon)}
                          className={`min-h-[44px] inline-flex items-center ${
                            coupon.is_active
                              ? 'text-yellow-600 hover:text-yellow-900'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {coupon.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                        {confirmDeleteId === coupon.id ? (
                          <span className="flex items-center gap-1 text-xs">
                            <span className="text-gray-600">Confirmar?</span>
                            <button
                              onClick={() => handleDelete(coupon)}
                              className="text-red-600 font-semibold hover:underline min-h-[44px] inline-flex items-center"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-gray-400 hover:underline min-h-[44px] inline-flex items-center"
                            >
                              Não
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(coupon.id)}
                            className="text-red-600 hover:text-red-900 min-h-[44px] inline-flex items-center"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CouponsPage;
