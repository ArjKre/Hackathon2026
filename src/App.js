import {StatusBar} from 'expo-status-bar';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, BackHandler, StyleSheet, View, Vibration, Linking, NativeModules, NativeEventEmitter, Platform} from 'react-native';
import HomeScreen from './screens/HomeScreen';
import HeatmapScreen from './screens/HeatmapScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import ProfileScreen from './screens/ProfileScreen';
import FloatingNavbar from './components/FloatingNavbar';
import EmergencyOverlay from './components/EmergencyOverlay';
import {COLORS, ZONES} from './theme';
import LocationService from './services/LocationService';
import RiskService from './services/RiskService';
import SensorService from './services/SensorService';
import AIService from './services/AIService';
import NearbyServicesService from './services/NearbyServicesService';
import * as ExpoLocation from 'expo-location';

const LOCATION_POLL_MS = 30_000;

function applyResult(result, {setZone, setScore, setRiskLabel, setCrimeRate}) {
  if (!result) return;
  setZone(result.zone);
  setScore(result.score);
  setRiskLabel(result.risk_label);
  setCrimeRate(result.crimeRate);
}

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [zone, setZone] = useState(ZONES.SAFE);
  const [score, setScore] = useState(82);
  const [locationName, setLocationName] = useState('Locating…');
  const [riskLabel, setRiskLabel] = useState('low');
  const [crimeRate, setCrimeRate] = useState(0);
  const [simulatedArea, setSimulatedArea] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiScore, setAiScore] = useState(null);
  const [aiAlertLevel, setAiAlertLevel] = useState('none');
  const [silentAlertActive, setSilentAlertActive] = useState(false);
  const [nearbyServices, setNearbyServices] = useState([]);
  const [emergencyVisible, setEmergencyVisible] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const pendingImpactRef = useRef(false);

  const setters = {setZone, setScore, setRiskLabel, setCrimeRate};

  // Simulate: override all risk state from chosen area
  const handleSimulate = useCallback(async (area) => {
    if (!area) {
      setSimulatedArea(null);
      setNearbyServices([]); // clear so live GPS re-fetches on next poll
      return;
    }
    setSimulatedArea(area);
    setNearbyServices([]); // show loading state immediately
    const result = RiskService.getRiskForArea(area);
    applyResult(result, setters);
    setLocationName(area);
    if (result) {
      const aiResult = await AIService.generateAIInsights({
        riskLabel: result.risk_label,
        staticScore: result.score,
        crimeRate: result.crimeRate,
        hour: new Date().getHours(),
        movementLabel: SensorService.latestReadings.accelMag > 15 ? 'Fast' : 'Steady',
        accelMag: SensorService.latestReadings.accelMag,
        gyroMag: SensorService.latestReadings.gyroMag,
        area: result.area,
      });
      setAiInsight(aiResult.insight);
      setAiSuggestion(aiResult.suggestion);
      setAiAlertLevel(aiResult.alertLevel);
      setAiScore(aiResult.dynamicScore);
      setScore(aiResult.dynamicScore);
    }
    // Police from local CSV — instant
    setNearbyServices(NearbyServicesService.getPoliceStations(result.lat, result.lon, 3));
    // Hospitals + fire stations via Overpass
    NearbyServicesService.fetchNearbyServices(result.lat, result.lon)
      .then(services => { if (services.length) setNearbyServices(services); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function updateRisk() {
      if (simulatedArea) return; // simulation active — skip GPS

      const pos = await LocationService.getCurrentPosition();
      if (!pos) return;

      const result = RiskService.getRiskForLocation(pos.latitude, pos.longitude);
      applyResult(result, setters);

      if (result) {
        const aiResult = await AIService.generateAIInsights({
          riskLabel: result.risk_label,
          staticScore: result.score,
          crimeRate: result.crimeRate,
          hour: new Date().getHours(),
          movementLabel: SensorService.latestReadings.accelMag > 15 ? 'Fast' : 'Steady',
          accelMag: SensorService.latestReadings.accelMag,
          gyroMag: SensorService.latestReadings.gyroMag,
          area: result.area,
        });
        setAiInsight(aiResult.insight);
        setAiSuggestion(aiResult.suggestion);
        setAiAlertLevel(aiResult.alertLevel);
        setAiScore(aiResult.dynamicScore);
        setScore(aiResult.dynamicScore); // AI score drives the ring
      }

      try {
        const [geo] = await ExpoLocation.reverseGeocodeAsync(
          {latitude: pos.latitude, longitude: pos.longitude},
          {useGoogleMaps: false},
        );
        if (geo) {
          const parts = [geo.district || geo.subregion || geo.name, geo.city].filter(Boolean);
          setLocationName(parts.join(', ') || geo.formattedAddress || 'Unknown location');
        }
      } catch {
        // keep previous name on geocode failure
      }

      // Police from local CSV — instant, no network
      setNearbyServices(NearbyServicesService.getPoliceStations(pos.latitude, pos.longitude, 3));
      // Hospitals + fire stations via Overpass — merges in when ready
      NearbyServicesService.fetchNearbyServices(pos.latitude, pos.longitude)
        .then(services => { if (services.length) setNearbyServices(services); })
        .catch(() => {});
    }

    updateRisk();
    const interval = setInterval(updateRisk, LOCATION_POLL_MS);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulatedArea]);

  useEffect(() => {
    if (aiAlertLevel === 'high' && zone === ZONES.UNSAFE) {
      setSilentAlertActive(true);
    }
  }, [aiAlertLevel, zone]);

  const handleAppStateChange = useCallback((nextAppState) => {
    console.log('[APP STATE]', `${appStateRef.current} → ${nextAppState}`);
    
    if (nextAppState === 'active') {
      // App is returning to foreground - restart sensor monitoring
      console.log('[SENSOR] App returned to foreground - restarting monitoring');
      SensorService.startMonitoring();
      
      if (pendingImpactRef.current) {
        // App is coming back to foreground and there's a pending impact
        console.log('[IMPACT] App returned to foreground - showing pending EmergencyOverlay');
        setEmergencyVisible(true);
        Vibration.vibrate([0, 500, 200, 500]);
        pendingImpactRef.current = false;
      }
    } else if (nextAppState.match(/inactive|background/)) {
      // App is going to background - keep monitoring (native module will handle it)
      console.log('[SENSOR] App going to background - monitoring continues');
    }
    
    appStateRef.current = nextAppState;
  }, []);

  // Impact detection & emergency monitoring in background
  useEffect(() => {
    const handleImpact = () => {
      console.log('[IMPACT DETECTED]', new Date().toISOString());
      pendingImpactRef.current = true;
      // If app is in foreground, show overlay immediately
      if (appStateRef.current === 'active') {
        console.log('[IMPACT] App is active - showing EmergencyOverlay');
        setEmergencyVisible(true);
        Vibration.vibrate([0, 500, 200, 500]);
      } else {
        // App is backgrounded, will show overlay when it comes back to foreground
        console.log('[IMPACT] App is backgrounded - stored as pending, will show on foreground');
        Vibration.vibrate([0, 500, 200, 500]);
      }
    };

    // Start React Native sensor monitoring
    console.log('[SENSOR] Starting monitoring...');
    SensorService.startMonitoring();
    console.log('[SENSOR] Monitoring started');
    SensorService.onImpactDetected = handleImpact;

    // Start Android background sensor service
    if (Platform.OS === 'android') {
      console.log('[ANDROID] Initializing background sensor service');
      const BackgroundSensor = NativeModules.BackgroundSensor;
      if (BackgroundSensor) {
        if (BackgroundSensor.requestOverlayPermission) {
          BackgroundSensor.requestOverlayPermission()
            .then(() => console.log('[ANDROID] Overlay permission request opened'))
            .catch((error) => console.error('[ANDROID] Error requesting overlay permission:', error));
        }

        BackgroundSensor.startBackgroundSensorService()
          .then(() => console.log('[ANDROID] Background sensor service started'))
          .catch((error) => console.error('[ANDROID] Error starting service:', error));
        
        // Listen for background impact events
        const eventEmitter = new NativeEventEmitter(BackgroundSensor);
        const subscription = eventEmitter.addListener('BackgroundImpactDetected', (event) => {
          console.log('[ANDROID IMPACT] Detected from background service:', event);
          handleImpact();
        });

        return () => {
          console.log('[ANDROID] Stopping background sensor service');
          subscription.remove();
          BackgroundSensor.stopBackgroundSensorService()
            .catch((error) => console.error('[ANDROID] Error stopping service:', error));
        };
      }
    }

    // Keep sensors running continuously in background
    return () => {
      console.log('[SENSOR] Cleanup - monitoring continues in background');
    };
  }, []);

  // Monitor app state changes to handle background impacts
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  const handleEmergencyClose = () => {
    setEmergencyVisible(false);
  };

  const handleEmergencyCall = () => {
    setEmergencyVisible(false);
    Linking.openURL('tel:112');
  };

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTab !== 'Home') {
        setActiveTab('Home');
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [activeTab]);

  const getZoneAccent = () => {
    switch (zone) {
      case ZONES.SAFE: return COLORS.safe;
      case ZONES.CAUTION: return COLORS.caution;
      case ZONES.UNSAFE: return COLORS.unsafe;
      default: return COLORS.safe;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.screen, activeTab !== 'Home' && styles.hidden]}>
        <HomeScreen
          zone={zone} score={score} setZone={setZone} setScore={setScore}
          locationName={locationName} riskLabel={riskLabel} crimeRate={crimeRate}
          simulatedArea={simulatedArea} onSimulate={handleSimulate}
          aiInsight={aiInsight} aiSuggestion={aiSuggestion}
          aiScore={aiScore} aiAlertLevel={aiAlertLevel}
          silentAlertActive={silentAlertActive}
          onSilentAlertDismiss={() => setSilentAlertActive(false)}
          nearbyServices={nearbyServices}
          onTriggerEmergency={() => setEmergencyVisible(true)}
        />
      </View>
      <View style={[styles.screen, activeTab !== 'Heatmap' && styles.hidden]}>
        <HeatmapScreen />
      </View>
      <View style={[styles.screen, activeTab !== 'Emergency' && styles.hidden]}>
        <EmergencyScreen nearbyServices={nearbyServices} />
      </View>
      <View style={[styles.screen, activeTab !== 'Profile' && styles.hidden]}>
        <ProfileScreen />
      </View>

      <FloatingNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        zoneAccent={getZoneAccent()}
      />

      <EmergencyOverlay
        visible={emergencyVisible}
        onCancel={handleEmergencyClose}
        onCallNow={handleEmergencyCall}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.base},
  screen: {...StyleSheet.absoluteFillObject},
  hidden: {display: 'none'},
});
