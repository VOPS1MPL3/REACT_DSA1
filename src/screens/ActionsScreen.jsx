import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRobot } from '../hooks/useRobot';
import { actionService } from '../services/api';
import { ROBOT_TYPES } from '../config/constants';

// Mismo criterio de mensaje de error que RobotContext (la API responde { error, detail }).
function errMsg(e, fallback) {
  return e?.response?.data?.error || e?.response?.data?.detail || e?.message || fallback;
}

// GET /actions puede venir como ["dance", ...], { actions: [...] } o [{ name }, ...].
// Normalizamos siempre a un array de strings con el nombre de la acción.
function normalizeActions(data) {
  const arr = Array.isArray(data)
    ? data
    : Array.isArray(data?.actions)
    ? data.actions
    : [];
  return arr
    .map((item) =>
      typeof item === 'string' ? item : item?.name || item?.id || item?.action || ''
    )
    .filter(Boolean);
}


export function ActionsScreen() {
  const { isConnected, robotType, addToHistory } = useRobot();


  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [executing, setExecuting] = useState(null); // nombre de la acción en curso, o null

  const theme = useMemo(
    () => ROBOT_TYPES.find((r) => r.id === robotType) || ROBOT_TYPES[0],
    [robotType]
  );

  // GET /actions — carga la lista de acciones disponibles.
  const loadActions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await actionService.list();
      setActions(normalizeActions(res.data));
    } catch (e) {
      setActions([]);
      setLoadError(errMsg(e, 'No se pudieron cargar las acciones'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Al conectar el robot, cargar las acciones. Al desconectar, limpiar.
  useEffect(() => {
    if (isConnected) {
      loadActions();
    } else {
      setActions([]);
      setLoadError(null);
    }
  }, [isConnected, loadActions]);

  // POST /action/{nombre} — ejecuta una acción y registra el resultado en el historial.
  const handleExecute = useCallback(
    async (name) => {
      if (!isConnected || executing) return;
      setExecuting(name);
      try {
        await actionService.execute(name);
        addToHistory(name, true);
      } catch (e) {
        addToHistory(name, false);
      } finally {
        setExecuting(null);
      }
    },
    [isConnected, executing, addToHistory]
  );

  // No conectado: la pantalla queda deshabilitada (habilitada solo si el robot está conectado).
  if (!isConnected) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.notice}>
            <Text style={styles.noticeEmoji}>🤖</Text>
            <Text style={styles.noticeTitle}>Robot desconectado</Text>
            <Text style={styles.noticeText}>
              Conectá el robot desde la pestaña Conexión para ver y ejecutar acciones.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const lock = executing !== null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Encabezado: lista de acciones + refrescar */}
        <View style={styles.diagHeader}>
          <Text style={styles.sectionTitle}>Acciones disponibles</Text>
          <TouchableOpacity
            onPress={loadActions}
            disabled={loading || lock}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.refresh, { color: theme.color }, (loading || lock) && styles.muted]}>
              Refrescar
            </Text>
          </TouchableOpacity>
        </View>


        {/* Estado de carga / error / vacío / grilla */}
        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.color} />
        ) : loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity onPress={loadActions}>
              <Text style={[styles.refresh, { color: theme.color }]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : actions.length === 0 ? (
          <Text style={styles.empty}>No hay acciones disponibles.</Text>
        ) : (
          <View style={styles.grid}>
            {actions.map((name) => {
              const running = executing === name;
              return (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.actionCard,
                    { borderColor: theme.color },
                    lock && !running && styles.cardDisabled,
                  ]}
                  onPress={() => handleExecute(name)}
                  disabled={lock}
                  activeOpacity={0.85}
                >
                  {running ? (
                    <ActivityIndicator color={theme.color} />
                  ) : (
                    <Text style={[styles.actionText, { color: theme.color }]} numberOfLines={2}>
                      {name}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 40 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#444', marginBottom: 10 },
  diagHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refresh: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  muted: { opacity: 0.4 },

  // Aviso de robot desconectado
  notice: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
  },
  noticeEmoji: { fontSize: 44, marginBottom: 10 },
  noticeTitle: { fontSize: 18, fontWeight: '700', color: '#444', marginBottom: 6 },
  noticeText: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 19 },


  // Estados de carga / error / vacío
  loader: { marginVertical: 24 },
  errorBox: { alignItems: 'center', marginVertical: 16 },
  errorText: { color: '#d93025', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  empty: { color: '#888', fontSize: 13, marginBottom: 24 },

  // Grilla de acciones
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  actionCard: {
    width: '47%',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 22,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  cardDisabled: { opacity: 0.4 },
  actionText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },

});
