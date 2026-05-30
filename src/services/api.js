import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '../config/constants';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export function setupInterceptors(logoutFn) {
  api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        await SecureStore.deleteItemAsync('token');
        logoutFn?.();
      }
      return Promise.reject(error);
    }
  );
}

// Auth
export const authService = {
  login: (identifier, password) =>
    api.post('/auth/token', { identifier, password }),
  register: (username, email, password) =>
    api.post('/auth/register', { username, email, password }),
};

// Conexión
export const connectionService = {
  connect: (robot_type, network_interface) =>
    api.post('/connect', { robot_type, network_interface }),
  disconnect: () => api.post('/disconnect'),
  status: () => api.get('/status'),
};

// Movimiento
export const motionService = {
  move:    (vx, vy, vyaw)      => api.post('/move', { vx, vy, vyaw }),
  stop:    ()                  => api.post('/stop'),
  standup: ()                  => api.post('/standup'),
  sitdown: ()                  => api.post('/sitdown'),
  toggle:  (endpoint, enable)  => api.post(`/${endpoint}`, { enable }),
};

// Acciones
export const actionService = {
  list:    ()     => api.get('/actions'),
  execute: (name) => api.post(`/action/${name}`),
};