import { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setupInterceptors } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const raw   = await SecureStore.getItemAsync('user');
        if (token && raw) setUser({ ...JSON.parse(raw), token });
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const login = async (token, userData) => {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user', JSON.stringify(userData));
    setUser({ ...userData, token });
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setUser(null);
  };

  useEffect(() => { setupInterceptors(logout); }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}