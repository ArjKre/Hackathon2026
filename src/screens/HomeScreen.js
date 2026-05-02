import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import SensorService from '../services/SensorService';
import RiskService from '../services/RiskService';
import NearbyServicesService from '../services/NearbyServicesService';
import EmergencyOverlay from '../components/EmergencyOverlay';
import {COLORS, SPACING, ZONES} from '../theme';

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return {label: 'Morning', color: COLORS.safe};
  if (h >= 12 && h < 17) return {label: 'Afternoon', color: COLORS.safe};
  if (h >= 17 && h < 21) return {label: 'Evening', color: COLORS.caution};
  return {label: 'Night', color: COLORS.caution};
}

const RISK_COLOR = {low: COLORS.safe, medium: COLORS.caution, high: COLORS.unsafe};


export default function HomeScreen({
  zone, score, setZone, setScore,
  locationName, riskLabel = 'low', crimeRate = 0,
  simulatedArea, onSimulate,
  aiInsight = null, aiSuggestion = null, aiScore = null, aiAlertLevel = 'none',
  silentAlertActive = false, onSilentAlertDismiss,
  nearbyServices = [],
}) {
  const {width} = useWindowDimensions();
  const [emergency, setEmergency] = useState(false);
  const [readings, setReadings] = useState({accelMag: 9.81, gyroMag: 0});
  const [simModalVisible, setSimModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scoreCounter = useRef(new Animated.Value(score)).current;
  const [displayScore, setDisplayScore] = useState(score);

  useEffect(() => {
    SensorService.startMonitoring();
    SensorService.onImpactDetected = () => {
      setEmergency(true);
      Vibration.vibrate([0, 500, 200, 500]);
    };
    SensorService.onReadingsUpdated = r => setReadings(r);
    // Keep sensors running continuously - don't stop monitoring
    // Cleanup only needed if we want to reset readings
  }, []);



  useEffect(() => {
    Animated.timing(scoreCounter, {
      toValue: score,
      duration: 1000,
      useNativeDriver: false,
    }).start();
    const listener = scoreCounter.addListener(({value}) => setDisplayScore(Math.round(value)));
    return () => scoreCounter.removeListener(listener);
  }, [score]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1, duration: 1000, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 0, duration: 1000, useNativeDriver: true}),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (silentAlertActive) {
      setEmergency(true);
      onSilentAlertDismiss?.();
    }
  }, [silentAlertActive]);

  const accent = zone === ZONES.SAFE ? COLORS.safe : zone === ZONES.CAUTION ? COLORS.caution : COLORS.unsafe;

  const filteredAreas = RiskService.AREA_LIST.filter(a =>
    a.toLowerCase().includes(search.toLowerCase())
  );

  const handleSimToggle = () => {
    if (simulatedArea) {
      onSimulate(null);
    } else {
      setSearch('');
      setSimModalVisible(true);
    }
  };

  const handleAreaSelect = (area) => {
    setSimModalVisible(false);
    onSimulate(area);
  };

  const handleEmergencyClose = () => {
    setEmergency(false);
    // Sensors continue monitoring in background
  };

  const handleEmergencyCall = () => {
    setEmergency(false);
    Linking.openURL('tel:112');
    // Sensors continue monitoring in background
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>SAFE JOURNEY</Text>
            <Text style={styles.greeting}>Good evening, RIYA</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.simBtn, simulatedArea && {backgroundColor: COLORS.caution + '33', borderColor: COLORS.caution}]}
              onPress={handleSimToggle}
            >
              <Text style={[styles.simBtnText, {color: simulatedArea ? COLORS.caution : COLORS.textSecondary}]}>
                {simulatedArea ? 'SIM ON' : 'SIM'}
              </Text>
            </TouchableOpacity>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarTextMini}>H</Text>
            </View>
          </View>
        </View>

        {/* Location Pill */}
        <View style={styles.locationContainer}>
          <View style={[styles.locationPill, simulatedArea && {borderColor: COLORS.caution}]}>
            <Animated.View style={[styles.pulseDot, {backgroundColor: simulatedArea ? COLORS.caution : COLORS.safe, opacity: pulseAnim}]} />
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>
              {locationName} • {simulatedArea ? 'Simulated' : 'Live'}
            </Text>
          </View>
        </View>

        {/* Score Ring */}
        <View style={styles.scoreContainer}>
          <View style={styles.scoreRingWrapper}>
            {zone === ZONES.UNSAFE && (
              <Animated.View style={[styles.pulseRing, {borderColor: accent, transform: [{scale: pulseAnim.interpolate({inputRange: [0, 1], outputRange: [1, 1.4]})}], opacity: pulseAnim.interpolate({inputRange: [0, 1], outputRange: [0.5, 0]})}]} />
            )}
            <Svg width="180" height="180" viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="45" stroke={COLORS.border} strokeWidth="8" fill="none" />
              <Circle
                cx="50" cy="50" r="45"
                stroke={accent} strokeWidth="8" fill="none"
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

        {/* Score Factors */}
        {(() => {
          const time = getTimeOfDay();
          return (
            <View style={styles.factorsCard}>
              <FactorItem label="Risk" value={riskLabel.charAt(0).toUpperCase() + riskLabel.slice(1)} color={RISK_COLOR[riskLabel] ?? COLORS.safe} />
              <View style={styles.divider} />
              <FactorItem label="Movement" value={readings.accelMag > 15 ? 'Fast' : 'Steady'} color={readings.accelMag > 15 ? COLORS.caution : COLORS.safe} />
              <View style={styles.divider} />
              <FactorItem label="Time" value={time.label} color={time.color} />
              <View style={styles.divider} />
              <FactorItem label="Crime" value={`${crimeRate.toFixed(1)}%`} color={crimeRate > 50 ? COLORS.unsafe : crimeRate > 20 ? COLORS.caution : COLORS.safe} />
            </View>
          );
        })()}

        {/* AI Insight Card */}
        {aiInsight && (() => {
          const aiAccent = aiAlertLevel === 'high' ? COLORS.unsafe
                         : aiAlertLevel === 'medium' ? COLORS.caution
                         : COLORS.safe;
          return (
            <View style={[styles.aiCard, {borderLeftColor: aiAccent}]}>
              <View style={styles.aiCardHeader}>
                <View style={[styles.aiCardBadge, {backgroundColor: aiAccent}]}>
                  <Text style={styles.aiCardBadgeText}>AI</Text>
                </View>
                <Text style={styles.aiCardTitle}>Live Analysis</Text>
              </View>
              <Text style={styles.aiInsightText}>{aiInsight}</Text>
              {aiSuggestion && (
                <View style={styles.aiSuggestionRow}>
                  <Text style={[styles.aiSuggestionArrow, {color: aiAccent}]}>→</Text>
                  <Text style={styles.aiSuggestionText}>{aiSuggestion}</Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* Alert Banner */}
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

        {/* SOS Button */}
        <TouchableOpacity
          style={[styles.sosButton, {borderColor: accent, backgroundColor: zone === ZONES.UNSAFE ? accent : COLORS.card}]}
          onPress={() => { setEmergency(true); Vibration.vibrate(100); }}
        >
          <Text style={[styles.sosButtonText, {color: zone === ZONES.UNSAFE ? COLORS.base : COLORS.unsafe}]}>
            TRIGGER EMERGENCY SOS
          </Text>
        </TouchableOpacity>

        {/* Nearby Services */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Safety Services</Text>
          <View style={[styles.priorityBadge, {backgroundColor: `${accent}22`}]}>
            <Text style={[styles.priorityText, {color: accent}]}>PRIORITY MODE</Text>
          </View>
        </View>
        {nearbyServices.length === 0 ? (
          <View style={styles.servicesLoading}>
            <Text style={styles.servicesLoadingText}>Locating nearby services…</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
            {NearbyServicesService.groupTopByType(nearbyServices, 1).map((s, i) => (
              <ServiceCard key={s.id ?? i} icon={s.icon} type={s.type} name={s.name} dist={s.dist} lat={s.lat} lon={s.lon} />
            ))}
          </ScrollView>
        )}

        <View style={{height: 100}} />
      </ScrollView>

      {/* Simulate Area Picker Modal */}
      <Modal visible={simModalVisible} animationType="slide" transparent onRequestClose={() => setSimModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Simulate Location</Text>
              <TouchableOpacity onPress={() => setSimModalVisible(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search area…"
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            <FlatList
              data={filteredAreas}
              keyExtractor={item => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({item}) => (
                <TouchableOpacity style={styles.areaRow} onPress={() => handleAreaSelect(item)}>
                  <Text style={styles.areaText}>{item}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.areaSep} />}
            />
          </View>
        </View>
      </Modal>

      <EmergencyOverlay
        visible={emergency}
        onCancel={handleEmergencyClose}
        onCallNow={handleEmergencyCall}
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

function ServiceCard({icon, type, name, dist, lat, lon}) {
  const handleGo = () => {
    if (lat && lon) Linking.openURL(`https://maps.google.com/?q=${lat},${lon}`);
  };
  return (
    <TouchableOpacity 
      style={styles.serviceCard} 
      onPress={handleGo}
      activeOpacity={0.7}
    >
      <View style={styles.serviceIconContainer}>
        <Text style={styles.serviceIcon}>{icon}</Text>
      </View>
      <Text style={styles.serviceType}>{type}</Text>
      <Text style={styles.serviceName} numberOfLines={2}>{name}</Text>
      <View style={styles.serviceFooter}>
        <Text style={styles.serviceDist}>{dist}</Text>
        <View style={styles.navBtn}>
          <Text style={styles.navBtnText}>Go</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: COLORS.base},
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: SPACING.screenPadding, paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 24) + 16},

  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20},
  appName: {color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1},
  greeting: {color: COLORS.textPrimary, fontSize: 18, fontWeight: '700'},
  headerRight: {flexDirection: 'row', alignItems: 'center', gap: 8},
  simBtn: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: COLORS.border},
  simBtnText: {fontSize: 11, fontWeight: '800', letterSpacing: 0.5},
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

  aiCard: {backgroundColor: COLORS.card, borderRadius: SPACING.radiusCard, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3},
  aiCardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8},
  aiCardBadge: {paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4},
  aiCardBadgeText: {color: '#000', fontSize: 10, fontWeight: '800', letterSpacing: 0.5},
  aiCardTitle: {color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', flex: 1},
  aiScoreChip: {fontSize: 20, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'},
  aiInsightText: {color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 8},
  aiSuggestionRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 6},
  aiSuggestionArrow: {fontSize: 14, fontWeight: '700', marginTop: 1},
  aiSuggestionText: {color: COLORS.textPrimary, fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18},

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

  servicesLoading: {paddingVertical: 24, alignItems: 'center'},
  servicesLoadingText: {color: COLORS.textMuted, fontSize: 13},
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

  modalOverlay: {flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end'},
  modalSheet: {backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 32},
  modalHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12},
  modalTitle: {color: COLORS.textPrimary, fontSize: 16, fontWeight: '700'},
  modalClose: {padding: 4},
  modalCloseText: {color: COLORS.textSecondary, fontSize: 18},
  searchInput: {marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.elevated, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border},
  areaRow: {paddingHorizontal: 20, paddingVertical: 14},
  areaText: {color: COLORS.textPrimary, fontSize: 14},
  areaSep: {height: 1, backgroundColor: COLORS.border, marginHorizontal: 20},
});
