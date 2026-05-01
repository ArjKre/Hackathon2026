import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import LocationService from '../services/LocationService';
import { COLORS, ZONES } from '../theme';

const COUNTDOWN = 10; // Shorter for demo

export default function EmergencyOverlay({visible, onCancel, onCallNow}) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN);
  const [sent, setSent] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      setSent(false);
      setSecondsLeft(COUNTDOWN);
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1, duration: 1000, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 0, duration: 1000, useNativeDriver: true}),
      ])
    ).start();

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          setSent(true);
          return 0;
        }
        return s - 1;
      });
    }, 1_000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <View style={[styles.backdrop, sent && {backgroundColor: '#121412'}]}>
        {!sent ? (
          <>
            <View style={styles.timerWrapper}>
              <Animated.View style={[styles.pulseRing, {borderColor: COLORS.unsafe, opacity: pulseAnim, transform: [{scale: pulseAnim.interpolate({inputRange: [0, 1], outputRange: [1, 2]})}]}]} />
              <Text style={styles.countdownText}>{secondsLeft}</Text>
            </View>
            <Text style={styles.title}>EMERGENCY SOS</Text>
            <Text style={styles.subtitle}>Sending your location to emergency services in {secondsLeft} seconds</Text>
            
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>CANCEL SOS</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.checkCircle}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
            <Text style={styles.title}>SOS SENT</Text>
            <Text style={styles.subtitle}>Emergency services and contacts have been notified with your live location.</Text>
            <TouchableOpacity style={[styles.cancelBtn, {borderColor: COLORS.safe}]} onPress={onCancel}>
              <Text style={[styles.cancelBtnText, {color: COLORS.safe}]}>CLOSE</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: '#1a1212', alignItems: 'center', justifyContent: 'center', padding: 24},
  timerWrapper: {width: 150, height: 150, borderRadius: 75, backgroundColor: `${COLORS.unsafe}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 40},
  pulseRing: {position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 4},
  countdownText: {color: COLORS.unsafe, fontSize: 64, fontWeight: '800'},
  title: {color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 12},
  subtitle: {color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 60, lineHeight: 24},
  cancelBtn: {width: '100%', height: 60, borderRadius: 30, borderWidth: 2, borderColor: COLORS.textMuted, alignItems: 'center', justifyContent: 'center'},
  cancelBtnText: {color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 1},
  checkCircle: {width: 100, height: 100, borderRadius: 50, backgroundColor: `${COLORS.safe}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 40, borderWidth: 2, borderColor: COLORS.safe},
  checkIcon: {color: COLORS.safe, fontSize: 48, fontWeight: '800'},
});