export const BASE_URL = 'http://192.168.1.44:8000';

export const ROBOT_TYPES = [
  { id: 'go2', label: 'Go2', subtitle: 'Cuadrúpedo', emoji: '🐕', color: '#1e6fd9' },
  { id: 'g1', label: 'G1', subtitle: 'Humanoide', emoji: '🧍', color: '#d98b1e' },
];

export const STATUS_POLL_MS = 3000;
export const MAX_RECONNECT_ATTEMPTS = 5;
export const SKIP_LOGIN = false;
export const DEMO_USER = { identifier: 'admin', password: 'changeme' };