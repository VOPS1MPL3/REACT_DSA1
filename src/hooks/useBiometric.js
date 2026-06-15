import { useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

/**
 * Hook para autenticación biométrica.
 *
 * `available` es true cuando:
 *   - el dispositivo tiene hardware biométrico
 *   - hay biometría enrolada
 *   - existe un token guardado (el usuario ya inició sesión al menos una vez)
 *
 * `authenticate()` dispara el prompt biométrico y, si tiene éxito,
 * devuelve { token, userData } listos para pasarle a login() del AuthContext.
 * Devuelve null si falla o si no hay datos guardados.
 */
export function useBiometric() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const hardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const token    = await SecureStore.getItemAsync('token');
        setAvailable(hardware && enrolled && !!token);
      } catch {
        setAvailable(false);
      }
    })();
  }, []);

  const authenticate = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirmá tu identidad',
        fallbackLabel: 'Usar contraseña',
        cancelLabel:   'Cancelar',
      });

      if (!result.success) return null;

      const token = await SecureStore.getItemAsync('token');
      const raw   = await SecureStore.getItemAsync('user');

      if (!token || !raw) return null;

      return { token, userData: JSON.parse(raw) };
    } catch {
      return null;
    }
  };

  return { available, authenticate };
}
