import { createContext, useState, useEffect, useRef, useCallback, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from './AuthContext';
import { connectionService } from '../services/api';
import {
  DEFAULT_NETWORK_INTERFACE,
  STATUS_POLL_MS,
  MAX_RECONNECT_ATTEMPTS,
} from '../config/constants';

export const RobotContext = createContext(null);

// La API devuelve los errores como { error, detail, sdk_code, available }.
function errMsg(e, fallback) {
  return e?.response?.data?.error || e?.response?.data?.detail || e?.message || fallback;
}

// GET /status -> connection_state: "disconnected" | "connecting" | "connected" | "error"
function isConnectedStatus(s) {
  return Boolean(s) && s.connection_state === 'connected';
}

export function RobotProvider({ children }) {
  const { user } = useContext(AuthContext);
  // connectionState (cliente): disconnected | connecting | connected | reconnecting | error
  const [connectionState, setConnectionState] = useState('disconnected');
  const [robotType, setRobotType] = useState('go2');
  const [networkInterface, setNetworkInterface] = useState(DEFAULT_NETWORK_INTERFACE);
  const [statusData, setStatusData] = useState(null); // JSON crudo de /status
  const [lastError, setLastError] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]); // historial local de sesión (puntos 2 y 5)

  const attemptsRef = useRef(0);       // intentos de reconexión consecutivos
  const busyRef = useRef(false);       // evita pisar requests del polling
  const lastParamsRef = useRef(null);  // params del último connect exitoso

  // Cargar historial cuando el usuario cambia
  useEffect(() => {
    if (!user?.username) {
      setCommandHistory([]);
      return;
    }
    const loadHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem(`history_${user.username}`);
        if (stored) {
          setCommandHistory(JSON.parse(stored));
        } else {
          setCommandHistory([]);
        }
      } catch (e) {
        console.log('Error loading history', e);
      }
    };
    loadHistory();
  }, [user?.username]);

  // Para puntos 2 y 5: registrar un comando enviado al robot.
  const addToHistory = useCallback((action, success) => {
    setCommandHistory((prev) => {
      const newHistory = [
        { action, success, timestamp: new Date().toISOString() },
        ...prev,
      ];
      if (user?.username) {
        AsyncStorage.setItem(`history_${user.username}`, JSON.stringify(newHistory)).catch(e => console.log('Error saving history', e));
      }
      return newHistory;
    });
  }, [user?.username]);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await connectionService.status();
      setStatusData(res.data);
      return res.data;
    } catch (e) {
      setStatusData(null);
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    setConnectionState('connecting');
    setLastError(null);
    try {
      await connectionService.connect(robotType, networkInterface);
      lastParamsRef.current = { robotType, networkInterface };
      attemptsRef.current = 0;
      await refreshStatus();
      setConnectionState('connected');
      return true;
    } catch (e) {
      // 409 ALREADY_CONNECTED -> ya estaba conectado: sincronizamos en vez de fallar.
      if (e?.response?.status === 409) {
        const s = await refreshStatus();
        if (isConnectedStatus(s)) {
          lastParamsRef.current = { robotType, networkInterface };
          attemptsRef.current = 0;
          setConnectionState('connected');
          return true;
        }
      }
      setLastError(errMsg(e, 'No se pudo conectar'));
      setConnectionState('error');
      return false;
    }
  }, [robotType, networkInterface, refreshStatus]);

  const disconnect = useCallback(async () => {
    try {
      await connectionService.disconnect();
    } catch (e) {
      // 409 NOT_CONNECTED u otro: localmente lo damos por cortado igual.
    } finally {
      lastParamsRef.current = null;
      attemptsRef.current = 0;
      setStatusData(null);
      setLastError(null);
      setConnectionState('disconnected');
    }
  }, []);

  // Al iniciar la app: sincronizar estado con /status (punto 4).
  useEffect(() => {
    (async () => {
      const s = await refreshStatus();
      if (isConnectedStatus(s)) setConnectionState('connected');
    })();
  }, [refreshStatus]);

  // Polling + auto-reconexión mientras (creemos que) estamos conectados.
  useEffect(() => {
    const active = connectionState === 'connected' || connectionState === 'reconnecting';
    if (!active) return undefined;

    const id = setInterval(async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const s = await refreshStatus();
        if (isConnectedStatus(s)) {
          attemptsRef.current = 0;
          setConnectionState('connected');
          return;
        }
        // Perdimos el estado -> reconectar con los últimos params.
        const params = lastParamsRef.current;
        if (params && attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          attemptsRef.current += 1;
          setConnectionState('reconnecting');
          try {
            await connectionService.connect(params.robotType, params.networkInterface);
            await refreshStatus();
          } catch (_) {
            // reintenta en el próximo tick
          }
        } else {
          setLastError('Se perdió la conexión y no se pudo reconectar');
          setConnectionState('error');
        }
      } finally {
        busyRef.current = false;
      }
    }, STATUS_POLL_MS);

    return () => clearInterval(id);
  }, [connectionState, refreshStatus]);

  return (
    <RobotContext.Provider
      value={{
        connectionState,
        setConnectionState,
        robotType,
        setRobotType,
        networkInterface,
        setNetworkInterface,
        statusData,
        setStatusData,
        lastError,
        commandHistory,
        addToHistory,
        isConnected: connectionState === 'connected',
        connect,
        disconnect,
        refreshStatus,
      }}
    >
      {children}
    </RobotContext.Provider>
  );
}