// URL del servidor — cambiar por la IP del laboratorio
//export const BASE_URL = 'http://192.168.0.128:8000';
//export const BASE_URL = 'http://10.128.48.107:8000'; // IP Actual (Red de celular)
export const BASE_URL = 'http://192.168.137.78:8000';
// Interfaz de red por defecto
export const DEFAULT_NETWORK_INTERFACE = 'eth0';

// Tipos de robot disponibles (selector + diferenciación visual)
export const ROBOT_TYPES = [
  { id: 'go2', label: 'Go2', subtitle: 'Cuadrúpedo', emoji: '🐕', color: '#1e6fd9' },
  { id: 'g1', label: 'G1', subtitle: 'Humanoide', emoji: '🧍', color: '#d98b1e' },
];

// Cada cuántos ms se consulta /status mientras estamos conectados
export const STATUS_POLL_MS = 3000;

// Intentos máximos de reconexión automática antes de marcar error
export const MAX_RECONNECT_ATTEMPTS = 5;

// ─── Bypass temporal de login para la demo ───────────────────────────────────
// Con SKIP_LOGIN en true, la app hace login automático con DEMO_USER al arrancar
// y salta directo a las tabs (PERO obtiene un token real, así el robot funciona).
// Poné SKIP_LOGIN en false para volver al flujo normal de Login.
export const SKIP_LOGIN = false;
export const DEMO_USER = { identifier: 'admin', password: 'changeme' };