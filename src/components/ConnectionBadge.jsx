import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRobot } from '../hooks/useRobot';

// Mapa de estado -> etiqueta + color (mismo criterio visual que la pantalla de Conexión).
const STATE_UI = {
  disconnected: { label: 'Desconectado',  color: '#9aa0a6' },
  connecting:   { label: 'Conectando…',   color: '#1e6fd9' },
  connected:    { label: 'Conectado',     color: '#1e8e3e' },
  reconnecting: { label: 'Reconectando…', color: '#e8a13a' },
  error:        { label: 'Error',         color: '#d93025' },
};

// Indicador global de conexión para mostrar en el header de todas las pantallas (punto 4).
// Lee el estado desde RobotContext, así se mantiene sincronizado en cualquier pantalla.
export function ConnectionBadge() {
  const { connectionState } = useRobot();
  const ui = STATE_UI[connectionState] || STATE_UI.disconnected;
  const busy = connectionState === 'connecting' || connectionState === 'reconnecting';

  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: ui.color }]} />
      <Text style={[styles.label, { color: ui.color }]}>{ui.label}</Text>
      {busy ? <ActivityIndicator size="small" color={ui.color} style={styles.spinner} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', marginRight: 14 },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 6 },
  label: { fontSize: 13, fontWeight: '700' },
  spinner: { marginLeft: 6 },
});
