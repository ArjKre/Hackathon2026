import React from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {COLORS, SPACING} from '../theme';

const settings = [
  {label: 'Safe Zones', subtitle: 'Manage trusted locations', icon: '📍'},
  {label: 'Alert Settings', subtitle: 'Notifications & thresholds', icon: '🔔'},
  {label: 'Emergency Contacts', subtitle: '3 contacts saved', icon: '👥'},
  {label: 'Share Location', subtitle: 'With trusted contacts', icon: '📤'},
  {label: 'Journey Log', subtitle: 'View past routes', icon: '🛣️'},
];

export default function ProfileScreen() {
  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* 4.2 Avatar Block */}
        <View style={styles.avatarBlock}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarInitial}>H</Text>
          </View>
          <Text style={styles.userName}>Haidar</Text>
          <Text style={styles.userEmail}>haidar@womensafe.app</Text>
          <View style={styles.zoneBadge}>
            <View style={styles.zoneDot} />
            <Text style={styles.zoneText}>Safe Zone Active</Text>
          </View>
        </View>

        {/* 4.3 Settings Rows */}
        <Text style={styles.sectionLabel}>Settings</Text>
        <View style={styles.settingsList}>
          {settings.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.settingRow, i === settings.length - 1 && styles.lastRow]}
            >
              <View style={styles.settingIconBox}>
                <Text style={styles.settingIcon}>{item.icon}</Text>
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* App info */}
        <Text style={styles.appVersion}>Women Safe · v1.0.0</Text>

        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: COLORS.base},

  scroll: {paddingHorizontal: SPACING.screenPadding, paddingTop: 60},

  avatarBlock: {alignItems: 'center', marginBottom: 36},
  avatarLarge: {
    width: 88, height: 88, borderRadius: 22,
    backgroundColor: COLORS.elevated,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarInitial: {color: COLORS.textPrimary, fontSize: 36, fontWeight: '700'},
  userName: {color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 4},
  userEmail: {color: COLORS.textSecondary, fontSize: 14, marginBottom: 12},
  zoneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${COLORS.safe}18`,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: `${COLORS.safe}44`,
  },
  zoneDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.safe},
  zoneText: {color: COLORS.safe, fontSize: 12, fontWeight: '600'},

  sectionLabel: {
    color: COLORS.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  settingsList: {
    backgroundColor: COLORS.card,
    borderRadius: SPACING.radiusCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lastRow: {borderBottomWidth: 0},
  settingIconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: COLORS.elevated,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  settingIcon: {fontSize: 18},
  settingText: {flex: 1},
  settingLabel: {color: COLORS.textPrimary, fontSize: 15, fontWeight: '600'},
  settingSubtitle: {color: COLORS.textSecondary, fontSize: 12, marginTop: 2},
  chevron: {color: COLORS.textMuted, fontSize: 22},

  appVersion: {
    color: COLORS.textMuted, fontSize: 12,
    textAlign: 'center', marginBottom: 8,
  },
});
