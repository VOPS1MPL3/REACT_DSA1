import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useRobot } from '../hooks/useRobot';

// Timestamp ISO del historial -> "HH:MM:SS" legible.
function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}

export function HistoryScreen() {
  const { commandHistory } = useRobot();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Historial de comandos</Text>
        {commandHistory.length === 0 ? (
          <Text style={styles.empty}>Todavía no enviaste ningún comando.</Text>
        ) : (
          <View style={styles.historyBox}>
            {commandHistory.map((item, i) => (
              <View
                key={`${item.timestamp}-${i}`}
                style={[styles.historyRow, i > 0 && styles.historyDivider]}
              >
                <View
                  style={[
                    styles.historyDot,
                    { backgroundColor: item.success ? '#1e8e3e' : '#d93025' },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyAction} numberOfLines={1}>
                    {item.action}
                  </Text>
                  {item.robotType && (
                    <Text style={styles.historyRobotType}>
                      Robot: {item.robotType}
                    </Text>
                  )}
                </View>
                <Text style={[styles.historyStatus, { color: item.success ? '#1e8e3e' : '#d93025' }]}>
                  {item.success ? 'Exitosa' : 'Falló'}
                </Text>
                <Text style={styles.historyTime}>{formatTime(item.timestamp)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#444', marginBottom: 16 },
  empty: { color: '#888', fontSize: 14, marginBottom: 24, textAlign: 'center', marginTop: 20 },
  historyBox: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 4 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 },
  historyDivider: { borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  historyAction: { fontSize: 14, color: '#222', fontWeight: '600' },
  historyRobotType: { fontSize: 11, color: '#666', marginTop: 2 },
  historyStatus: { fontSize: 12, fontWeight: '700', marginRight: 4, textTransform: 'uppercase' },
  historyTime: { fontSize: 12, color: '#999', marginLeft: 8 },
});