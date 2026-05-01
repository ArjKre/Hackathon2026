import {StatusBar} from 'expo-status-bar';
import React, {useEffect, useState} from 'react';
import {BackHandler, StyleSheet, View} from 'react-native';
import HomeScreen from './screens/HomeScreen';
import HeatmapScreen from './screens/HeatmapScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import ProfileScreen from './screens/ProfileScreen';
import FloatingNavbar from './components/FloatingNavbar';
import {COLORS, ZONES} from './theme';

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [zone, setZone] = useState(ZONES.SAFE);
  const [score, setScore] = useState(82);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTab !== 'Home') {
        setActiveTab('Home');
        return true; // consumed — don't exit app
      }
      return false; // let OS handle (exit app)
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
        <HomeScreen zone={zone} score={score} setZone={setZone} setScore={setScore} />
      </View>
      <View style={[styles.screen, activeTab !== 'Heatmap' && styles.hidden]}>
        <HeatmapScreen />
      </View>
      <View style={[styles.screen, activeTab !== 'Emergency' && styles.hidden]}>
        <EmergencyScreen />
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
