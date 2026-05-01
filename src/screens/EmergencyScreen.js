import React, {useState} from 'react';
import {Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {COLORS, SPACING} from '../theme';
import NavModal from '../components/NavModal';
import NearbyServicesService from '../services/NearbyServicesService';

const contacts = [
  {name: 'Mom', relation: 'Family', phone: '+91 98765 43210'},
  {name: 'Alex', relation: 'Friend', phone: '+91 87654 32109'},
  {name: 'Priya', relation: 'Colleague', phone: '+91 76543 21098'},
];

export default function EmergencyScreen({nearbyServices = []}) {
  const [navFacility, setNavFacility] = useState(null);

  const services = NearbyServicesService.groupTopByType(nearbyServices, 1);

  const call = (number) => Linking.openURL(`tel:${number}`);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* 3.2 Broadcast SOS Banner */}
        <TouchableOpacity style={styles.sosBanner} onPress={() => call('112')}>
          <View style={styles.sosLeft}>
            <Text style={styles.sosIcon}>🚨</Text>
            <View>
              <Text style={styles.sosTitle}>Broadcast SOS</Text>
              <Text style={styles.sosSubtitle}>Notify all nearby emergency services</Text>
            </View>
          </View>
          <Text style={styles.sosArrow}>›</Text>
        </TouchableOpacity>

        {/* 3.3 Emergency Contacts */}
        <Text style={styles.sectionLabel}>Emergency Contacts</Text>
        {contacts.map((c, i) => (
          <View key={i} style={styles.contactRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{c.name[0]}</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{c.name}</Text>
              <Text style={styles.contactRelation}>{c.relation} · {c.phone}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => call(c.phone)}>
              <Text style={styles.callBtnText}>📞 Call</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* 3.4 Nearest Services */}
        <Text style={[styles.sectionLabel, {marginTop: 24}]}>Nearest Services</Text>
        {services.length === 0 && (
          <Text style={styles.loadingText}>Locating nearby services…</Text>
        )}
        {services.map((s, i) => (
          <View key={s.id ?? i} style={styles.serviceCard}>
            <View style={styles.serviceTop}>
              <View style={styles.serviceIconBox}>
                <Text style={styles.serviceIconText}>{s.icon}</Text>
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceType}>{s.type}</Text>
                <Text style={styles.serviceName}>{s.name}</Text>
                {!!s.address && <Text style={styles.serviceAddress}>{s.address}</Text>}
              </View>
            </View>
            <View style={styles.serviceActions}>
              <TouchableOpacity
                style={styles.navigateBtn}
                onPress={() => s.lat
                  ? Linking.openURL(`https://maps.google.com/?q=${s.lat},${s.lon}`)
                  : setNavFacility(s)
                }
              >
                <Text style={styles.navigateBtnText}>
                  🧭  Navigate · {s.dist} · {s.time}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.emergencyCallBtn}
                onPress={() => call(s.phone)}
              >
                <Text style={styles.emergencyCallBtnText}>📞 {s.phone}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{height: 100}} />
      </ScrollView>

      <NavModal
        visible={!!navFacility}
        facility={navFacility}
        onDismiss={() => setNavFacility(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#130f0f'},
  scroll: {paddingHorizontal: SPACING.screenPadding, paddingTop: 60},

  sosBanner: {
    backgroundColor: `${COLORS.unsafe}18`,
    borderColor: COLORS.unsafe,
    borderWidth: 1,
    borderRadius: SPACING.radiusCard,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    shadowColor: COLORS.unsafe,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  sosLeft: {flexDirection: 'row', alignItems: 'center', flex: 1},
  sosIcon: {fontSize: 28, marginRight: 14},
  sosTitle: {color: COLORS.textPrimary, fontSize: 17, fontWeight: '700'},
  sosSubtitle: {color: COLORS.textSecondary, fontSize: 13, marginTop: 2},
  sosArrow: {color: COLORS.unsafe, fontSize: 28, fontWeight: '300'},

  sectionLabel: {
    color: COLORS.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  loadingText: {color: COLORS.textMuted, fontSize: 13, marginBottom: 16, paddingVertical: 8},

  contactRow: {
    backgroundColor: COLORS.card,
    borderRadius: SPACING.radiusCard,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.elevated,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {color: COLORS.textPrimary, fontWeight: '700', fontSize: 16},
  contactInfo: {flex: 1, marginLeft: 12},
  contactName: {color: COLORS.textPrimary, fontWeight: '600', fontSize: 15},
  contactRelation: {color: COLORS.textSecondary, fontSize: 12, marginTop: 2},
  callBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: `${COLORS.safe}18`,
    borderWidth: 1,
    borderColor: `${COLORS.safe}44`,
  },
  callBtnText: {color: COLORS.safe, fontSize: 13, fontWeight: '600'},

  serviceCard: {
    backgroundColor: COLORS.card,
    borderRadius: SPACING.radiusLarge,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  serviceTop: {flexDirection: 'row', marginBottom: 14},
  serviceIconBox: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: COLORS.elevated,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  serviceIconText: {fontSize: 22},
  serviceInfo: {flex: 1},
  serviceType: {
    color: COLORS.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3,
  },
  serviceName: {color: COLORS.textPrimary, fontWeight: '700', fontSize: 15},
  serviceAddress: {color: COLORS.textSecondary, fontSize: 12, marginTop: 2},
  serviceActions: {flexDirection: 'row', gap: 8},
  navigateBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: `${COLORS.safe}18`,
    borderWidth: 1,
    borderColor: `${COLORS.safe}44`,
    alignItems: 'center',
  },
  navigateBtnText: {color: COLORS.safe, fontSize: 12, fontWeight: '700'},
  emergencyCallBtn: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: `${COLORS.unsafe}18`,
    borderWidth: 1,
    borderColor: `${COLORS.unsafe}44`,
    alignItems: 'center',
  },
  emergencyCallBtnText: {color: COLORS.unsafe, fontSize: 12, fontWeight: '700'},
});
