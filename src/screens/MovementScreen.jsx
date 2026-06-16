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
import { motionService, actionService } from '../services/api';
import { useRobot } from '../hooks/useRobot';
import { VirtualJoystick } from '../components/VirtualJoystick';

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



// ─── Direction Button ─────────────────────────────────────────────────────────
function DirButton({ label, icon, onPress, disabled, loading }) {
  return (
    <TouchableOpacity
      style={[styles.dirBtn, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.6}
    >
      {loading ? (
        <ActivityIndicator color="#1e6fd9" size="small" />
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
function ActionButton({ label, icon, onPress, disabled, loading, color, bg }) {
  return (
    <TouchableOpacity
      style={[
        styles.actionBtn,
        { borderColor: color || '#1e6fd9', backgroundColor: bg || '#f8f9fa' },
        disabled && styles.btnDisabled
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.6}
    >
      {loading ? (
        <ActivityIndicator color={color || '#1e6fd9'} size="small" />
      ) : (
        <>
          <Text style={[styles.actionBtnIcon, { color: color || '#1e6fd9' }]}>{icon}</Text>
          <Text style={[styles.actionBtnLabel, { color: color || '#1e6fd9' }]}>{label}</Text>
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
      
      // Si el comando es pararse, llamamos a balance_stand
      if (key === 'standup') {
        try {
          await actionService.execute('balance_stand');
        } catch (err) {
          console.log('balance_stand omitido o no soportado:', err);
        }
      }

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

  const isJoystickActive = useRef(false);

  const handleMove = async (vx, vy, vyaw) => {
    try {
      await motionService.move(vx, vy, vyaw);
      if (!isJoystickActive.current) {
        isJoystickActive.current = true;
        addToHistory('Mover (Joystick)', true);
      }
    } catch (e) {
      showToast('Error al mover', 'error');
      if (!isJoystickActive.current) {
        isJoystickActive.current = true;
        addToHistory('Mover (Joystick)', false);
      }
    }
  };

  const handleJoystickRelease = () => {
    isJoystickActive.current = false;
    motionService.stop()
      .catch(() => {});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

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
            <VirtualJoystick onMove={handleMove} onRelease={handleJoystickRelease} disabled={!isConnected} />
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
                    ? <ActivityIndicator color="#d93025" size="small" />
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
                label="Pararse" icon="🦿" color="#1e6fd9" bg="#f0f4fa"
                disabled={!isConnected} loading={loadingBtn === 'standup'}
                onPress={() => handleAction('standup', motionService.standup, 'Pararse')}
              />
              <ActionButton
                label="Sentarse" icon="🪑" color="#e8a13a" bg="#fff5e6"
                disabled={!isConnected} loading={loadingBtn === 'sitdown'}
                onPress={() => handleAction('sitdown', motionService.sitdown, 'Sentarse')}
              />
              <ActionButton
                label="Detener" icon="🛑" color="#d93025" bg="#ffebe6"
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0',
  },
  headerTitle: { color: '#222', fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dotConnected: {
    backgroundColor: '#1e8e3e',
    shadowColor: '#1e8e3e', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
  },
  dotDisconnected: { backgroundColor: '#d93025' },

  toast: {
    position: 'absolute', top: 70, alignSelf: 'center',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, zIndex: 999,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 6,
  },
  toastSuccess: { backgroundColor: '#1e8e3e' },
  toastError: { backgroundColor: '#d93025' },
  toastText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },

  disconnectedBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  disconnectedIcon: { fontSize: 56, marginBottom: 8 },
  disconnectedText: { color: '#222', fontSize: 20, fontWeight: '800' },
  disconnectedSub: { color: '#666', fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },

  scrollContent: { paddingTop: 8, paddingHorizontal: 20 },
  section: { paddingVertical: 20 },
  sectionTitle: { color: '#444', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 20, marginLeft: 4 },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 8 },

  dpadContainer: { alignItems: 'center', gap: 10 },
  dpadRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  dpadEmpty: { width: 72, height: 72 },
  dirBtn: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e0e0e0',
    alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  dirBtnIcon: { color: '#444', fontSize: 22 },
  dirBtnLabel: { color: '#666', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  stopCenterBtn: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#ffebe6', borderWidth: 1, borderColor: '#d93025',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#d93025', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  stopCenterIcon: { fontSize: 32, color: '#d93025' },
  btnDisabled: { opacity: 0.4 },

  actionsRow: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  actionBtn: {
    flex: 1, paddingVertical: 20, borderRadius: 24,
    borderWidth: 1, alignItems: 'center', gap: 8,
  },
  actionBtnIcon: { fontSize: 28 },
  actionBtnLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
});