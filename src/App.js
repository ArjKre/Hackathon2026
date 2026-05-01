import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import HeatmapScreen from './screens/HeatmapScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import ProfileScreen from './screens/ProfileScreen';
import FloatingNavbar from './components/FloatingNavbar';
import { COLORS, ZONES } from './theme';

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [zone, setZone] = useState(ZONES.SAFE);
  const [score, setScore] = useState(82);

  const getZoneAccent = () => {
    switch (zone) {
      case ZONES.SAFE: return COLORS.safe;
      case ZONES.CAUTION: return COLORS.caution;
      case ZONES.UNSAFE: return COLORS.unsafe;
      default: return COLORS.safe;
    }
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home': return <HomeScreen zone={zone} score={score} setZone={setZone} setScore={setScore} />;
      case 'Heatmap': return <HeatmapScreen />;
      case 'Emergency': return <EmergencyScreen />;
      case 'Profile': return <ProfileScreen />;
      default: return <HomeScreen zone={zone} score={score} setZone={setZone} setScore={setScore} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {renderScreen()}
      <FloatingNavbar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        zoneAccent={getZoneAccent()} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base,
  },
});
