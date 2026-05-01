import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Dimensions,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {Circle, Line, Path} from 'react-native-svg';
import {COLORS, SPACING} from '../theme';

const {height: SCREEN_H} = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.52;

export default function NavModal({visible, facility, onDismiss}) {
  const slideAnim = useRef(new Animated.Value(SHEET_H)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : SHEET_H,
      duration: 340,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const handleNavigate = () => {
    if (facility?.coords) {
      const {lat, lng} = facility.coords;
      Linking.openURL(`https://maps.google.com/?daddr=${lat},${lng}`);
    }
    onDismiss();
  };

  if (!visible && !facility) return null;

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />
        <Animated.View style={[styles.sheet, {transform: [{translateY: slideAnim}]}]}>
          <View style={styles.dragHandle} />

          {/* Fake map with SVG route */}
          <View style={styles.fakeMap}>
            <Svg width="100%" height="100%" viewBox="0 0 320 160">
              {/* Grid lines */}
              {[40, 80, 120].map(y => (
                <Line key={y} x1="0" y1={y} x2="320" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              ))}
              {[80, 160, 240].map(x => (
                <Line key={x} x1={x} y1="0" x2={x} y2="160" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              ))}
              {/* Route path */}
              <Path
                d="M 40 130 C 60 130, 80 110, 100 90 C 120 70, 140 60, 180 55 C 220 50, 260 55, 280 40"
                stroke={COLORS.safe}
                strokeWidth="3"
                strokeDasharray="8 4"
                strokeLinecap="round"
                fill="none"
              />
              {/* Start dot */}
              <Circle cx="40" cy="130" r="7" fill={COLORS.safe} opacity="0.9" />
              <Circle cx="40" cy="130" r="4" fill={COLORS.base} />
              {/* End dot */}
              <Circle cx="280" cy="40" r="9" fill={COLORS.unsafe} opacity="0.9" />
              <Circle cx="280" cy="40" r="5" fill={COLORS.base} />
            </Svg>
            <View style={styles.mapLabel}>
              <Text style={styles.mapLabelText}>📍 {facility?.name ?? 'Destination'}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{facility?.dist ?? '—'}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{facility?.time ?? '—'}</Text>
              <Text style={styles.statLabel}>Est. time</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: COLORS.safe}]}>Open</Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.navBtn} onPress={handleNavigate}>
            <Text style={styles.navBtnText}>Start Navigation →</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)'},
  sheet: {
    height: SHEET_H,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 20,
  },
  fakeMap: {
    height: 160,
    backgroundColor: '#0d1117',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'flex-end',
  },
  mapLabel: {
    position: 'absolute',
    bottom: 10, left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 100,
  },
  mapLabelText: {color: COLORS.textPrimary, fontSize: 12, fontWeight: '600'},
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.elevated,
    borderRadius: SPACING.radiusCard,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {flex: 1, alignItems: 'center'},
  statValue: {color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 4},
  statLabel: {color: COLORS.textMuted, fontSize: 11, textTransform: 'uppercase'},
  statDivider: {width: 1, backgroundColor: COLORS.border},
  navBtn: {
    backgroundColor: COLORS.safe,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {color: COLORS.base, fontSize: 16, fontWeight: '800', letterSpacing: 0.5},
});
