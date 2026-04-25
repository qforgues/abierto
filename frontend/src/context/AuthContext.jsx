import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const refreshAuth = async () => {
    try {
      const data = await api.get('/auth/me');
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await api.get('/auth/me');
        if (active) setUser(data.user || null);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const login = (sessionUser) => {
    setUser(sessionUser || null);
    setReady(true);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setReady(true);
    }
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
