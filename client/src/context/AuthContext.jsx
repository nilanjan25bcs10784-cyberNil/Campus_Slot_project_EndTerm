import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth.js';
import { subscribeColdStart } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('campusslot_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('campusslot_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [isColdStarting, setIsColdStarting] = useState(false);

  // Subscribe to Render cold start notifications (>4s API response delay)
  useEffect(() => {
    const unsubscribe = subscribeColdStart((status) => {
      setIsColdStarting(status);
    });
    return unsubscribe;
  }, []);

  // Validate existing token on mount
  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const freshUser = await authApi.getMe();
          setUser(freshUser);
          localStorage.setItem('campusslot_user', JSON.stringify(freshUser));
        } catch (err) {
          console.warn('[AuthContext] Session expired or invalid');
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('campusslot_token', data.token);
    localStorage.setItem('campusslot_user', JSON.stringify(data.user));
    return data.user;
  };

  const register = async (formData) => {
    const data = await authApi.register(formData);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('campusslot_token', data.token);
    localStorage.setItem('campusslot_user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('campusslot_token');
    localStorage.removeItem('campusslot_user');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isColdStarting,
        isAdmin,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
