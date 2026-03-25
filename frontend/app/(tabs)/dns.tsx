import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, TextInput, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = {
  bg: '#0a0a0a', card: '#111', border: '#1e1e1e',
  green: '#00ff88', blue: '#00aaff', text: '#fff', dim: '#999',
};

const DNS_PRESETS = [
  { provider: 'cloudflare', name: 'Cloudflare', primary: '1.1.1.1', secondary: '1.0.0.1', description: 'Privacy-first DNS. Fastest in the world.', icon: 'cloud' },
  { provider: 'google', name: 'Google DNS', primary: '8.8.8.8', secondary: '8.8.4.4', description: 'Reliable and fast public DNS.', icon: 'logo-google' },
  { provider: 'quad9', name: 'Quad9', primary: '9.9.9.9', secondary: '149.112.112.112', description: 'Security-focused with malware blocking.', icon: 'shield-checkmark' },
  { provider: 'opendns', name: 'OpenDNS', primary: '208.67.222.222', secondary: '208.67.220.220', description: 'Cisco OpenDNS with content filtering.', icon: 'server' },
  { provider: 'adguard', name: 'AdGuard DNS', primary: '94.140.14.14', secondary: '94.140.15.15', description: 'Blocks ads and trackers at DNS level.', icon: 'shield' },
];

const DNS_CONFIG_KEY = 'dns_config';

export default function DNSScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('cloudflare');
  const [dnsOverHttps, setDnsOverHttps] = useState(true);
  const [customMode, setCustomMode] = useState(false);
  const [customPrimary, setCustomPrimary] = useState('');
  const [customSecondary, setCustomSecondary] = useState('');
  const [currentConfig, setCurrentConfig] = useState<any>(null);

  useEffect(() => { loadCurrentConfig(); }, []);

  const loadCurrentConfig = async () => {
    try {
      const saved = await AsyncStorage.getItem(DNS_CONFIG_KEY);
      if (saved) {
        const config = JSON.parse(saved);
        setCurrentConfig(config);
        setSelectedProvider(config.provider);
        setDnsOverHttps(config.dns_over_https);
      }
    } catch {}
  };

  const applyDNSConfig = async (provider: string, primary: string, secondary: string) => {
    const config = { provider, primary_dns: primary, secondary_dns: secondary, dns_over_https: dnsOverHttps };
    await AsyncStorage.setItem(DNS_CONFIG_KEY, JSON.stringify(config));
    setCurrentConfig(config);
    setSelectedProvider(provider);
    Alert.alert(
      'DNS Configured',
      `Provider: ${provider.toUpperCase()}\nPrimary: ${primary}\nSecondary: ${secondary}\n\nTo apply on Android:\nSettings > Network & Internet > Private DNS`,
      [{ text: 'OK' }]
    );
  };

  const applyCustomDNS = () => {
    if (!customPrimary || !customSecondary) {
      Alert.alert('Error', 'Please enter both primary and secondary DNS servers');
      return;
    }
    applyDNSConfig('custom', customPrimary, customSecondary);
    setCustomMode(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DNS Manager</Text>
        <TouchableOpacity
          style={[styles.dohBadge, dnsOverHttps && styles.dohBadgeActive]}
          onPress={() => setDnsOverHttps(!dnsOverHttps)}
        >
          <Ionicons name={dnsOverHttps ? 'lock-closed' : 'lock-open'} size={13} color={dnsOverHttps ? C.green : '#666'} />
          <Text style={[styles.dohText, dnsOverHttps && styles.dohTextActive]}>DoH</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadCurrentConfig(); setRefreshing(false); }} tintColor={C.green} />}
      >
        {currentConfig && (
          <View style={styles.currentCard}>
            <View style={styles.currentHeader}>
              <Text style={styles.currentTitle}>Active Configuration</Text>
              <Ionicons name="checkmark-circle" size={22} color={C.green} />
            </View>
            <View style={styles.currentRows}>
              {[
                { label: 'Provider', value: currentConfig.provider?.toUpperCase() },
                { label: 'Primary DNS', value: currentConfig.primary_dns },
                { label: 'Secondary DNS', value: currentConfig.secondary_dns },
                { label: 'DNS over HTTPS', value: currentConfig.dns_over_https ? 'Enabled' : 'Disabled' },
              ].map(({ label, value }) => (
                <View key={label} style={styles.currentRow}>
                  <Text style={styles.currentLabel}>{label}</Text>
                  <Text style={styles.currentValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={C.blue} />
          <Text style={styles.infoText}>
            DNS over HTTPS encrypts your DNS queries preventing ISP surveillance and man-in-the-middle attacks.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DNS PROVIDERS</Text>
          {DNS_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.provider}
              style={[styles.presetCard, selectedProvider === preset.provider && styles.presetCardActive]}
              onPress={() => applyDNSConfig(preset.provider, preset.primary, preset.secondary)}
            >
              <View style={styles.presetIcon}>
                <Ionicons name={preset.icon as any} size={24} color={selectedProvider === preset.provider ? C.green : C.dim} />
              </View>
              <View style={styles.presetInfo}>
                <Text style={styles.presetName}>{preset.name}</Text>
                <Text style={styles.presetDesc}>{preset.description}</Text>
                <View style={styles.presetDnsRow}>
                  <Text style={styles.presetDns}>{preset.primary}</Text>
                  <Text style={styles.presetDnsSep}>•</Text>
                  <Text style={styles.presetDns}>{preset.secondary}</Text>
                </View>
              </View>
              {selectedProvider === preset.provider && (
                <Ionicons name="checkmark-circle" size={22} color={C.green} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.customToggle} onPress={() => setCustomMode(!customMode)}>
            <Text style={styles.sectionTitle}>CUSTOM DNS</Text>
            <Ionicons name={customMode ? 'chevron-up' : 'chevron-down'} size={20} color={C.dim} />
          </TouchableOpacity>
          {customMode && (
            <View style={styles.customForm}>
              {[
                { label: 'Primary DNS Server', value: customPrimary, setter: setCustomPrimary, placeholder: 'e.g., 1.1.1.1' },
                { label: 'Secondary DNS Server', value: customSecondary, setter: setCustomSecondary, placeholder: 'e.g., 1.0.0.1' },
              ].map(({ label, value, setter, placeholder }) => (
                <View key={label} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#555"
                    value={value}
                    onChangeText={setter}
                    keyboardType="numeric"
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.applyBtn} onPress={applyCustomDNS}>
                <Ionicons name="checkmark" size={18} color={C.bg} />
                <Text style={styles.applyBtnText}>APPLY CUSTOM DNS</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HOW TO CONFIGURE ON ANDROID</Text>
          <View style={styles.stepsCard}>
            {[
              'Open Settings on your device',
              'Go to Network & Internet',
              'Tap "Private DNS"',
              'Select "Private DNS provider hostname"',
              'Enter the DoH hostname (e.g., 1dot1dot1dot1.cloudflare-dns.com)',
              'Tap Save',
            ].map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
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
  dohBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#1a1a1a', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#2a2a2a',
  },
  dohBadgeActive: { backgroundColor: '#00ff8810', borderColor: '#00ff8830' },
  dohText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#666', letterSpacing: 0.5 },
  dohTextActive: { color: C.green },
  content: { flex: 1 },
  currentCard: {
    backgroundColor: '#00ff8808', margin: 16, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#00ff8825',
  },
  currentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  currentTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: C.green },
  currentRows: { gap: 8 },
  currentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  currentLabel: { fontSize: 12, color: '#888', fontFamily: 'Inter_400Regular' },
  currentValue: { fontSize: 12, color: C.text, fontFamily: 'Inter_500Medium' },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#00aaff08', marginHorizontal: 16, marginBottom: 20,
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#00aaff25',
  },
  infoText: { flex: 1, fontSize: 12, color: '#aaa', fontFamily: 'Inter_400Regular', lineHeight: 18 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#555', letterSpacing: 1.5, marginBottom: 10 },
  presetCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: C.border, gap: 12,
  },
  presetCardActive: { borderColor: '#00ff8840', backgroundColor: '#00ff8806' },
  presetIcon: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center',
  },
  presetInfo: { flex: 1 },
  presetName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: C.text, marginBottom: 2 },
  presetDesc: { fontSize: 11, color: C.dim, fontFamily: 'Inter_400Regular', marginBottom: 5 },
  presetDnsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  presetDns: { fontSize: 11, color: '#666', fontFamily: 'Inter_400Regular' },
  presetDnsSep: { fontSize: 11, color: '#333' },
  customToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  customForm: { backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 14 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 12, color: C.dim, fontFamily: 'Inter_500Medium' },
  input: {
    backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12,
    color: C.text, fontSize: 14, fontFamily: 'Inter_400Regular',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: C.green, borderRadius: 10, paddingVertical: 12,
  },
  applyBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: C.bg, letterSpacing: 0.5 },
  stepsCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#00ff8820', alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: C.green },
  stepText: { flex: 1, fontSize: 12, color: '#ccc', fontFamily: 'Inter_400Regular' },
});
