import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import SensorService from '../services/SensorService';
import LocationService from '../services/LocationService';
import EmergencyOverlay from '../components/EmergencyOverlay';
import {COLORS, SPACING, ZONES} from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function HomeScreen({zone, score, setZone, setScore}) {
  const {width} = useWindowDimensions();
  const [emergency, setEmergency] = useState(false);
  const [location, setLocation] = useState('Fazer Town, Bengaluru');
  const [readings, setReadings] = useState({accelMag: 9.81, gyroMag: 0});

  // Animations
  const ringAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scoreCounter = useRef(new Animated.Value(score)).current;
  const [displayScore, setDisplayScore] = useState(score);

  useEffect(() => {
    LocationService.requestPermission();
    SensorService.startMonitoring();
    
    SensorService.onImpactDetected = () => {
      setEmergency(true);
      Vibration.vibrate([0, 500, 200, 500]);
    };

    SensorService.onReadingsUpdated = (r) => {
      setReadings(r);
    };

    return () => SensorService.stopMonitoring();
  }, []);

  // Update animated score
  useEffect(() => {
    Animated.timing(scoreCounter, {
      toValue: score,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    const listener = scoreCounter.addListener(({value}) => {
      setDisplayScore(Math.round(value));
    });

    return () => scoreCounter.removeListener(listener);
  }, [score]);

  // Pulse animation for location dot and unsafe ring
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1, duration: 1000, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 0, duration: 1000, useNativeDriver: true}),
      ])
    ).start();
  }, []);

  const getZoneAccent = () => {
    switch (zone) {
      case ZONES.SAFE: return COLORS.safe;
      case ZONES.CAUTION: return COLORS.caution;
      case ZONES.UNSAFE: return COLORS.unsafe;
      default: return COLORS.safe;
    }
  };

  const accent = getZoneAccent();

  const handleSOS = () => {
    setEmergency(true);
    Vibration.vibrate(100);
  };

  const cycleZone = () => {
    if (zone === ZONES.SAFE) {
      setZone(ZONES.CAUTION);
      setScore(51);
    } else if (zone === ZONES.CAUTION) {
      setZone(ZONES.UNSAFE);
      setScore(22);
    } else {
      setZone(ZONES.SAFE);
      setScore(82);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1.1 Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>WOMEN SAFE</Text>
            <Text style={styles.greeting}>Good evening, Haidar</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <Text style={styles.iconText}>🔔</Text>
              {zone !== ZONES.SAFE && <View style={[styles.badge, {backgroundColor: accent}]} />}
            </TouchableOpacity>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarTextMini}>H</Text>
            </View>
          </View>
        </View>

        {/* 1.2 Location Pill */}
        <View style={styles.locationContainer}>
          <View style={styles.locationPill}>
            <Animated.View style={[styles.pulseDot, {backgroundColor: COLORS.safe, opacity: pulseAnim}]} />
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>{location} • Live</Text>
          </View>
        </View>

        {/* 1.3 Score Ring */}
        <View style={styles.scoreContainer}>
          <View style={styles.scoreRingWrapper}>
            {zone === ZONES.UNSAFE && (
              <Animated.View style={[styles.pulseRing, {borderColor: accent, transform: [{scale: pulseAnim.interpolate({inputRange: [0, 1], outputRange: [1, 1.4]})}, ], opacity: pulseAnim.interpolate({inputRange: [0, 1], outputRange: [0.5, 0]}) }]} />
            )}
            <Svg width="180" height="180" viewBox="0 0 100 100">
              <Circle
                cx="50" cy="50" r="45"
                stroke={COLORS.border}
                strokeWidth="8"
                fill="none"
              />
              <Circle
                cx="50" cy="50" r="45"
                stroke={accent}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(displayScore / 100) * 283} 283`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </Svg>
            <View style={styles.scoreCenter}>
              <Text style={[styles.scoreNumber, {color: COLORS.textPrimary}]}>{displayScore}</Text>
              <Text style={[styles.zoneLabel, {color: accent}]}>{zone.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* 1.4 Score Factors */}
        <View style={styles.factorsCard}>
          <FactorItem label="Risk" value="Low" color={COLORS.safe} />
          <View style={styles.divider} />
          <FactorItem label="Movement" value={readings.accelMag > 15 ? 'Fast' : 'Steady'} color={readings.accelMag > 15 ? COLORS.caution : COLORS.safe} />
          <View style={styles.divider} />
          <FactorItem label="Time" value="Night" color={COLORS.caution} />
          <View style={styles.divider} />
          <FactorItem label="Crime" value="2.4%" color={COLORS.safe} />
        </View>

        {/* 1.5 Alert Banner */}
        {zone !== ZONES.SAFE && (
          <View style={[styles.alertBanner, {backgroundColor: `${accent}22`, borderColor: accent}]}>
            <Text style={styles.alertIcon}>{zone === ZONES.UNSAFE ? '⚠️' : 'ℹ️'}</Text>
            <View style={{flex: 1}}>
              <Text style={[styles.alertTitle, {color: accent}]}>
                {zone === ZONES.UNSAFE ? 'High Risk Area Detected' : 'Increased Caution Advised'}
              </Text>
              <Text style={styles.alertDesc}>
                {zone === ZONES.UNSAFE 
                  ? 'Multiple incidents reported nearby. Stay in well-lit areas.' 
                  : 'You are entering a zone with moderate incident history.'}
              </Text>
            </View>
          </View>
        )}

        {/* 1.6 SOS Button */}
        <TouchableOpacity 
          style={[styles.sosButton, {borderColor: accent, backgroundColor: zone === ZONES.UNSAFE ? accent : COLORS.card}]} 
          onPress={handleSOS}
        >
          <Text style={[styles.sosButtonText, {color: zone === ZONES.UNSAFE ? COLORS.base : COLORS.unsafe}]}>
            TRIGGER EMERGENCY SOS
          </Text>
        </TouchableOpacity>

        {/* 1.7 Nearby Services */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Safety Services</Text>
          <View style={[styles.priorityBadge, {backgroundColor: `${accent}22`}]}>
            <Text style={[styles.priorityText, {color: accent}]}>PRIORITY MODE</Text>
          </View>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
          <ServiceCard icon="👮" type="Police" name="Central Station" dist="0.8 km" />
          <ServiceCard icon="🏥" type="Hospital" name="St. Johns" dist="1.2 km" />
          <ServiceCard icon="🚒" type="Fire" name="Station 4" dist="2.5 km" />
        </ScrollView>

        {/* Tweaks for demo */}
        <TouchableOpacity onPress={cycleZone} style={styles.tweakBtn}>
          <Text style={styles.tweakText}>Toggle Zone (Demo: {zone})</Text>
        </TouchableOpacity>

        <View style={{height: 100}} />
      </ScrollView>

      <EmergencyOverlay 
        visible={emergency} 
        onCancel={() => setEmergency(false)} 
        onCallNow={() => {
          setEmergency(false);
          Linking.openURL('tel:112');
        }}
      />
    </View>
  );
}

function FactorItem({label, value, color}) {
  return (
    <View style={styles.factorItem}>
      <Text style={[styles.factorValue, {color}]}>{value}</Text>
      <Text style={styles.factorLabel}>{label}</Text>
    </View>
  );
}

function ServiceCard({icon, type, name, dist}) {
  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceIconContainer}>
        <Text style={styles.serviceIcon}>{icon}</Text>
      </View>
      <Text style={styles.serviceType}>{type}</Text>
      <Text style={styles.serviceName}>{name}</Text>
      <View style={styles.serviceFooter}>
        <Text style={styles.serviceDist}>{dist}</Text>
        <TouchableOpacity style={styles.navBtn}>
          <Text style={styles.navBtnText}>Go</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: COLORS.base},
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: SPACING.screenPadding, paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 24) + 16},
  
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20},
  appName: {color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1},
  greeting: {color: COLORS.textPrimary, fontSize: 18, fontWeight: '700'},
  headerRight: {flexDirection: 'row', alignItems: 'center'},
  iconBtn: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 8},
  iconText: {fontSize: 20},
  badge: {position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4},
  avatarMini: {width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.elevated, alignItems: 'center', justifyContent: 'center'},
  avatarTextMini: {color: COLORS.textPrimary, fontWeight: '700'},

  locationContainer: {alignItems: 'center', marginBottom: 24},
  locationPill: {flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: COLORS.border},
  pulseDot: {width: 8, height: 8, borderRadius: 4, marginRight: 8},
  locationIcon: {fontSize: 14, marginRight: 4},
  locationText: {color: COLORS.textPrimary, fontSize: 13, fontWeight: '600'},

  scoreContainer: {alignItems: 'center', marginBottom: 32},
  scoreRingWrapper: {width: 180, height: 180, alignItems: 'center', justifyContent: 'center'},
  scoreCenter: {position: 'absolute', alignItems: 'center'},
  scoreNumber: {fontSize: 48, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'},
  zoneLabel: {fontSize: 12, fontWeight: '700', letterSpacing: 2, marginTop: -4},
  pulseRing: {position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 2},

  factorsCard: {flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: SPACING.radiusCard, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border},
  factorItem: {flex: 1, alignItems: 'center'},
  factorValue: {fontSize: 14, fontWeight: '700', marginBottom: 4},
  factorLabel: {fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase'},
  divider: {width: 1, height: '100%', backgroundColor: COLORS.border},

  alertBanner: {flexDirection: 'row', padding: 16, borderRadius: SPACING.radiusCard, borderWidth: 1, marginBottom: 24},
  alertIcon: {fontSize: 20, marginRight: 12},
  alertTitle: {fontSize: 15, fontWeight: '700', marginBottom: 4},
  alertDesc: {color: COLORS.textSecondary, fontSize: 13, lineHeight: 18},

  sosButton: {height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 32},
  sosButtonText: {fontSize: 14, fontWeight: '800', letterSpacing: 1},

  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  sectionTitle: {color: COLORS.textPrimary, fontSize: 16, fontWeight: '700'},
  priorityBadge: {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4},
  priorityText: {fontSize: 10, fontWeight: '800'},

  servicesScroll: {marginHorizontal: -SPACING.screenPadding, paddingLeft: SPACING.screenPadding},
  serviceCard: {width: 160, backgroundColor: COLORS.card, borderRadius: SPACING.radiusCard, padding: 16, marginRight: 12, borderWidth: 1, borderColor: COLORS.border},
  serviceIconContainer: {width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.elevated, alignItems: 'center', justifyContent: 'center', marginBottom: 12},
  serviceIcon: {fontSize: 20},
  serviceType: {color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4},
  serviceName: {color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 12},
  serviceFooter: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  serviceDist: {color: COLORS.textSecondary, fontSize: 12},
  navBtn: {backgroundColor: `${COLORS.safe}22`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100},
  navBtnText: {color: COLORS.safe, fontSize: 12, fontWeight: '700'},

  tweakBtn: {marginTop: 20, padding: 10, alignItems: 'center'},
  tweakText: {color: COLORS.textMuted, fontSize: 12},
});
