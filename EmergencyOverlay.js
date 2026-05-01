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
import LocationService from './LocationService';

const COUNTDOWN = 180; // 3 minutes in seconds

export default function EmergencyOverlay({visible, onCancel, onCallNow}) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN);
  const [position, setPosition] = useState(null);
  const [locLoading, setLocLoading] = useState(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  // Reset state every time overlay becomes visible
  useEffect(() => {
    if (!visible) return;
    setSecondsLeft(COUNTDOWN);
    setLocLoading(true);
    setPosition(null);

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // Pulse the warning icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.92,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Vibrate pattern: long buzz on trigger
    Vibration.vibrate([0, 500, 200, 500]);

    // Countdown
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          onCallNow();
          return 0;
        }
        return s - 1;
      });
    }, 1_000);

    // Fetch location
    LocationService.getCurrentPosition().then((pos) => {
      setPosition(pos);
      setLocLoading(false);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      Vibration.cancel();
      pulseAnim.stopAnimation();
      fadeAnim.setValue(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const formattedTime = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const progress = secondsLeft / COUNTDOWN;

  const timerColor =
    secondsLeft > 120 ? '#22C55E' :
    secondsLeft > 60  ? '#F59E0B' :
                        '#EF4444';

  // SVG ring math
  const R   = 52;
  const CX  = 65;
  const CY  = 65;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const strokeDash = CIRCUMFERENCE * progress;

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, {opacity: fadeAnim}]}>
        {/* Warning icon */}
        <Animated.View style={[styles.iconRing, {transform: [{scale: pulseAnim}]}]}>
          <Text style={styles.iconText}>⚠</Text>
        </Animated.View>

        <Text style={styles.title}>IMPACT DETECTED</Text>
        <Text style={styles.subtitle}>
          Emergency services will be contacted automatically
        </Text>

        {/* Circular countdown */}
        <View style={styles.timerContainer}>
          <Svg width={130} height={130} viewBox="0 0 130 130">
            {/* Background ring */}
            <Circle
              cx={CX} cy={CY} r={R}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={6}
              fill="none"
            />
            {/* Progress ring */}
            <Circle
              cx={CX} cy={CY} r={R}
              stroke={timerColor}
              strokeWidth={6}
              fill="none"
              strokeDasharray={`${strokeDash} ${CIRCUMFERENCE}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${CX} ${CY})`}
            />
          </Svg>
          <View style={styles.timerInner}>
            <Text style={[styles.timerText, {color: timerColor}]}>{formattedTime}</Text>
            <Text style={styles.timerLabel}>remaining</Text>
          </View>
        </View>

        {/* Location card */}
        <View style={styles.locationCard}>
          <View style={styles.locationIcon}>
            <Text style={styles.locationIconText}>📍</Text>
          </View>
          <View style={styles.locationText}>
            <Text style={styles.locationLabel}>YOUR LOCATION</Text>
            {locLoading ? (
              <View style={styles.locLoading}>
                <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
                <Text style={styles.locLoadingText}>Acquiring GPS…</Text>
              </View>
            ) : (
              <Text style={styles.locationCoords}>
                {LocationService.formatCoords(position)}
              </Text>
            )}
          </View>
        </View>

        {/* Call now */}
        <TouchableOpacity style={styles.callBtn} onPress={onCallNow} activeOpacity={0.8}>
          <Text style={styles.callBtnIcon}>📞</Text>
          <Text style={styles.callBtnText}>CALL EMERGENCY NOW</Text>
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.cancelBtnText}>✕  I'M SAFE — CANCEL</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.93)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconRing: {
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 2.5,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 24,
  },
  iconText: {fontSize: 46},
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    letterSpacing: 0.3,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  timerInner: {
    position: 'absolute',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 30,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timerLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    padding: 16,
    width: '100%',
    marginBottom: 32,
  },
  locationIcon: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  locationIconText: {fontSize: 20},
  locationText: {flex: 1},
  locationLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '600',
    marginBottom: 3,
  },
  locLoading: {flexDirection: 'row', alignItems: 'center', gap: 8},
  locLoadingText: {color: 'rgba(255,255,255,0.4)', fontSize: 13},
  locationCoords: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 16,
    height: 58,
    width: '100%',
    marginBottom: 14,
    shadowColor: '#EF4444',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    gap: 10,
  },
  callBtnIcon: {fontSize: 20},
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    height: 54,
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  cancelBtnText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
});