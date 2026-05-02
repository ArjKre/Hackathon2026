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
import MapScreen from './map';

const COUNTDOWN = 30; // 3 minutes for real emergency

export default function EmergencyOverlay({visible, onCancel, onCallNow}) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN);
  const [sent, setSent] = useState(false);
  const [position, setPosition] = useState(null);
  const [locLoading, setLocLoading] = useState(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      setSent(false);
      setSecondsLeft(COUNTDOWN);
      setLocLoading(true);
      setPosition(null);
      return;
    }

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // Pulse animation with better easing
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

    // Vibration pattern: long buzz on trigger
    Vibration.vibrate([0, 500, 200, 500]);

    // Countdown timer
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          setSent(true);
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

  if (!visible) return null;

  // Timer formatting and color logic
  const formattedTime = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const progress = secondsLeft / COUNTDOWN;
  const timerColor =
    secondsLeft > 120 ? COLORS.safe :
    secondsLeft > 60  ? '#F59E0B' :
                        COLORS.unsafe;

  // SVG progress ring math
  const R = 52;
  const CX = 65;
  const CY = 65;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const strokeDash = CIRCUMFERENCE * progress;

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, {opacity: fadeAnim}, sent && {backgroundColor: '#121412'}]}>
        {!sent ? (
          <>
            {/* Warning icon with pulse */}
            <Animated.View style={[styles.iconRing, {transform: [{scale: pulseAnim}]}]}>
              <Text style={styles.iconText}>⚠</Text>
            </Animated.View>

            <Text style={styles.title}>EMERGENCY SOS</Text>
            <Text style={styles.subtitle}>
              Emergency services will be contacted automatically
            </Text>

            {/* Circular countdown with SVG progress ring */}
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

            {/* Location card with embedded map */}
            <View style={styles.locationCard}>
              {/* Location info - top right */}
              <View style={styles.locationInfoTop}>
                {/* <View style={styles.locationIcon}>
                  <Text>📍</Text>
                </View> */}
                <View style={styles.locationTextWrapper}>
                  <Text style={styles.locationLabel}>📍 YOUR LOCATION</Text>
                  {locLoading ? (
                    <View style={styles.locLoading}>
                      <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
                      <Text style={styles.locLoadingText}>Acquiring GPS…</Text>
                    </View>
                  ) : (
                    <Text style={styles.locationCoords}>
                      {/* {LocationService.formatCoords(position)} */}
                    </Text>
                  )}
                </View>
              </View>

              {/* Map - centered in middle */}
              {!locLoading && position && (
                <View style={styles.mapWrapper}>
                  <MapScreen position={position} />
                </View>
              )}
            </View>
            {/* Call now button */}
            <TouchableOpacity style={styles.callBtn} onPress={onCallNow} activeOpacity={0.8}>
              <Text style={styles.callBtnIcon}>📞</Text>
              <Text style={styles.callBtnText}>CALL EMERGENCY NOW</Text>
            </TouchableOpacity>

            {/* Cancel button */}
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>✕  I'M SAFE — CANCEL</Text>
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
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#1a1212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLORS.unsafe}22`,
    borderWidth: 2.5,
    borderColor: COLORS.unsafe,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.unsafe,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 24,
  },
  iconText: {fontSize: 46},
  title: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
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
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    padding: 16,
    width: '100%',
    marginBottom: 32,
    overflow: 'hidden',
  },
  locationInfoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  locationIconText: {fontSize: 10},
  locationTextWrapper: {
    flex: 1,
  },
  locationLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '600',
    marginBottom: 2,
  },
  locLoading: {flexDirection: 'row', alignItems: 'center', gap: 6},
  locLoadingText: {color: 'rgba(255,255,255,0.4)', fontSize: 12},
  locationCoords: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  mapWrapper: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.unsafe,
    borderRadius: 16,
    height: 58,
    width: '100%',
    marginBottom: 14,
    shadowColor: COLORS.unsafe,
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
    borderColor: COLORS.textMuted,
  },
  cancelBtnText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLORS.safe}22`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    borderWidth: 2,
    borderColor: COLORS.safe,
  },
  checkIcon: {color: COLORS.safe, fontSize: 48, fontWeight: '800'},
});