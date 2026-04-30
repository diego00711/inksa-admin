// Local: src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AuthService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(() => AuthService.getCurrentAdmin());
  const [permissions, setPermissions] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

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
    } else {
      setPermissionsLoaded(true);
    }
  }, [loadPermissions]);

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
