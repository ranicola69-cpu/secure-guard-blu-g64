import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shizuku } from '@/modules/ShizukuService';

const C = {
  bg: '#0a0a0a', card: '#111', border: '#1e1e1e',
  green: '#00ff88', blue: '#00aaff', orange: '#ff9500',
  text: '#fff', dim: '#999',
};

export default function DeviceInfoScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [shizukuReady, setShizukuReady] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    brand: '', model: '', osName: '', osVersion: '', deviceType: '', manufacturer: '',
  });
  const [networkInfo, setNetworkInfo] = useState({
    type: 'Unknown', ipAddress: '', isConnected: false,
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    await Promise.all([loadDeviceInfo(), loadNetworkInfo(), checkShizuku()]);
  };

  const checkShizuku = async () => {
    const permission = await Shizuku.checkPermission();
    setShizukuReady(permission);
  };

  const loadDeviceInfo = async () => {
    setDeviceInfo({
      brand: Device.brand || 'Unknown',
      model: Device.modelName || 'Unknown',
      osName: Device.osName || Platform.OS,
      osVersion: Device.osVersion || 'Unknown',
      deviceType: getDeviceTypeLabel(Device.deviceType),
      manufacturer: Device.manufacturer || 'Unknown',
    });
  };

  const getDeviceTypeLabel = (type: Device.DeviceType | null) => {
    switch (type) {
      case Device.DeviceType.PHONE: return 'Phone';
      case Device.DeviceType.TABLET: return 'Tablet';
      case Device.DeviceType.DESKTOP: return 'Desktop';
      case Device.DeviceType.TV: return 'TV';
      default: return 'Unknown';
    }
  };

  const loadNetworkInfo = async () => {
    try {
      const [networkState, ip] = await Promise.all([
        Network.getNetworkStateAsync(),
        Network.getIpAddressAsync().catch(() => 'N/A'),
      ]);
      setNetworkInfo({
        type: networkState.type || 'Unknown',
        ipAddress: ip,
        isConnected: networkState.isConnected ?? false,
      });
    } catch (e) {
      setNetworkInfo({ type: 'Unknown', ipAddress: 'N/A', isConnected: false });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const InfoRow = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, accent ? { color: accent } : {}]}>{value}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Device Info</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color={C.green} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} />}
      >
        {/* Device Card */}
        <View style={styles.deviceHero}>
          <View style={styles.deviceIconContainer}>
            <Ionicons name="phone-portrait" size={48} color={C.green} />
          </View>
          <View style={styles.deviceHeroInfo}>
            <Text style={styles.deviceModel}>{deviceInfo.brand} {deviceInfo.model}</Text>
            <Text style={styles.deviceOs}>{deviceInfo.osName} {deviceInfo.osVersion}</Text>
            <View style={[styles.deviceType]}>
              <Ionicons name="hardware-chip" size={12} color={C.blue} />
              <Text style={styles.deviceTypeText}>{deviceInfo.deviceType}</Text>
            </View>
          </View>
        </View>

        {/* Device Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DEVICE DETAILS</Text>
          <View style={styles.card}>
            <InfoRow label="Brand" value={deviceInfo.brand} />
            <View style={styles.divider} />
            <InfoRow label="Model" value={deviceInfo.model} />
            <View style={styles.divider} />
            <InfoRow label="Manufacturer" value={deviceInfo.manufacturer} />
            <View style={styles.divider} />
            <InfoRow label="OS" value={`${deviceInfo.osName} ${deviceInfo.osVersion}`} />
            <View style={styles.divider} />
            <InfoRow label="Device Type" value={deviceInfo.deviceType} />
            <View style={styles.divider} />
            <InfoRow label="Platform" value={Platform.OS.toUpperCase()} accent={C.blue} />
          </View>
        </View>

        {/* Network Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NETWORK</Text>
          <View style={styles.card}>
            <InfoRow label="Status" value={networkInfo.isConnected ? 'Connected' : 'Disconnected'} accent={networkInfo.isConnected ? C.green : '#ff3366'} />
            <View style={styles.divider} />
            <InfoRow label="Connection Type" value={networkInfo.type} />
            <View style={styles.divider} />
            <InfoRow label="IP Address" value={networkInfo.ipAddress} accent={C.blue} />
          </View>
        </View>

        {/* Shizuku Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ADVANCED ACCESS (SHIZUKU)</Text>
          <View style={[styles.card, { gap: 12 }]}>
            <View style={styles.shizukuStatus}>
              <Ionicons
                name={shizukuReady ? 'checkmark-circle' : 'alert-circle'}
                size={24}
                color={shizukuReady ? C.green : C.orange}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.shizukuStatusText}>
                  {shizukuReady ? 'Shizuku Active' : 'Shizuku Not Available'}
                </Text>
                <Text style={styles.shizukuStatusDesc}>
                  {shizukuReady
                    ? 'Full system access enabled via Shizuku'
                    : 'Install & configure Shizuku for ADB-level access'}
                </Text>
              </View>
            </View>
            {!shizukuReady && !Shizuku.isNativeAvailable && (
              <Text style={styles.shizukuNote}>
                Shizuku native module requires a custom APK build. Use the Security tab to set up Shizuku.
              </Text>
            )}
          </View>
        </View>

        {/* Security Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SECURITY RECOMMENDATIONS</Text>
          <View style={styles.card}>
            {[
              { icon: 'lock-closed', text: 'Enable full-disk encryption', done: true },
              { icon: 'shield-checkmark', text: 'Keep OS updated', done: true },
              { icon: 'apps', text: 'Disable unknown app installs', done: false },
              { icon: 'server', text: 'Configure secure DNS (DoH)', done: false },
              { icon: 'planet', text: 'Use DNS VPN protection', done: false },
            ].map(({ icon, text, done }, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.recRow}>
                  <Ionicons name={icon as any} size={18} color={done ? C.green : C.dim} />
                  <Text style={[styles.recText, { color: done ? '#ccc' : '#888' }]}>{text}</Text>
                  <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={done ? C.green : '#333'} />
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: C.text },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#00ff8815', alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1 },
  deviceHero: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#111', margin: 16, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#1e1e1e',
  },
  deviceIconContainer: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: '#00ff8810', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#00ff8830',
  },
  deviceHeroInfo: { flex: 1 },
  deviceModel: { fontSize: 17, fontFamily: 'Inter_700Bold', color: C.text, marginBottom: 4 },
  deviceOs: { fontSize: 13, color: '#aaa', fontFamily: 'Inter_400Regular', marginBottom: 8 },
  deviceType: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#00aaff10', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, alignSelf: 'flex-start',
  },
  deviceTypeText: { fontSize: 11, color: C.blue, fontFamily: 'Inter_600SemiBold' },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#555', letterSpacing: 1.5, marginBottom: 10 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  infoLabel: { fontSize: 13, color: C.dim, fontFamily: 'Inter_400Regular' },
  infoValue: { fontSize: 13, color: C.text, fontFamily: 'Inter_500Medium' },
  divider: { height: 1, backgroundColor: '#1a1a1a', marginVertical: 10 },
  shizukuStatus: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  shizukuStatusText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: C.text, marginBottom: 2 },
  shizukuStatusDesc: { fontSize: 12, color: C.dim, fontFamily: 'Inter_400Regular' },
  shizukuNote: { fontSize: 11, color: '#555', fontFamily: 'Inter_400Regular', lineHeight: 16 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 2 },
  recText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
});
