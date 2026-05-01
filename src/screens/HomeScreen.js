import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import SensorService from '../services/SensorService';
import LocationService from '../services/LocationService';
import EmergencyOverlay from '../components/EmergencyOverlay';
import {SensorGauge, RadarWidget, Sparkline} from '../components/SensorWidgets';

const HISTORY_LEN = 60;

export default function HomeScreen() {
  const {width} = useWindowDimensions();
  const contentWidth = width - 40 - 40; // padding 20 each side + card padding 20 each

  const [monitoring, setMonitoring] = useState(true);
  const [emergency, setEmergency] = useState(false);
  const [readings, setReadings] = useState({
    ax: 0, ay: 0, az: 0,
    gx: 0, gy: 0, gz: 0,
    accelMag: 9.81,
    gyroMag: 0,
  });

  const accelHistory = useRef(Array(HISTORY_LEN).fill(0));
  const [historyTick, setHistoryTick] = useState(0);

  // Toggle animation
  const toggleAnim = useRef(new Animated.Value(1)).current;
  // Status pulse
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  // Run status pulse loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Boot
  useEffect(() => {
    LocationService.requestPermission();

    SensorService.onImpactDetected = () => {
      setEmergency(true);
    };
    SensorService.onReadingsUpdated = (r) => {
      setReadings(r);
      accelHistory.current.shift();
      accelHistory.current.push(r.accelMag);
      setHistoryTick((t) => t + 1);
    };

    SensorService.startMonitoring();
    return () => {
      SensorService.dispose();
    };
  }, []);

  const toggleMonitoring = useCallback(() => {
    Vibration.vibrate(30);
    Animated.spring(toggleAnim, {
      toValue: monitoring ? 0 : 1,
      useNativeDriver: false,
      tension: 100,
      friction: 7,
    }).start();
    setMonitoring((m) => {
      if (m) SensorService.stopMonitoring();
      else SensorService.startMonitoring();
      return !m;
    });
  }, [monitoring, toggleAnim]);

  const cancelEmergency = useCallback(() => {
    Vibration.vibrate(40);
    setEmergency(false);
  }, []);

  const callEmergency = useCallback(async () => {
    setEmergency(false);
    // Adjust number for your country: 911, 999, 000, etc.
    const url = 'tel:112';
    const can = await Linking.canOpenURL(url);
    if (can) Linking.openURL(url);
  }, []);

  const simulateCrash = useCallback(() => {
    Vibration.vibrate([0, 200, 100, 400]);
    setEmergency(true);
  }, []);

  // Toggle knob position
  const knobTranslate = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 29],
  });

  const toggleBg = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.08)', 'rgba(34,197,94,0.18)'],
  });

  const toggleBorder = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.2)', '#22C55E'],
  });

  const knobColor = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.3)', '#22C55E'],
  });

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>SafeGuard</Text>
            <Text style={styles.appSub}>Crash & Fall Detection</Text>
          </View>
          {/* Toggle */}
          <TouchableOpacity onPress={toggleMonitoring} activeOpacity={0.85}>
            <Animated.View style={[styles.toggle, {backgroundColor: toggleBg, borderColor: toggleBorder}]}>
              <Animated.View style={[styles.knob, {transform: [{translateX: knobTranslate}], backgroundColor: knobColor}]} />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* ── Status card ── */}
        <View style={[styles.card, monitoring ? styles.cardGreen : styles.cardDim]}>
          <View style={styles.statusRow}>
            <Animated.View style={[
              styles.statusDot,
              {
                backgroundColor: monitoring ? '#22C55E' : 'rgba(255,255,255,0.25)',
                opacity: monitoring ? pulseAnim : 0.3,
                shadowColor: '#22C55E',
                shadowOpacity: monitoring ? 0.7 : 0,
                shadowRadius: 8,
              },
            ]} />
            <View style={styles.statusText}>
              <Text style={[styles.statusTitle, {color: monitoring ? '#22C55E' : 'rgba(255,255,255,0.4)'}]}>
                {monitoring ? 'MONITORING ACTIVE' : 'MONITORING PAUSED'}
              </Text>
              <Text style={styles.statusBody}>
                {monitoring
                  ? 'Watching for sudden impacts and falls'
                  : 'Tap the toggle to resume protection'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Accelerometer ── */}
        <View style={styles.card}>
          <Text style={[styles.sectionLabel, {color: '#3B82F6'}]}>ACCELEROMETER</Text>
          <View style={styles.sectionBody}>
            <SensorGauge label="X Axis" value={readings.ax} maxValue={30} color="#3B82F6" unit=" m/s²" />
            <SensorGauge label="Y Axis" value={readings.ay} maxValue={30} color="#3B82F6" unit=" m/s²" />
            <SensorGauge label="Z Axis" value={readings.az} maxValue={30} color="#3B82F6" unit=" m/s²" />
          </View>
          <Text style={[styles.sectionLabel, {color: '#8B5CF6', marginTop: 16}]}>GYROSCOPE</Text>
          <View style={styles.sectionBody}>
            <SensorGauge label="Roll" value={readings.gx} maxValue={10} color="#8B5CF6" unit=" rad/s" />
            <SensorGauge label="Pitch" value={readings.gy} maxValue={10} color="#8B5CF6" unit=" rad/s" />
            <SensorGauge label="Yaw" value={readings.gz} maxValue={10} color="#8B5CF6" unit=" rad/s" />
          </View>
        </View>

        {/* ── Radar ── */}
        <View style={styles.card}>
          <View style={styles.radarRow}>
            <RadarWidget accelMag={readings.accelMag} gyroMag={readings.gyroMag} />
            <View style={styles.radarInfo}>
              <Text style={styles.sectionLabel}>MOTION RADAR</Text>
              <View style={{marginTop: 14}}>
                <MagRow label="Accel" value={readings.accelMag} max={30} color="#3B82F6" />
                <View style={{height: 12}} />
                <MagRow label="Gyro" value={readings.gyroMag} max={10} color="#8B5CF6" />
              </View>
              <View style={{marginTop: 14}}>
                <ThresholdRow label="Impact at" value="≥ 25 m/s²" />
                <ThresholdRow label="Spin at" value="≥ 8 rad/s" />
              </View>
            </View>
          </View>
        </View>

        {/* ── Sparkline ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ACCELERATION HISTORY</Text>
          <View style={{marginTop: 14}}>
            <Sparkline values={[...accelHistory.current]} width={contentWidth} />
          </View>
          <View style={styles.sparkLabels}>
            <Text style={styles.sparkLabelText}>30s ago</Text>
            <Text style={styles.sparkLabelText}>now</Text>
          </View>
        </View>

        {/* ── Simulate ── */}
        <TouchableOpacity style={styles.simulateBtn} onPress={simulateCrash} activeOpacity={0.75}>
          <Text style={styles.simulateIcon}>⚡</Text>
          <Text style={styles.simulateBtnText}>SIMULATE IMPACT (TEST)</Text>
        </TouchableOpacity>
        <Text style={styles.simulateNote}>For testing only — triggers the emergency overlay</Text>

        <View style={{height: 32}} />
      </ScrollView>

      <EmergencyOverlay
        visible={emergency}
        onCancel={cancelEmergency}
        onCallNow={callEmergency}
      />
    </View>
  );
}

// ─── Small sub-components ────────────────────────────────────────────────────

function MagRow({label, value, max, color}) {
  const pct = Math.min(value / max, 1);
  return (
    <View>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
        <Text style={{color: 'rgba(255,255,255,0.5)', fontSize: 12}}>{label}</Text>
        <Text style={{color, fontSize: 12, fontWeight: '700'}}>{value.toFixed(1)}</Text>
      </View>
      <View style={{height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden'}}>
        <View style={{width: `${pct * 100}%`, height: '100%', borderRadius: 2, backgroundColor: color}} />
      </View>
    </View>
  );
}

function ThresholdRow({label, value}) {
  return (
    <View style={{flexDirection: 'row', marginTop: 4}}>
      <Text style={{color: 'rgba(255,255,255,0.35)', fontSize: 11}}>{label} </Text>
      <Text style={{color: '#EF4444', fontSize: 11, fontWeight: '600'}}>{value}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#080810'},
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 24},

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  appSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },

  toggle: {
    width: 56,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    position: 'absolute',
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    marginBottom: 16,
  },
  cardGreen: {
    borderColor: 'rgba(34,197,94,0.3)',
    backgroundColor: 'rgba(34,197,94,0.06)',
  },
  cardDim: {
    borderColor: 'rgba(255,255,255,0.07)',
  },

  statusRow: {flexDirection: 'row', alignItems: 'center'},
  statusDot: {
    width: 12, height: 12,
    borderRadius: 6,
    marginRight: 14,
    elevation: 4,
  },
  statusText: {flex: 1},
  statusTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  statusBody: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 12,
  },

  sectionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  sectionBody: {marginTop: 14},

  radarRow: {flexDirection: 'row', alignItems: 'center'},
  radarInfo: {flex: 1, marginLeft: 16},

  sparkLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sparkLabelText: {color: 'rgba(255,255,255,0.28)', fontSize: 10},

  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    height: 54,
    backgroundColor: 'rgba(239,68,68,0.09)',
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.38)',
    gap: 8,
  },
  simulateIcon: {fontSize: 18},
  simulateBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.0,
  },
  simulateNote: {
    color: 'rgba(255,255,255,0.22)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});