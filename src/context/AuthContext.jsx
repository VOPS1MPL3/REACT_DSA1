import { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { setupInterceptors, authService } from '../services/api';
import { SKIP_LOGIN, DEMO_USER } from '../config/constants';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const raw   = await SecureStore.getItemAsync('user');
        if (token && raw) {
          const hardware = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          
          if (hardware && enrolled) {
            const authResult = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Confirmá tu identidad',
              fallbackLabel: 'Usar contraseña',
              cancelLabel: 'Cancelar',
            });
            
            if (authResult.success) {
              setUser({ ...JSON.parse(raw), token });
            }
          } else {
            setUser({ ...JSON.parse(raw), token });
          }
        } else if (SKIP_LOGIN) {
          // Bypass demo: login automático para saltar la pantalla pero tener token real.
          const res = await authService.login(DEMO_USER.identifier, DEMO_USER.password);
          const access = res.data.access_token;
          await SecureStore.setItemAsync('token', access);
          await SecureStore.setItemAsync('user', JSON.stringify({ username: DEMO_USER.identifier }));
          setUser({ username: DEMO_USER.identifier, token: access });
        }
      } catch (err) {
        if (SKIP_LOGIN) {
          console.log("Auto-login ignorado por red. Entrando offline al joystick...");
          setUser({ username: DEMO_USER.identifier, token: 'mock-offline-token' });
        }
      }
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