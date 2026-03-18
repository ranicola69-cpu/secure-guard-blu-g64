import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const performScan = async () => {
    setScanning(true);
    try {
      await axios.post(`${API_URL}/api/security/scan?device_id=${deviceId}`);
      await loadSecurityStatus(deviceId);
      await loadThreats(deviceId);
    } catch (error) {
      console.error('Error performing scan:', error);
    }
    setScanning(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSecurityStatus(deviceId);
    await loadThreats(deviceId);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Security Dashboard</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color="#999" />
        </TouchableOpacity>
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

        {/* Scan Button */}
        <TouchableOpacity
          style={[styles.scanButton, scanning && styles.scanButtonActive]}
          onPress={performScan}
          disabled={scanning}
        >
          <Ionicons name="scan" size={24} color="#000" />
          <Text style={styles.scanButtonText}>
            {scanning ? 'SCANNING...' : 'SCAN NOW'}
          </Text>
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="alert-circle" size={32} color="#ff3366" />
            <Text style={styles.statNumber}>{securityStatus.threats_active}</Text>
            <Text style={styles.statLabel}>Active Threats</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="shield-checkmark" size={32} color="#00ff88" />
            <Text style={styles.statNumber}>24/7</Text>
            <Text style={styles.statLabel}>Protection</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="lock-closed" size={32} color="#00aaff" />
            <Text style={styles.statNumber}>AES-256</Text>
            <Text style={styles.statLabel}>Encryption</Text>
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

        {/* Recent Threats */}
        {threats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Threats</Text>
            {threats.slice(0, 3).map((threat: any) => (
              <View key={threat.id} style={styles.threatCard}>
                <Ionicons name="alert-circle" size={24} color="#ff3366" />
                <View style={styles.threatInfo}>
                  <Text style={styles.threatType}>{threat.threat_type}</Text>
                  <Text style={styles.threatDesc}>{threat.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
  settingsButton: {
    padding: 8,
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
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ff88',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonActive: {
    opacity: 0.7,
  },
  scanButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
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
  section: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
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
  threatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  threatInfo: {
    flex: 1,
    gap: 4,
  },
  threatType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  threatDesc: {
    fontSize: 12,
    color: '#999',
  },
});
