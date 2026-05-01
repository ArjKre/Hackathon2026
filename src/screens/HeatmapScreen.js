import React from 'react';
import {StyleSheet, Text, View, ScrollView} from 'react-native';
import {COLORS, SPACING} from '../theme';

export default function HeatmapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Risk Heatmap</Text>
      <View style={styles.grid}>
        {/* Placeholder for 10x10 grid */}
        {Array.from({length: 100}).map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.cell, 
              {backgroundColor: Math.random() > 0.8 ? COLORS.unsafe : Math.random() > 0.6 ? COLORS.caution : COLORS.safe}
            ]} 
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.base, padding: SPACING.screenPadding, paddingTop: 60},
  title: {color: COLORS.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 20},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cell: {
    width: '10%',
    height: '10%',
    opacity: 0.3,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  }
});
