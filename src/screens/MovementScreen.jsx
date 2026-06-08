import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { motionService } from '../services/api';
import { useRobot } from '../hooks/useRobot';

const JOYSTICK_RADIUS = 70;
const KNOB_RADIUS = 28;

// ─── Feedback Toast ───────────────────────────────────────────────────────────
function Toast({ message, type }) {
  if (!message) return null;
  return (
    <View style={[styles.toast, type === 'error' ? styles.toastError : styles.toastSuccess]}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

// ─── Joystick ─────────────────────────────────────────────────────────────────
function Joystick({ onMove, onRelease, disabled }) {
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const intervalRef = useRef(null);

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const startSending = useCallback((dx, dy) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const vx = clamp(-dy / JOYSTICK_RADIUS, -1, 1) * 0.2;
      const vy = clamp(-dx / JOYSTICK_RADIUS, -1, 1) * 0.2;
      onMove(parseFloat(vx.toFixed(2)), parseFloat(vy.toFixed(2)), 0);
    }, 150);
  }, [onMove]);

  const stopSending = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    onRelease();
  }, [onRelease]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gesture) => {
        const dist = Math.sqrt(gesture.dx ** 2 + gesture.dy ** 2);
        const scale = dist > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / dist : 1;
        const dx = gesture.dx * scale;
        const dy = gesture.dy * scale;
        setKnobOffset({ x: dx, y: dy });
        startSending(dx, dy);
      },
      onPanResponderRelease: () => {
        setKnobOffset({ x: 0, y: 0 });
        stopSending();
      },
      onPanResponderTerminate: () => {
        setKnobOffset({ x: 0, y: 0 });
        stopSending();
      },
    })
  ).current;

  return (
    <View style={styles.joystickWrapper}>
      <Text style={styles.joystickLabel}>JOYSTICK</Text>
      <View
        style={[styles.joystickBase, disabled && styles.disabledOverlay]}
        {...panResponder.panHandlers}
      >
        <View style={styles.joystickLineH} />
        <View style={styles.joystickLineV} />
        <View
          style={[
            styles.joystickKnob,
            { transform: [{ translateX: knobOffset.x }, { translateY: knobOffset.y }] },
          ]}
        />
      </View>
      <Text style={styles.joystickHint}>Arrastrá para mover</Text>
    </View>
  );
}

// ─── Direction Button ─────────────────────────────────────────────────────────
function DirButton({ label, icon, onPress, disabled, loading }) {
  return (
    <TouchableOpacity
      style={[styles.dirBtn, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="#00E5FF" size="small" />
      ) : (
        <>
          <Text style={styles.dirBtnIcon}>{icon}</Text>
          <Text style={styles.dirBtnLabel}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionButton({ label, icon, onPress, disabled, loading, color }) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: color || '#00E5FF' }, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={color || '#00E5FF'} size="small" />
      ) : (
        <>
          <Text style={[styles.actionBtnIcon, { color: color || '#00E5FF' }]}>{icon}</Text>
          <Text style={[styles.actionBtnLabel, { color: color || '#00E5FF' }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function MovementScreen() {
  // Integrado con RobotContext del punto 1
  const { isConnected, addToHistory } = useRobot();

  const [toast, setToast] = useState({ message: '', type: '' });
  const [loadingBtn, setLoadingBtn] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast({ message: '', type: '' }), 2500);
  };

  const handleAction = async (key, apiFn, label) => {
    if (loadingBtn) return;
    setLoadingBtn(key);
    try {
      await apiFn();
      addToHistory(label, true);
      showToast(label, 'success');
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.detail || 'Error al ejecutar el comando';
      addToHistory(label, false);
      showToast(msg, 'error');
    } finally {
      setLoadingBtn(null);
    }
  };

  const handleMove = async (vx, vy, vyaw) => {
    try {
      await motionService.move(vx, vy, vyaw);
    } catch (e) {
      showToast('Error al mover', 'error');
    }
  };

  const handleJoystickRelease = () => {
    motionService.stop().catch(() => {});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CONTROL DE MOVIMIENTO</Text>
        <View style={[styles.statusDot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
      </View>

      <Toast message={toast.message} type={toast.type} />

      {!isConnected ? (
        <View style={styles.disconnectedBox}>
          <Text style={styles.disconnectedIcon}>🤖</Text>
          <Text style={styles.disconnectedText}>Robot desconectado</Text>
          <Text style={styles.disconnectedSub}>Conectá el robot desde la pantalla de Conexión</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Joystick */}
          <View style={styles.section}>
            <Joystick onMove={handleMove} onRelease={handleJoystickRelease} disabled={!isConnected} />
          </View>

          <View style={styles.divider} />

          {/* Direccionales */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DIRECCIONALES</Text>
            <View style={styles.dpadContainer}>
              <View style={styles.dpadRow}>
                <View style={styles.dpadEmpty} />
                <DirButton
                  label="Adelante" icon="▲"
                  disabled={!isConnected} loading={loadingBtn === 'fwd'}
                  onPress={() => handleAction('fwd', () => motionService.move(0.4, 0, 0), 'Avanzar')}
                />
                <View style={styles.dpadEmpty} />
              </View>
              <View style={styles.dpadRow}>
                <DirButton
                  label="Izq" icon="◀"
                  disabled={!isConnected} loading={loadingBtn === 'left'}
                  onPress={() => handleAction('left', () => motionService.move(0, 0.4, 0), 'Izquierda')}
                />
                <TouchableOpacity
                  style={[styles.stopCenterBtn, !isConnected && styles.btnDisabled]}
                  onPress={() => handleAction('stop', motionService.stop, 'Detener')}
                  disabled={!isConnected || loadingBtn === 'stop'}
                  activeOpacity={0.7}
                >
                  {loadingBtn === 'stop'
                    ? <ActivityIndicator color="#FF1744" size="small" />
                    : <Text style={styles.stopCenterIcon}>⏹</Text>
                  }
                </TouchableOpacity>
                <DirButton
                  label="Der" icon="▶"
                  disabled={!isConnected} loading={loadingBtn === 'right'}
                  onPress={() => handleAction('right', () => motionService.move(0, -0.4, 0), 'Derecha')}
                />
              </View>
              <View style={styles.dpadRow}>
                <DirButton
                  label="Rot ←" icon="↺"
                  disabled={!isConnected} loading={loadingBtn === 'rotl'}
                  onPress={() => handleAction('rotl', () => motionService.move(0, 0, 1.0), 'Rotar izq.')}
                />
                <DirButton
                  label="Atrás" icon="▼"
                  disabled={!isConnected} loading={loadingBtn === 'back'}
                  onPress={() => handleAction('back', () => motionService.move(-0.4, 0, 0), 'Retroceder')}
                />
                <DirButton
                  label="Rot →" icon="↻"
                  disabled={!isConnected} loading={loadingBtn === 'rotr'}
                  onPress={() => handleAction('rotr', () => motionService.move(0, 0, -1.0), 'Rotar der.')}
                />
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Posturas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>POSTURAS</Text>
            <View style={styles.actionsRow}>
              <ActionButton
                label="Pararse" icon="🦿" color="#00E5FF"
                disabled={!isConnected} loading={loadingBtn === 'standup'}
                onPress={() => handleAction('standup', motionService.standup, 'Pararse')}
              />
              <ActionButton
                label="Sentarse" icon="🪑" color="#B388FF"
                disabled={!isConnected} loading={loadingBtn === 'sitdown'}
                onPress={() => handleAction('sitdown', motionService.sitdown, 'Sentarse')}
              />
              <ActionButton
                label="Detener" icon="🛑" color="#FF1744"
                disabled={!isConnected} loading={loadingBtn === 'stop2'}
                onPress={() => handleAction('stop2', motionService.stop, 'Detener')}
              />
            </View>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#1C2340',
  },
  headerTitle: { color: '#00E5FF', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dotConnected: {
    backgroundColor: '#00E676',
    shadowColor: '#00E676', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 6, elevation: 4,
  },
  dotDisconnected: { backgroundColor: '#FF1744' },

  toast: {
    position: 'absolute', top: 70, alignSelf: 'center',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, zIndex: 999,
  },
  toastSuccess: { backgroundColor: '#00E676' },
  toastError: { backgroundColor: '#FF1744' },
  toastText: { color: '#0A0E1A', fontWeight: '700', fontSize: 13 },

  disconnectedBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  disconnectedIcon: { fontSize: 48, marginBottom: 8 },
  disconnectedText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  disconnectedSub: { color: '#4A5578', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

  scrollContent: { paddingTop: 8, paddingHorizontal: 16 },
  section: { paddingVertical: 16 },
  sectionTitle: { color: '#4A5578', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#1C2340' },

  joystickWrapper: { alignItems: 'center', gap: 10 },
  joystickLabel: { color: '#4A5578', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  joystickBase: {
    width: JOYSTICK_RADIUS * 2, height: JOYSTICK_RADIUS * 2, borderRadius: JOYSTICK_RADIUS,
    backgroundColor: '#111827', borderWidth: 2, borderColor: '#1C2340',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  joystickLineH: { position: 'absolute', width: '80%', height: 1, backgroundColor: '#1C2340' },
  joystickLineV: { position: 'absolute', height: '80%', width: 1, backgroundColor: '#1C2340' },
  joystickKnob: {
    width: KNOB_RADIUS * 2, height: KNOB_RADIUS * 2, borderRadius: KNOB_RADIUS,
    backgroundColor: '#00E5FF',
    shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 10, elevation: 6,
  },
  joystickHint: { color: '#2A3356', fontSize: 11 },
  disabledOverlay: { opacity: 0.3 },

  dpadContainer: { alignItems: 'center', gap: 8 },
  dpadRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dpadEmpty: { width: 72, height: 72 },
  dirBtn: {
    width: 72, height: 72, borderRadius: 12,
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1C2340',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  dirBtnIcon: { color: '#00E5FF', fontSize: 20 },
  dirBtnLabel: { color: '#4A5578', fontSize: 10, fontWeight: '600' },
  stopCenterBtn: {
    width: 72, height: 72, borderRadius: 12,
    backgroundColor: '#1A0810', borderWidth: 1, borderColor: '#FF1744',
    alignItems: 'center', justifyContent: 'center',
  },
  stopCenterIcon: { fontSize: 28 },
  btnDisabled: { opacity: 0.35 },

  actionsRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  actionBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 12,
    backgroundColor: '#111827', borderWidth: 1, alignItems: 'center', gap: 6,
  },
  actionBtnIcon: { fontSize: 24 },
  actionBtnLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
});