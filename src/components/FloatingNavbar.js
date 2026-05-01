import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View, Platform} from 'react-native';
import {COLORS, SPACING} from '../theme';

export default function FloatingNavbar({activeTab, onTabChange, zoneAccent}) {
  const tabs = [
    {id: 'Home', label: 'Home', icon: '🏠'},
    {id: 'Heatmap', label: 'Heatmap', icon: '🗺️'},
    {id: 'Emergency', label: 'Alert', icon: '🚨'},
    {id: 'Profile', label: 'User', icon: '👤'},
  ];

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                isActive && {backgroundColor: `${zoneAccent}22`, borderColor: zoneAccent},
              ]}
              onPress={() => onTabChange(tab.id)}
            >
              <Text style={[styles.icon, isActive && {color: zoneAccent}]}>{tab.icon}</Text>
              {isActive && (
                <Text style={[styles.label, {color: zoneAccent}]}>{tab.label}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(28, 28, 30, 0.88)',
    padding: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(58, 58, 60, 0.7)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  icon: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  label: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
