import React, { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Mail,
  Plus,
  RefreshCcw,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import adminsService from '../services/admins';

const ROLE_OPTIONS = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Acesso completo a todas as áreas e configurações.',
  },
  {
    value: 'manager',
    label: 'Gerente',
    description: 'Gerencia operações diárias e equipes internas.',
  },
  {
    value: 'support',
    label: 'Suporte',
    description: 'Visualiza dados e auxilia restaurantes e usuários.',
  },
];

const STATUS_PRESETS = {
  ativo: {
    label: 'Ativo',
    className: 'bg-green-100 text-green-800',
  },
  pendente: {
    label: 'Convite pendente',
    className: 'bg-amber-100 text-amber-800',
  },
  inativo: {
    label: 'Inativo',
    className: 'bg-gray-100 text-gray-600',
  },
};

const FALLBACK_ADMINS = [
  {
    id: 'fallback-1',
    name: 'Administrador de Exemplo',
    email: 'admin@inksa.com',
    role: 'manager',
    status: 'ativo',
    lastLogin: new Date().toISOString(),
  },
];

function normalizeAdmin(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const id = raw.id ?? raw.uuid ?? raw._id ?? raw.email ?? raw.user_id ?? null;
  const name =
    raw.name ??
    raw.full_name ??
    raw.display_name ??
    raw.first_name && raw.last_name
      ? `${raw.first_name} ${raw.last_name}`
      : raw.first_name ?? 'Administrador sem nome';

  const roleValue = (raw.role ?? raw.permission ?? raw.access_level ?? 'manager').toString();
  const normalizedRole = ROLE_OPTIONS.find(({ value }) => value === roleValue)
    ? roleValue
    : 'manager';

  const statusCandidate = (raw.status ?? raw.state ?? raw.invite_status ?? (raw.is_active ? 'active' : 'pending')).toString().toLowerCase();

  let normalizedStatus = 'pendente';
  if (['active', 'ativo', 'enabled', 'true'].includes(statusCandidate)) {
    normalizedStatus = 'ativo';
  } else if (
    ['pending', 'convite_pendente', 'invited', 'awaiting', 'false'].includes(statusCandidate)
  ) {
    normalizedStatus = 'pendente';
  } else if (['inactive', 'inativo', 'disabled', 'revoked', 'blocked'].includes(statusCandidate)) {
    normalizedStatus = 'inativo';
  }

  const email = raw.email ?? raw.login ?? '';

  const lastLogin =
    raw.last_login_at ??
    raw.last_login ??
    raw.last_access ??
    raw.updated_at ??
    raw.created_at ??
    null;

  return {
    id,
    name,
    email,
    role: normalizedRole,
    status: normalizedStatus,
    lastLogin,
    raw,
  };
}

export function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    role: ROLE_OPTIONS[1].value,
  });
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState('');

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminsService.listAdmins();
      const items = Array.isArray(response)
        ? response
        : Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response?.results)
        ? response.results
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.admins)
        ? response.admins
        : [];

      const normalized = items
        .map(normalizeAdmin)
        .filter(Boolean)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      setAdmins(normalized.length > 0 ? normalized : FALLBACK_ADMINS);
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os administradores.');
      setAdmins((prev) => (prev.length > 0 ? prev : FALLBACK_ADMINS));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formValues.name.trim()) {
      setFormError('Informe o nome completo do administrador.');
      return false;
    }

    if (!formValues.email.trim()) {
      setFormError('Informe um email corporativo válido.');
      return false;
    }

    const emailRegex = /.+@.+\..+/;
    if (!emailRegex.test(formValues.email.trim())) {
      setFormError('O email informado não é válido.');
      return false;
    }

    setFormError('');
    return true;
  };

  const handleInviteAdmin = async (event) => {
    event.preventDefault();
    setFeedback('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formValues.name.trim(),
        email: formValues.email.trim().toLowerCase(),
        role: formValues.role,
      };

      const created = await adminsService.createAdmin(payload);

      const normalized = normalizeAdmin(created?.admin ?? created);
      if (normalized) {
        setAdmins((prev) => [
          normalized,
          ...prev.filter(
            (admin) => admin.id !== normalized.id && admin.id !== FALLBACK_ADMINS[0].id
          ),
        ]);
      }

      setFeedback('Convite enviado com sucesso! O administrador receberá um email com as instruções.');
      setFormValues({ name: '', email: '', role: formValues.role });
    } catch (err) {
      console.error('Falha ao criar administrador', err);
      setFormError(err.message || 'Não foi possível enviar o convite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAdmins = useMemo(() => {
    if (!searchTerm.trim()) return admins;
    const lowered = searchTerm.trim().toLowerCase();
    return admins.filter((admin) => {
      return (
        admin.name?.toLowerCase().includes(lowered) ||
        admin.email?.toLowerCase().includes(lowered) ||
        admin.role?.toLowerCase().includes(lowered)
      );
    });
  }, [admins, searchTerm]);

  const metrics = useMemo(() => {
    const total = admins.length;
    const ativos = admins.filter((admin) => admin.status === 'ativo').length;
    const pendentes = admins.filter((admin) => admin.status === 'pendente').length;

    return [
      {
        label: 'Total de administradores',
        value: total,
        icon: ShieldCheck,
        description: 'Inclui todas as contas com acesso ao painel.',
      },
      {
        label: 'Contas ativas',
        value: ativos,
        icon: UserPlus,
        description: 'Administradores com acesso liberado atualmente.',
      },
      {
        label: 'Convites pendentes',
        value: pendentes,
        icon: Mail,
        description: 'Convites enviados aguardando aceite.',
      },
    ];
  }, [admins]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Administradores</h1>
          <p className="text-gray-500 mt-1">
            Convide novos membros da equipe e acompanhe os acessos ao painel administrativo.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAdmins}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCcw className="h-4 w-4" /> Atualizar lista
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon, description }) => (
          <div key={label} className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-gray-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
              </div>
              <div className="rounded-full bg-gray-100 p-3 text-gray-600">
                <Icon className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">{description}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Lista de administradores</h2>
              <p className="text-sm text-gray-500">
                Pesquise pelo nome, email ou função para localizar um acesso específico.
              </p>
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar administrador..."
              className="w-full md:w-64 rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex h-56 items-center justify-center text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm">Carregando administradores...</span>
              </div>
            ) : error ? (
              <div className="p-6 text-sm text-red-600">{error}</div>
            ) : filteredAdmins.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">Nenhum administrador encontrado.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th scope="col" className="px-6 py-3">Nome</th>
                    <th scope="col" className="px-6 py-3">Email</th>
                    <th scope="col" className="px-6 py-3">Função</th>
                    <th scope="col" className="px-6 py-3">Último acesso</th>
                    <th scope="col" className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredAdmins.map((admin) => {
                    const preset = STATUS_PRESETS[admin.status] ?? STATUS_PRESETS.pendente;

                    return (
                      <tr key={admin.id ?? admin.email} className="hover:bg-gray-50/80">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{admin.name || '—'}</div>
                          <div className="text-xs text-gray-500">ID: {admin.id || 'indefinido'}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{admin.email || '—'}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-700">
                            {ROLE_OPTIONS.find((option) => option.value === admin.role)?.label ?? admin.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {admin.lastLogin
                            ? new Date(admin.lastLogin).toLocaleString('pt-BR')
                            : 'Nunca acessou'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${preset.className}`}>
                            {preset.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <form onSubmit={handleInviteAdmin} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Adicionar administrador</h2>
                <p className="text-sm text-gray-500">
                  Envie um convite com permissões personalizadas e acompanhe o aceite pelo status.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome completo
                </label>
                <input
                  id="name"
                  name="name"
                  value={formValues.name}
                  onChange={handleFormChange}
                  placeholder="Ex.: Ana Souza"
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email corporativo
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formValues.email}
                  onChange={handleFormChange}
                  placeholder="ana.souza@inksa.com"
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Função
                </label>
                <select
                  id="role"
                  name="role"
                  value={formValues.role}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  {ROLE_OPTIONS.find((option) => option.value === formValues.role)?.description}
                </p>
              </div>

              {formError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{formError}</div>}
              {feedback && !formError && (
                <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{feedback}</div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando convite...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" /> Enviar convite
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Boas práticas</h3>
            <ul className="mt-4 space-y-3 text-sm text-gray-500">
              <li>
                Utilize emails corporativos para manter o controle sobre quem acessa o painel.
              </li>
              <li>
                Revise periodicamente os acessos e remova contas inativas ou sem necessidade.
              </li>
              <li>
                Atribua a função adequada para limitar permissões e proteger dados sensíveis.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminsPage;
