import React from 'react';
import {StyleSheet, Text, View, TouchableOpacity, ScrollView} from 'react-native';
import {COLORS, SPACING} from '../theme';

export default function EmergencyScreen() {
  const contacts = [
    {name: 'Mom', relation: 'Family', phone: '555-0101'},
    {name: 'Alex', relation: 'Friend', phone: '555-0202'},
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency</Text>
      
      <TouchableOpacity style={styles.sosBanner}>
        <Text style={styles.sosIcon}>🚨</Text>
        <View>
          <Text style={styles.sosTitle}>Broadcast SOS</Text>
          <Text style={styles.sosSubtitle}>Notify all nearby emergency services</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Emergency Contacts</Text>
      {contacts.map((contact, i) => (
        <View key={i} style={styles.contactRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{contact.name[0]}</Text>
          </View>
          <View style={{flex: 1, marginLeft: 12}}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactRelation}>{contact.relation}</Text>
          </View>
          <TouchableOpacity style={styles.callBtn}>
            <Text style={{color: COLORS.safe}}>Call</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#1a1212', padding: SPACING.screenPadding, paddingTop: 60},
  title: {color: COLORS.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 20},
  sosBanner: {
    backgroundColor: `${COLORS.unsafe}22`,
    borderColor: COLORS.unsafe,
    borderWidth: 1,
    borderRadius: SPACING.radiusCard,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sosIcon: {fontSize: 24, marginRight: 16},
  sosTitle: {color: COLORS.textPrimary, fontSize: 18, fontWeight: '700'},
  sosSubtitle: {color: COLORS.textSecondary, fontSize: 13},
  sectionLabel: {color: COLORS.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase'},
  contactRow: {
    backgroundColor: COLORS.card,
    borderRadius: SPACING.radiusCard,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.elevated, alignItems: 'center', justifyContent: 'center'},
  avatarText: {color: COLORS.textPrimary, fontWeight: '700'},
  contactName: {color: COLORS.textPrimary, fontWeight: '600'},
  contactRelation: {color: COLORS.textSecondary, fontSize: 12},
  callBtn: {paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: `${COLORS.safe}11`},
});
