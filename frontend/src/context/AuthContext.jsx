import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('abierto_token'));
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem('abierto_token');
    return t ? decodeToken(t) : null;
  });

  const login = (newToken) => {
    localStorage.setItem('abierto_token', newToken);
    setToken(newToken);
    setUser(decodeToken(newToken));
  };

  const logout = () => {
    localStorage.removeItem('abierto_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
