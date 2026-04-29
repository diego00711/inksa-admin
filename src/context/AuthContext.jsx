// Local: src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AuthService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(() => AuthService.getCurrentAdmin());

  const checkAuth = useCallback(() => {
    setIsAuthenticated(AuthService.isAuthenticated());
    setUser(AuthService.getCurrentAdmin());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      await AuthService.login(email, password);
      setIsAuthenticated(true);
      setUser(AuthService.getCurrentAdmin());
    } catch (error) {
      setIsAuthenticated(false);
      throw error;
    }
  };

  const logout = () => {
    AuthService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const refreshUser = useCallback(() => {
    setUser(AuthService.getCurrentAdmin());
  }, []);

  const value = {
    isAuthenticated,
    isLoading,
    user,
    refreshUser,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};