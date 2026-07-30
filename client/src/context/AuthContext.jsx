import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token');
    const role  = localStorage.getItem('role');
    const name  = localStorage.getItem('name');
    const assignedSites = JSON.parse(localStorage.getItem('assignedSites') || '[]');
    return token ? { token, role, name, assignedSites } : null;
  });

  const login = ({ token, role, name, assignedSites = [] }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('name', name);
    localStorage.setItem('assignedSites', JSON.stringify(assignedSites));
    setAuth({ token, role, name, assignedSites });
  };

  const logout = () => {
    localStorage.clear();
    setAuth(null);
  };

  return <AuthContext.Provider value={{ auth, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
