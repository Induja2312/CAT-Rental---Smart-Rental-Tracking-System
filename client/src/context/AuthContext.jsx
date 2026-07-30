import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token');
    const role  = localStorage.getItem('role');
    const name  = localStorage.getItem('name');
    return token ? { token, role, name } : null;
  });

  const login = ({ token, role, name }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('name', name);
    setAuth({ token, role, name });
  };

  const logout = () => {
    localStorage.clear();
    setAuth(null);
  };

  return <AuthContext.Provider value={{ auth, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
