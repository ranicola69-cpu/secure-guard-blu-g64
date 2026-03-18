import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface DNSPreset {
  provider: string;
  name: string;
  primary: string;
  secondary: string;
  description: string;
}

export default function DNSScreen() {
  const [deviceId, setDeviceId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [presets, setPresets] = useState<DNSPreset[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('cloudflare');
  const [dnsOverHttps, setDnsOverHttps] = useState(true);
  const [customMode, setCustomMode] = useState(false);
  const [customPrimary, setCustomPrimary] = useState('');
  const [customSecondary, setCustomSecondary] = useState('');
  const [currentConfig, setCurrentConfig] = useState<any>(null);

  useEffect(() => {
    initDevice();
  }, []);

  const initDevice = async () => {
    let id = await AsyncStorage.getItem('device_id');
    if (!id) {
      id = `device_${Date.now()}`;
      await AsyncStorage.setItem('device_id', id);
    }
    setDeviceId(id);
    loadPresets();
    loadCurrentConfig(id);
  };

  const loadPresets = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dns/presets`);
      setPresets(response.data);
    } catch (error) {
      console.error('Error loading DNS presets:', error);
    }
  };

  const loadCurrentConfig = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/dns/config/${id}`);
      if (response.data) {
        setCurrentConfig(response.data);
        setSelectedProvider(response.data.provider);
        setDnsOverHttps(response.data.dns_over_https);
      }
    } catch (error) {
      console.error('Error loading DNS config:', error);
    }
  };

  const applyDNSConfig = async (provider: string, primary: string, secondary: string) => {
    try {
      await axios.post(
        `${API_URL}/api/dns/config?device_id=${deviceId}&primary_dns=${primary}&secondary_dns=${secondary}&provider=${provider}&dns_over_https=${dnsOverHttps}`
      );
      Alert.alert('Success', `DNS configured to ${provider === 'custom' ? 'custom servers' : provider}`);
      await loadCurrentConfig(deviceId);
      setCustomMode(false);
    } catch (error) {
      console.error('Error applying DNS config:', error);
      Alert.alert('Error', 'Failed to apply DNS configuration');
    }
  };

  const selectPreset = (preset: DNSPreset) => {
    setSelectedProvider(preset.provider);
    applyDNSConfig(preset.provider, preset.primary, preset.secondary);
  };

  const applyCustomDNS = () => {
    if (!customPrimary || !customSecondary) {
      Alert.alert('Error', 'Please enter both primary and secondary DNS servers');
      return;
    }
    applyDNSConfig('custom', customPrimary, customSecondary);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPresets();
    await loadCurrentConfig(deviceId);
    setRefreshing(false);
  };

  const getProviderIcon = (provider: string) => {
    const icons: { [key: string]: any } = {
      cloudflare: 'cloud',
      google: 'logo-google',
      quad9: 'shield',
      opendns: 'server',
    };
    return icons[provider] || 'globe';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DNS Manager</Text>
        <TouchableOpacity
          style={[styles.dohBadge, dnsOverHttps && styles.dohBadgeActive]}
          onPress={() => setDnsOverHttps(!dnsOverHttps)}
        >
          <Ionicons name={dnsOverHttps ? 'lock-closed' : 'lock-open'} size={14} color={dnsOverHttps ? '#00ff88' : '#999'} />
          <Text style={[styles.dohText, dnsOverHttps && styles.dohTextActive]}>DoH</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff88" />
        }
      >
        {/* Current Config */}
        {currentConfig && (
          <View style={styles.currentCard}>
            <View style={styles.currentHeader}>
              <Text style={styles.currentTitle}>Active Configuration</Text>
              <Ionicons name="checkmark-circle" size={24} color="#00ff88" />
            </View>
            <View style={styles.currentInfo}>
              <View style={styles.currentRow}>
                <Text style={styles.currentLabel}>Provider:</Text>
                <Text style={styles.currentValue}>{currentConfig.provider.toUpperCase()}</Text>
              </View>
              <View style={styles.currentRow}>
                <Text style={styles.currentLabel}>Primary:</Text>
                <Text style={styles.currentValue}>{currentConfig.primary_dns}</Text>
              </View>
              <View style={styles.currentRow}>
                <Text style={styles.currentLabel}>Secondary:</Text>
                <Text style={styles.currentValue}>{currentConfig.secondary_dns}</Text>
              </View>
              <View style={styles.currentRow}>
                <Text style={styles.currentLabel}>DNS over HTTPS:</Text>
                <Text style={styles.currentValue}>{currentConfig.dns_over_https ? 'Enabled' : 'Disabled'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#00aaff" />
          <Text style={styles.infoText}>
            DNS configuration helps improve privacy and security. DNS over HTTPS (DoH) encrypts your DNS queries.
          </Text>
        </View>

        {/* DNS Presets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DNS Providers</Text>
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.provider}
              style={[
                styles.presetCard,
                selectedProvider === preset.provider && styles.presetCardActive,
              ]}
              onPress={() => selectPreset(preset)}
            >
              <View style={styles.presetLeft}>
                <View style={styles.presetIcon}>
                  <Ionicons name={getProviderIcon(preset.provider)} size={28} color="#00ff88" />
                </View>
                <View style={styles.presetInfo}>
                  <Text style={styles.presetName}>{preset.name}</Text>
                  <Text style={styles.presetDesc}>{preset.description}</Text>
                  <View style={styles.presetDNS}>
                    <Text style={styles.presetDNSText}>{preset.primary}</Text>
                    <Text style={styles.presetDNSSeparator}>•</Text>
                    <Text style={styles.presetDNSText}>{preset.secondary}</Text>
                  </View>
                </View>
              </View>
              {selectedProvider === preset.provider && (
                <Ionicons name="checkmark-circle" size={24} color="#00ff88" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom DNS */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.customHeader}
            onPress={() => setCustomMode(!customMode)}
          >
            <Text style={styles.sectionTitle}>Custom DNS</Text>
            <Ionicons
              name={customMode ? 'chevron-up' : 'chevron-down'}
              size={24}
              color="#999"
            />
          </TouchableOpacity>

          {customMode && (
            <View style={styles.customForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Primary DNS Server</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 1.1.1.1"
                  placeholderTextColor="#666"
                  value={customPrimary}
                  onChangeText={setCustomPrimary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Secondary DNS Server</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 1.0.0.1"
                  placeholderTextColor="#666"
                  value={customSecondary}
                  onChangeText={setCustomSecondary}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity style={styles.applyButton} onPress={applyCustomDNS}>
                <Ionicons name="checkmark" size={20} color="#000" />
                <Text style={styles.applyButtonText}>APPLY CUSTOM DNS</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Features</Text>
          <View style={styles.featureCard}>
            <Ionicons name="lock-closed" size={24} color="#00ff88" />
            <View style={styles.featureInfo}>
              <Text style={styles.featureName}>DNS over HTTPS (DoH)</Text>
              <Text style={styles.featureDesc}>Encrypted DNS queries for privacy</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, dnsOverHttps && styles.toggleActive]}
              onPress={() => setDnsOverHttps(!dnsOverHttps)}
            >
              <View style={[styles.toggleThumb, dnsOverHttps && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="shield-checkmark" size={24} color="#00aaff" />
            <View style={styles.featureInfo}>
              <Text style={styles.featureName}>Malware Protection</Text>
              <Text style={styles.featureDesc}>Block malicious domains</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: '#00ff88' }]} />
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="flash" size={24} color="#ff9900" />
            <View style={styles.featureInfo}>
              <Text style={styles.featureName}>Fast DNS Resolution</Text>
              <Text style={styles.featureDesc}>Optimized for speed</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: '#00ff88' }]} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  dohBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  dohBadgeActive: {
    backgroundColor: '#00ff8820',
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  dohText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
  },
  dohTextActive: {
    color: '#00ff88',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  currentCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#00ff88',
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  currentInfo: {
    gap: 12,
  },
  currentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentLabel: {
    fontSize: 13,
    color: '#999',
  },
  currentValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#00aaff20',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#00aaff',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#00aaff',
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  presetCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetCardActive: {
    borderColor: '#00ff88',
  },
  presetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  presetIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetInfo: {
    flex: 1,
    gap: 4,
  },
  presetName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  presetDesc: {
    fontSize: 12,
    color: '#999',
  },
  presetDNS: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  presetDNSText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00ff88',
  },
  presetDNSSeparator: {
    fontSize: 11,
    color: '#666',
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  customForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#fff',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ff88',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  applyButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  featureInfo: {
    flex: 1,
    gap: 4,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  featureDesc: {
    fontSize: 12,
    color: '#999',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#00ff88',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
