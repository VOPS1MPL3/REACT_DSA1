import { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRobot } from '../hooks/useRobot';
import { ROBOT_TYPES } from '../config/constants';

const STATE_UI = {
  disconnected: { label: 'Desconectado',  color: '#9aa0a6' },
  connecting:   { label: 'Conectando…',   color: '#1e6fd9' },
  connected:    { label: 'Conectado',     color: '#1e8e3e' },
  reconnecting: { label: 'Reconectando…', color: '#e8a13a' },
  error:        { label: 'Error',         color: '#d93025' },
};

export function ConnectionScreen() {
  const {
    connectionState,
    statusData,
    lastError,
    robotType,
    setRobotType,
    networkInterface,
    setNetworkInterface,
    isConnected,
    connect,
    disconnect,
    refreshStatus,
  } = useRobot();

  const busy = connectionState === 'connecting' || connectionState === 'reconnecting';
  const ui = STATE_UI[connectionState] || STATE_UI.disconnected;
  const theme = useMemo(
    () => ROBOT_TYPES.find((r) => r.id === robotType) || ROBOT_TYPES[0],
    [robotType]
  );
  const lockSelection = isConnected || busy;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Indicador de estado */}
        <View style={[styles.statusCard, { borderColor: ui.color }]}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: ui.color }]} />
            <Text style={[styles.statusText, { color: ui.color }]}>{ui.label}</Text>
            {busy ? <ActivityIndicator style={styles.statusSpinner} color={ui.color} /> : null}
          </View>
          {lastError ? <Text style={styles.errorText}>{lastError}</Text> : null}
        </View>

        {/* Selector de tipo de robot */}
        <Text style={styles.sectionTitle}>Tipo de robot</Text>
        <View style={styles.robotRow}>
          {ROBOT_TYPES.map((r) => {
            const selected = r.id === robotType;
            return (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.robotCard,
                  selected && { borderColor: r.color, backgroundColor: r.color + '14' },
                  lockSelection && !selected && styles.cardDisabled,
                ]}
                onPress={() => !lockSelection && setRobotType(r.id)}
                disabled={lockSelection}
                activeOpacity={0.8}
              >
                <Text style={styles.robotEmoji}>{r.emoji}</Text>
                <Text style={[styles.robotLabel, selected && { color: r.color }]}>{r.label}</Text>
                <Text style={styles.robotSub}>{r.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Interfaz de red */}
        <Text style={styles.sectionTitle}>Interfaz de red</Text>
        <TextInput
          style={[styles.input, lockSelection && styles.inputDisabled]}
          value={networkInterface}
          onChangeText={setNetworkInterface}
          placeholder="eth0"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!lockSelection}
        />

        {/* Conectar / Desconectar */}
        {isConnected ? (
          <TouchableOpacity style={[styles.button, styles.btnDanger]} onPress={disconnect}>
            <Text style={styles.buttonText}>Desconectar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.color }, busy && styles.btnMuted]}
            onPress={connect}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Conectar</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Diagnóstico: JSON completo de GET /status */}
        <View style={styles.diagHeader}>
          <Text style={styles.sectionTitle}>Diagnóstico — GET /status</Text>
          <TouchableOpacity onPress={refreshStatus} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.refresh, { color: theme.color }]}>Refrescar</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.jsonBox}>
          <Text style={styles.jsonText}>
            {statusData ? JSON.stringify(statusData, null, 2) : 'Sin datos de /status todavía.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 40 },

  statusCard: { borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  statusText: { fontSize: 18, fontWeight: '700' },
  statusSpinner: { marginLeft: 8 },
  errorText: { color: '#d93025', marginTop: 8, fontSize: 13 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#444', marginBottom: 10 },

  robotRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  robotCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  cardDisabled: { opacity: 0.4 },
  robotEmoji: { fontSize: 36, marginBottom: 6 },
  robotLabel: { fontSize: 18, fontWeight: '700', color: '#222' },
  robotSub: { fontSize: 12, color: '#888', marginTop: 2 },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  inputDisabled: { backgroundColor: '#f2f2f2', color: '#999' },

  button: { padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 28 },
  btnDanger: { backgroundColor: '#d93025' },
  btnMuted: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  diagHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refresh: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  jsonBox: { backgroundColor: '#1e1e1e', borderRadius: 10, padding: 14 },
  jsonText: { color: '#d4d4d4', fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
});