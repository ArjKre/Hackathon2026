import React from 'react';
import {StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import {COLORS, SPACING} from '../theme';

export default function ProfileScreen() {
  const settings = [
    {label: 'Safe Zones', icon: '📍'},
    {label: 'Alert Settings', icon: '🔔'},
    {label: 'Emergency Contacts', icon: '👥'},
    {label: 'Share Location', icon: '📤'},
    {label: 'Journey Log', icon: '🛣️'},
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      
      <View style={styles.avatarBlock}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarTextLarge}>H</Text>
        </View>
        <Text style={styles.userName}>Haidar</Text>
        <Text style={styles.userEmail}>haidar@example.com</Text>
      </View>

      <View style={styles.settingsList}>
        {settings.map((item, i) => (
          <TouchableOpacity key={i} style={styles.settingRow}>
            <Text style={styles.settingIcon}>{item.icon}</Text>
            <Text style={styles.settingLabel}>{item.label}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.base, padding: SPACING.screenPadding, paddingTop: 60},
  title: {color: COLORS.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 20},
  avatarBlock: {alignItems: 'center', marginBottom: 32},
  avatarLarge: {width: 80, height: 80, borderRadius: 20, backgroundColor: COLORS.elevated, alignItems: 'center', justifyContent: 'center', marginBottom: 16},
  avatarTextLarge: {color: COLORS.textPrimary, fontSize: 32, fontWeight: '700'},
  userName: {color: COLORS.textPrimary, fontSize: 20, fontWeight: '700'},
  userEmail: {color: COLORS.textSecondary, fontSize: 14},
  settingsList: {backgroundColor: COLORS.card, borderRadius: SPACING.radiusCard, overflow: 'hidden'},
  settingRow: {flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border},
  settingIcon: {fontSize: 18, marginRight: 12},
  settingLabel: {flex: 1, color: COLORS.textPrimary, fontSize: 16},
  chevron: {color: COLORS.textMuted, fontSize: 20},
});
