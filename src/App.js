import {StatusBar} from 'expo-status-bar';
import React, {useCallback, useEffect, useState} from 'react';
import {BackHandler, StyleSheet, View} from 'react-native';
import HomeScreen from './screens/HomeScreen';
import HeatmapScreen from './screens/HeatmapScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import ProfileScreen from './screens/ProfileScreen';
import FloatingNavbar from './components/FloatingNavbar';
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.base},
  screen: {...StyleSheet.absoluteFillObject},
  hidden: {display: 'none'},
});
