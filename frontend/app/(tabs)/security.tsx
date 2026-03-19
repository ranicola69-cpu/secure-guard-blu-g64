import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Switch,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DonateButton from '../../components/DonateButton';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SecurityScreen() {
  const [deviceId, setDeviceId] = useState('');
  const [securityStatus, setSecurityStatus] = useState({
    security_score: 100,
    threats_active: 0,
    status: 'secure',
  });
  const [scanning, setScanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [threats, setThreats] = useState([]);
  const [enterpriseThreats, setEnterpriseThreats] = useState([]);
  const [showScanOptions, setShowScanOptions] = useState(false);
  const [scanType, setScanType] = useState('full');
  const [showEnterprise, setShowEnterprise] = useState(false);
  const [networkScanning, setNetworkScanning] = useState(false);

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
    loadSecurityStatus(id);
    loadThreats(id);
    loadEnterpriseThreats();
  };

  const loadSecurityStatus = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/security/status/${id}`);
      setSecurityStatus(response.data);
    } catch (error) {
      console.error('Error loading security status:', error);
    }
  };

  const loadThreats = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/threats/${id}`);
      setThreats(response.data);
    } catch (error) {
      console.error('Error loading threats:', error);
    }
  };

  const loadEnterpriseThreats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/security/enterprise-threats`);
      setEnterpriseThreats(response.data);
    } catch (error) {
      console.error('Error loading enterprise threats:', error);
    }
  };

  const performScan = async (type: string = 'full') => {
    setScanning(true);
    setShowScanOptions(false);
    try {
      await axios.post(`${API_URL}/api/security/scan?device_id=${deviceId}&scan_type=${type}`);
      await loadSecurityStatus(deviceId);
      await loadThreats(deviceId);
      Alert.alert('Scan Complete', `${type === 'enterprise' ? 'Enterprise' : 'Full'} scan completed successfully`);
    } catch (error) {
      console.error('Error performing scan:', error);
      Alert.alert('Error', 'Failed to perform scan');
    }
    setScanning(false);
  };

  const removeThreat = async (threat: any) => {
    Alert.alert(
      'Remove Threat',
      `Remove ${threat.app_name}?\n\nThis will uninstall the app using Shizuku.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.post(
                `${API_URL}/api/security/remove-threat?device_id=${deviceId}&threat_id=${threat.id || ''}&package_name=${threat.package_name}`
              );
              Alert.alert('Success', `${threat.app_name} removed successfully`);
              await loadEnterpriseThreats();
              await loadThreats(deviceId);
            } catch (error) {
              console.error('Error removing threat:', error);
              Alert.alert('Error', 'Failed to remove threat. Ensure Shizuku is running.');
            }
          },
        },
      ]
    );
  };

  const updateDatabase = async () => {
    Alert.alert('Update Threat Database', 'Download latest threat definitions?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update',
        onPress: async () => {
          try {
            const response = await axios.post(`${API_URL}/api/security/update-database`);
            Alert.alert(
              'Database Updated',
              `Added: ${response.data.threats_added} threats\nUpdated: ${response.data.threats_updated} definitions\nVersion: ${response.data.database_version}`
            );
            await loadEnterpriseThreats();
          } catch (error) {
            Alert.alert('Error', 'Failed to update database');
          }
        },
      },
    ]);
  };

  const scanNetwork = async (type: 'wifi' | 'cellular') => {
    setNetworkScanning(true);
    try {
      const endpoint = type === 'wifi' ? '/api/security/wifi-scan' : '/api/security/cellular-scan';
      const response = await axios.post(`${API_URL}${endpoint}?device_id=${deviceId}`);
      const data = response.data;
      
      Alert.alert(
        `${type === 'wifi' ? 'WiFi' : 'Cellular'} Security Scan`,
        `Security Score: ${data.security_score}/100\n\nVulnerabilities: ${data.vulnerabilities.length}\n\n${data.vulnerabilities.map((v: any) => `• ${v.type} (${v.severity})`).join('\n')}\n\nRecommendations:\n${data.recommendations.join('\n')}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to scan network');
    }
    setNetworkScanning(false);
  };

  const performAdvancedScan = async (type: 'redhat' | 'blackhat') => {
    setScanning(true);
    try {
      const endpoint = type === 'redhat' ? '/api/security/redhat-scan' : '/api/security/blackhat-scan';
      const response = await axios.post(`${API_URL}${endpoint}?device_id=${deviceId}`);
      const data = response.data;
      
      const findings = data.findings || data.finding || [];
      Alert.alert(
        `${type === 'redhat' ? 'Red Hat' : 'Black Hat'} Scan`,
        `${type === 'redhat' ? 'Ethical Security Analysis' : 'Penetration Testing'}\n\nScore: ${data.security_score || data.risk_level}/100\nFindings: ${findings.length}\n\n${findings.slice(0, 3).map((f: any) => `• ${f.category || f.attack_vector}: ${f.severity}`).join('\n')}`,
        [{ text: 'View Details', onPress: () => console.log(data) }, { text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to perform scan');
    }
    setScanning(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSecurityStatus(deviceId);
    await loadThreats(deviceId);
    await loadEnterpriseThreats();
    setRefreshing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#00ff88';
    if (score >= 70) return '#ffaa00';
    return '#ff3366';
  };

  const getStatusText = () => {
    if (securityStatus.status === 'secure') return 'SECURE';
    return 'THREATS DETECTED';
  };

  const getThreatLevelColor = (level: string) => {
    const colors: { [key: string]: string } = {
      critical: '#ff0044',
      high: '#ff3366',
      medium: '#ffaa00',
      low: '#ffcc00',
    };
    return colors[level] || '#999';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Security Dashboard</Text>
        <View style={styles.headerActions}>
          <DonateButton />
          <TouchableOpacity 
            style={styles.enterpriseButton}
            onPress={() => setShowEnterprise(!showEnterprise)}
          >
            <Ionicons name="business" size={20} color="#ff3366" />
            <Text style={styles.enterpriseBadge}>{enterpriseThreats.length}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff88" />
        }
      >
        {/* Security Score Circle */}
        <View style={styles.scoreContainer}>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(securityStatus.security_score) }]}>
            <Text style={[styles.scoreNumber, { color: getScoreColor(securityStatus.security_score) }]}>
              {securityStatus.security_score}
            </Text>
            <Text style={styles.scoreLabel}>Security Score</Text>
          </View>
          <View style={styles.statusBadge}>
            <Ionicons
              name={securityStatus.status === 'secure' ? 'shield-checkmark' : 'warning'}
              size={20}
              color={securityStatus.status === 'secure' ? '#00ff88' : '#ff3366'}
            />
            <Text
              style={[
                styles.statusText,
                { color: securityStatus.status === 'secure' ? '#00ff88' : '#ff3366' },
              ]}
            >
              {getStatusText()}
            </Text>
          </View>
        </View>

        {/* Scan Buttons */}
        <View style={styles.scanButtons}>
          <TouchableOpacity
            style={[styles.scanButton, scanning && styles.scanButtonActive]}
            onPress={() => performScan('full')}
            disabled={scanning}
          >
            <Ionicons name="scan" size={20} color="#000" />
            <Text style={styles.scanButtonText}>
              {scanning ? 'SCANNING...' : 'FULL SCAN'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.scanButton, styles.scanButtonEnterprise, scanning && styles.scanButtonActive]}
            onPress={() => performScan('enterprise')}
            disabled={scanning}
          >
            <Ionicons name="business" size={20} color="#000" />
            <Text style={styles.scanButtonText}>ENTERPRISE</Text>
          </TouchableOpacity>
        </View>

        {/* Developer Options */}
        <View style={styles.developerCard}>
          <View style={styles.developerHeader}>
            <Ionicons name="code-slash" size={20} color="#00aaff" />
            <Text style={styles.developerTitle}>BLU G64 Developer Scanning</Text>
          </View>
          <Text style={styles.developerDesc}>
            Advanced Shizuku-powered scanning for enterprise spyware, bloatware, and system threats
          </Text>
          <View style={styles.scanOptions}>
            <View style={styles.scanOption}>
              <Text style={styles.scanOptionText}>Scan System Apps</Text>
              <Switch
                value={true}
                trackColor={{ false: '#333', true: '#00ff8840' }}
                thumbColor="#00ff88"
              />
            </View>
            <View style={styles.scanOption}>
              <Text style={styles.scanOptionText}>Deep Cache Analysis</Text>
              <Switch
                value={true}
                trackColor={{ false: '#333', true: '#00ff8840' }}
                thumbColor="#00ff88"
              />
            </View>
          </View>
        </View>

        {/* Enterprise Threats Section */}
        {showEnterprise && enterpriseThreats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Enterprise Threats Detected</Text>
              <View style={styles.criticalBadge}>
                <Text style={styles.criticalText}>CRITICAL</Text>
              </View>
            </View>
            {enterpriseThreats.map((threat: any, index: number) => (
              <View key={index} style={styles.enterpriseThreatCard}>
                <View style={styles.threatCardHeader}>
                  <Ionicons name="warning" size={24} color={getThreatLevelColor(threat.threat_level)} />
                  <View style={styles.threatCardInfo}>
                    <Text style={styles.threatCardName}>{threat.app_name}</Text>
                    <Text style={styles.threatCardPackage}>{threat.package_name}</Text>
                    <View style={styles.threatTags}>
                      <View style={[styles.threatTag, { backgroundColor: getThreatLevelColor(threat.threat_level) + '30' }]}>
                        <Text style={[styles.threatTagText, { color: getThreatLevelColor(threat.threat_level) }]}>
                          {threat.threat_level.toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.threatTag}>
                        <Text style={styles.threatTagText}>{threat.category.replace('_', ' ').toUpperCase()}</Text>
                      </View>
                      {threat.is_system && (
                        <View style={[styles.threatTag, { backgroundColor: '#ff990030' }]}>
                          <Text style={[styles.threatTagText, { color: '#ff9900' }]}>SYSTEM</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <Text style={styles.threatCardDesc}>{threat.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="alert-circle" size={32} color="#ff3366" />
            <Text style={styles.statNumber}>{securityStatus.threats_active}</Text>
            <Text style={styles.statLabel}>Active Threats</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="business" size={32} color="#ff9900" />
            <Text style={styles.statNumber}>{enterpriseThreats.length}</Text>
            <Text style={styles.statLabel}>Enterprise</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="shield-checkmark" size={32} color="#00ff88" />
            <Text style={styles.statNumber}>24/7</Text>
            <Text style={styles.statLabel}>Protection</Text>
          </View>
        </View>

        {/* Security Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Features</Text>
          <View style={styles.featureCard}>
            <View style={styles.featureLeft}>
              <Ionicons name="eye-off" size={24} color="#00ff88" />
              <View style={styles.featureText}>
                <Text style={styles.featureName}>Real-time Protection</Text>
                <Text style={styles.featureDesc}>Active monitoring</Text>
              </View>
            </View>
            <View style={[styles.statusDot, { backgroundColor: '#00ff88' }]} />
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureLeft}>
              <Ionicons name="fingerprint" size={24} color="#00ff88" />
              <View style={styles.featureText}>
                <Text style={styles.featureName}>Shizuku Integration</Text>
                <Text style={styles.featureDesc}>System-level access</Text>
              </View>
            </View>
            <View style={[styles.statusDot, { backgroundColor: '#00ff88' }]} />
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureLeft}>
              <Ionicons name="bug" size={24} color="#00ff88" />
              <View style={styles.featureText}>
                <Text style={styles.featureName}>Malware Scanner</Text>
                <Text style={styles.featureDesc}>Advanced detection</Text>
              </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  enterpriseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff336620',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#ff3366',
  },
  enterpriseBadge: {
    color: '#ff3366',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  scanButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  scanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ff88',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonEnterprise: {
    backgroundColor: '#ff3366',
  },
  scanButtonActive: {
    opacity: 0.7,
  },
  scanButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  developerCard: {
    backgroundColor: '#00aaff20',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#00aaff',
  },
  developerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  developerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00aaff',
  },
  developerDesc: {
    fontSize: 12,
    color: '#00aaff',
    lineHeight: 18,
    marginBottom: 12,
  },
  scanOptions: {
    gap: 8,
  },
  scanOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    padding: 12,
    borderRadius: 8,
  },
  scanOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00aaff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  criticalBadge: {
    backgroundColor: '#ff003320',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff0033',
  },
  criticalText: {
    color: '#ff0033',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  enterpriseThreatCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff3366',
  },
  threatCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  threatCardInfo: {
    flex: 1,
    gap: 4,
  },
  threatCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  threatCardPackage: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
  },
  threatTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  threatTag: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  threatTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 0.5,
  },
  threatCardDesc: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  featureCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  featureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    gap: 4,
  },
  featureName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  featureDesc: {
    fontSize: 12,
    color: '#999',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
