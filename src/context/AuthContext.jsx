// Local: src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AuthService from '../services/authService';
import { requestNotificationPermission } from '../services/notificationService';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(() => AuthService.getCurrentAdmin());
  const [permissions, setPermissions] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Hidrata nome/cargo/telefone/avatar (que vivem em admin_profiles, não no
  // objeto de login) pro sidebar mostrar o nome real em vez do prefixo do
  // e-mail. Best-effort: nunca quebra a sessão.
  const hydrateProfile = useCallback(async () => {
    try {
      const data = await AuthService.getMyProfile();
      if (!data) return;
      const patch = {};
      if (data.name) patch.name = data.name;
      if (data.cargo) patch.cargo = data.cargo;
      if (data.phone) patch.phone = data.phone;
      if (data.avatar_url) patch.avatar_url = data.avatar_url;
      if (Object.keys(patch).length) {
        const merged = AuthService.updateStoredAdmin(patch);
        if (merged) setUser(merged);
      }
    } catch {
      // hidratação de perfil é opcional
    }
  }, []);

  const loadPermissions = useCallback(async (currentUser) => {
    const userId = currentUser?.id ?? currentUser?.user_id ?? currentUser?.uuid;
    if (!userId) {
      setPermissionsLoaded(true);
      return;
    }
    try {
      const result = await AuthService.getPermissions(userId);
      const data = result?.data ?? result ?? {};
      setUserRole(data.role ?? 'admin');
      setPermissions(Array.isArray(data.pages) ? data.pages : []);
    } catch {
      setUserRole('admin');
      setPermissions([]);
    } finally {
      setPermissionsLoaded(true);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const authenticated = AuthService.isAuthenticated();
    const currentUser = AuthService.getCurrentAdmin();
    setIsAuthenticated(authenticated);
    setUser(currentUser);
    setIsLoading(false);
    if (authenticated && currentUser) {
      await loadPermissions(currentUser);
      hydrateProfile();
    } else {
      setPermissionsLoaded(true);
    }
  }, [loadPermissions, hydrateProfile]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const result = await AuthService.login(email, password);
      setIsAuthenticated(true);
      const currentUser = AuthService.getCurrentAdmin();
      setUser(currentUser);
      await loadPermissions(currentUser);
      hydrateProfile();
      // Solicita permissão de notificação push de forma defensiva — nunca quebra o login
      requestNotificationPermission().catch(() => {});
      return result;
    } catch (error) {
      setIsAuthenticated(false);
      throw error;
    }
  };

  const logout = () => {
    AuthService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setPermissions([]);
    setUserRole(null);
    setPermissionsLoaded(false);
  };

  const refreshUser = useCallback(() => {
    const currentUser = AuthService.getCurrentAdmin();
    setUser(currentUser);
  }, []);

  const hasPermission = useCallback(
    (page) => {
      if (!page) return true;
      if (userRole === 'super_admin') return true;
      return permissions.includes(page);
    },
    [userRole, permissions],
  );

  const value = {
    isAuthenticated,
    isLoading,
    user,
    refreshUser,
    login,
    logout,
    permissions,
    userRole,
    permissionsLoaded,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};
