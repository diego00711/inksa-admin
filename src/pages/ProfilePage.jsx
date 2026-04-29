import React, { useState, useEffect, useRef } from 'react';
import { Lock, Clock, CheckCircle, AlertCircle, Camera, User, Mail, Briefcase, Calendar } from 'lucide-react';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../services/api';

function getDisplayName(profile, fallbackUser) {
  return (
    profile?.name ||
    profile?.full_name ||
    profile?.display_name ||
    fallbackUser?.name ||
    fallbackUser?.full_name ||
    (profile?.email || fallbackUser?.email || '').split('@')[0] ||
    'Administrador'
  );
}

function getRole(profile, fallbackUser) {
  const raw =
    profile?.role ||
    profile?.cargo ||
    profile?.user_type ||
    fallbackUser?.role ||
    fallbackUser?.user_type ||
    'admin';
  const map = {
    admin: 'Administrador',
    super_admin: 'Super Administrador',
    superadmin: 'Super Administrador',
    manager: 'Gerente',
    support: 'Suporte',
  };
  return map[raw?.toLowerCase()] || raw;
}

export default function ProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentActions, setRecentActions] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [passwordForm, setPasswordForm] = useState({ new_password: '', confirm_password: '' });
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = authService.getToken();
        const res = await fetch(`${API_BASE_URL}/api/admin/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erro ao carregar perfil');
        const profileData = data.data || data;
        setProfile(profileData);
        if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url);

        if (profileData.recent_actions?.length > 0) {
          setRecentActions(profileData.recent_actions);
        } else {
          await fetchAdminLogs(token, profileData.email);
        }
      } catch (err) {
        setError(err.message);
        const stored = authService.getCurrentAdmin();
        if (stored) setProfile(stored);
        await fetchAdminLogs(authService.getToken(), null);
      } finally {
        setLoading(false);
      }
    };

    const fetchAdminLogs = async (token, email) => {
      if (!token) return;
      try {
        const params = new URLSearchParams({ limit: '10' });
        if (email) params.set('admin_email', email);
        const res = await fetch(`${API_BASE_URL}/api/admin/logs?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const items = data.data || data.logs || data.items || data;
        if (Array.isArray(items) && items.length > 0) {
          setRecentActions(
            items.slice(0, 10).map((log) => ({
              action: log.action || log.acao || log.event || '—',
              details: log.details || log.detalhes || log.description || '',
              timestamp: log.timestamp || log.created_at || log.date,
            }))
          );
        }
      } catch {
        // logs são opcionais
      }
    };

    fetchProfile();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMsg({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordMsg({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg(null);
    try {
      const token = authService.getToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/profile/change-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: passwordForm.new_password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao alterar senha');
      setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      setPasswordForm({ new_password: '', confirm_password: '' });
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
    setAvatarUploading(true);

    try {
      const token = authService.getToken();
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch(`${API_BASE_URL}/api/admin/profile/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        const url = data.data?.avatar_url || data.avatar_url;
        if (url) setAvatarUrl(url);
        refreshUser();
      }
    } catch {
      // preview permanece mesmo se o upload falhar
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const displayName = getDisplayName(profile, authUser);
  const role = getRole(profile, authUser);
  const email = profile?.email || authUser?.email || '—';
  const createdAt = profile?.created_at || authUser?.created_at;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>

      {error && !profile && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Cartão de identidade */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
          {/* Avatar com upload */}
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-indigo-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center ring-2 ring-indigo-200">
                <span className="text-white text-2xl font-bold">{initials || 'A'}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border-2 border-indigo-300 flex items-center justify-center shadow hover:bg-indigo-50 transition disabled:opacity-50"
              title="Alterar foto"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
            <p className="text-sm text-indigo-600 font-medium">{role}</p>
            {createdAt && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Membro desde {new Date(createdAt).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
              <p className="mt-0.5 text-sm text-gray-900">{email}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cargo</p>
              <p className="mt-0.5 text-sm text-gray-900">{role}</p>
            </div>
          </div>
          {profile?.phone && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Telefone</p>
                <p className="mt-0.5 text-sm text-gray-900">{profile.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alterar senha */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Alterar Senha
        </h3>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nova senha</label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirmar nova senha</label>
            <input
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm((p) => ({ ...p, confirm_password: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Repetir senha"
              required
            />
          </div>
          {passwordMsg && (
            <div
              className={`flex items-center gap-2 text-sm ${
                passwordMsg.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {passwordMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {passwordMsg.text}
            </div>
          )}
          <button
            type="submit"
            disabled={passwordLoading}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {passwordLoading ? 'Salvando...' : 'Alterar Senha'}
          </button>
        </form>
      </div>

      {/* Ações recentes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Ações Recentes
        </h3>
        {recentActions.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {recentActions.map((action, i) => (
              <div key={i} className="flex items-start gap-3 py-3">
                <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{action.action}</p>
                  {action.details && (
                    <p className="text-xs text-gray-500 truncate">{action.details}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-2 whitespace-nowrap">
                  {action.timestamp
                    ? new Date(action.timestamp).toLocaleString('pt-BR')
                    : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nenhuma ação registrada recentemente.</p>
        )}
      </div>
    </div>
  );
}
