import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, PanResponder } from 'react-native';

const JOYSTICK_RADIUS = 70;
const KNOB_RADIUS = 28;
const MAX_LINEAR_SPEED = 0.5;
const MAX_YAW_SPEED = 0.7;

export function VirtualJoystick({ onMove, onRelease, disabled }) {
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const intervalRef = useRef(null);
  const latestPos = useRef({ dx: 0, dy: 0 });
  const isSending = useRef(false);

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const startSending = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (isSending.current) return;
      isSending.current = true;
      const { dx, dy } = latestPos.current;
      
      const x_norm = clamp(dx / JOYSTICK_RADIUS, -1, 1);
      const y_norm = clamp(dy / JOYSTICK_RADIUS, -1, 1);
      
      // Eje Y: avance
      const vx = -y_norm * MAX_LINEAR_SPEED;
      // Eje X: giro
      const vyaw = -x_norm * MAX_YAW_SPEED;

      onMove(parseFloat(vx.toFixed(2)), 0, parseFloat(vyaw.toFixed(2))).finally(() => {
        isSending.current = false;
      });
    }, 150);
  }, [onMove]);

  const stopSending = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    isSending.current = false;
    latestPos.current = { dx: 0, dy: 0 };
    onRelease();
  }, [onRelease]);

  const initialTouch = useRef({ startX: 0, startY: 0 });

  const handleGrant = (event) => {
    if (disabled) return;
    const { locationX, locationY } = event.nativeEvent;
    
    let x = locationX - JOYSTICK_RADIUS;
    let y = locationY - JOYSTICK_RADIUS;
    initialTouch.current = { startX: x, startY: y };
    
    updatePosition(x, y);
  };

  const handleMove = (event, gestureState) => {
    if (disabled) return;
    const x = initialTouch.current.startX + gestureState.dx;
    const y = initialTouch.current.startY + gestureState.dy;
    
    updatePosition(x, y);
  };

  const updatePosition = (x, y) => {
    const dist = Math.hypot(x, y);
    if (dist > JOYSTICK_RADIUS) {
      x = (x / dist) * JOYSTICK_RADIUS;
      y = (y / dist) * JOYSTICK_RADIUS;
    }
    
    setKnobOffset({ x, y });
    latestPos.current = { dx: x, dy: y };
    startSending();
  };

  const handleRelease = () => {
    setKnobOffset({ x: 0, y: 0 });
    stopSending();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: handleGrant,
      onPanResponderMove: handleMove,
      onPanResponderRelease: handleRelease,
      onPanResponderTerminate: handleRelease,
    })
  ).current;

  return (
    <View style={styles.joystickWrapper}>
      <Text style={styles.joystickLabel}>JOYSTICK</Text>
      <View
        style={[styles.joystickBase, disabled && styles.disabledOverlay]}
        {...panResponder.panHandlers}
      >
        <View style={styles.joystickLineH} pointerEvents="none" />
        <View style={styles.joystickLineV} pointerEvents="none" />
        <View
          pointerEvents="none"
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

const styles = StyleSheet.create({
  joystickWrapper: { alignItems: 'center', gap: 12 },
  joystickLabel: { color: '#444', fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 4 },
  joystickBase: {
    width: JOYSTICK_RADIUS * 2, height: JOYSTICK_RADIUS * 2, borderRadius: JOYSTICK_RADIUS,
    backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e0e0e0',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  joystickLineH: { position: 'absolute', width: '85%', height: 1, backgroundColor: '#e0e0e0' },
  joystickLineV: { position: 'absolute', height: '85%', width: 1, backgroundColor: '#e0e0e0' },
  joystickKnob: {
    width: KNOB_RADIUS * 2, height: KNOB_RADIUS * 2, borderRadius: KNOB_RADIUS,
    backgroundColor: '#1e6fd9',
    shadowColor: '#1e6fd9', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    position: 'absolute',
  },
  joystickHint: { color: '#888', fontSize: 10, marginTop: 4 },
  disabledOverlay: { opacity: 0.4 },
});
