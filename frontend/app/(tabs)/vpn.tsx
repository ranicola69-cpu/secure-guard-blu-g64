import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface VPNServer {
  id: string;
  country: string;
  city: string;
  server_address: string;
  protocol: string;
  latency: number;
  is_active: boolean;
}

export default function VPNScreen() {
  const [deviceId, setDeviceId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [servers, setServers] = useState<VPNServer[]>([]);
  const [connected, setConnected] = useState(false);
  const [currentConnectionId, setCurrentConnectionId] = useState('');
  const [selectedServer, setSelectedServer] = useState<VPNServer | null>(null);
  const [connecting, setConnecting] = useState(false);

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
    loadServers();
    checkVPNStatus(id);
  };

  const loadServers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/vpn/servers`);
      setServers(response.data);
    } catch (error) {
      console.error('Error loading VPN servers:', error);
    }
  };

  const checkVPNStatus = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/vpn/status/${id}`);
      setConnected(response.data.connected);
      if (response.data.connected) {
        setCurrentConnectionId(response.data.connection_id);
        const server = servers.find((s) => s.id === response.data.server_id);
        if (server) setSelectedServer(server);
      }
    } catch (error) {
      console.error('Error checking VPN status:', error);
    }
  };

  const connectToVPN = async (server: VPNServer) => {
    if (connecting) return;

    setConnecting(true);
    setSelectedServer(server);

    try {
      const response = await axios.post(
        `${API_URL}/api/vpn/connect?device_id=${deviceId}&server_id=${server.id}`
      );
      setConnected(true);
      setCurrentConnectionId(response.data.connection_id);
      Alert.alert('Connected', `Connected to ${server.city}, ${server.country}`);
    } catch (error) {
      console.error('Error connecting to VPN:', error);
      Alert.alert('Error', 'Failed to connect to VPN');
    }

    setConnecting(false);
  };

  const disconnectVPN = async () => {
    if (!currentConnectionId) return;

    setConnecting(true);
    try {
      await axios.post(`${API_URL}/api/vpn/disconnect/${currentConnectionId}`);
      setConnected(false);
      setCurrentConnectionId('');
      setSelectedServer(null);
      Alert.alert('Disconnected', 'VPN connection closed');
    } catch (error) {
      console.error('Error disconnecting VPN:', error);
      Alert.alert('Error', 'Failed to disconnect VPN');
    }
    setConnecting(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServers();
    await checkVPNStatus(deviceId);
    setRefreshing(false);
  };

  const getFlagEmoji = (country: string) => {
    const flags: { [key: string]: string } = {
      USA: '🇺🇸',
      UK: '🇬🇧',
      Germany: '🇩🇪',
      Japan: '🇯🇵',
      Singapore: '🇸🇬',
      Canada: '🇨🇦',
      Australia: '🇦🇺',
    };
    return flags[country] || '🌍';
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return '#00ff88';
    if (latency < 100) return '#ffaa00';
    return '#ff3366';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VPN Service</Text>
        <View style={[styles.statusBadge, connected && styles.statusBadgeConnected]}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: connected ? '#00ff88' : '#666' },
            ]}
          />
          <Text style={styles.statusText}>{connected ? 'CONNECTED' : 'DISCONNECTED'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff88" />
        }
      >
        {/* Connection Card */}
        {connected && selectedServer && (
          <View style={styles.connectionCard}>
            <View style={styles.connectionHeader}>
              <Text style={styles.connectionTitle}>Active Connection</Text>
              <Ionicons name="checkmark-circle" size={24} color="#00ff88" />
            </View>
            <View style={styles.connectionInfo}>
              <Text style={styles.connectionFlag}>{getFlagEmoji(selectedServer.country)}</Text>
              <View style={styles.connectionDetails}>
                <Text style={styles.connectionLocation}>
                  {selectedServer.city}, {selectedServer.country}
                </Text>
                <Text style={styles.connectionServer}>{selectedServer.server_address}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={disconnectVPN}
              disabled={connecting}
            >
              <Ionicons name="power" size={20} color="#000" />
              <Text style={styles.disconnectButtonText}>
                {connecting ? 'DISCONNECTING...' : 'DISCONNECT'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Free Badge */}
        <View style={styles.freeBadge}>
          <Ionicons name="gift" size={20} color="#00ff88" />
          <Text style={styles.freeBadgeText}>Free Worldwide VPN • No Registration Required</Text>
        </View>

        {/* Servers List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Servers ({servers.length})</Text>
          {servers.map((server) => (
            <TouchableOpacity
              key={server.id}
              style={[
                styles.serverCard,
                connected && selectedServer?.id === server.id && styles.serverCardActive,
              ]}
              onPress={() => !connected && connectToVPN(server)}
              disabled={connected || connecting}
            >
              <View style={styles.serverLeft}>
                <Text style={styles.serverFlag}>{getFlagEmoji(server.country)}</Text>
                <View style={styles.serverInfo}>
                  <Text style={styles.serverName}>
                    {server.city}, {server.country}
                  </Text>
                  <Text style={styles.serverAddress}>{server.protocol}</Text>
                </View>
              </View>
              <View style={styles.serverRight}>
                <View
                  style={[
                    styles.latencyBadge,
                    { borderColor: getLatencyColor(server.latency) },
                  ]}
                >
                  <Text style={[styles.latencyText, { color: getLatencyColor(server.latency) }]}>
                    {server.latency}ms
                  </Text>
                </View>
                {connected && selectedServer?.id === server.id ? (
                  <Ionicons name="checkmark-circle" size={24} color="#00ff88" />
                ) : (
                  <Ionicons name="chevron-forward" size={24} color="#666" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="lock-closed" size={24} color="#00aaff" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Military Grade Encryption</Text>
              <Text style={styles.infoDesc}>AES-256 encryption for all traffic</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="eye-off" size={24} color="#00aaff" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>No Logs Policy</Text>
              <Text style={styles.infoDesc}>Your privacy is protected</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="flash" size={24} color="#00aaff" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>High-Speed Servers</Text>
              <Text style={styles.infoDesc}>Optimized for performance</Text>
            </View>
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusBadgeConnected: {
    backgroundColor: '#00ff8820',
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  connectionCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#00ff88',
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  connectionFlag: {
    fontSize: 48,
  },
  connectionDetails: {
    flex: 1,
    gap: 4,
  },
  connectionLocation: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  connectionServer: {
    fontSize: 13,
    color: '#999',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff3366',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  disconnectButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ff8820',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  freeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00ff88',
    flex: 1,
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
  serverCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  serverCardActive: {
    borderWidth: 2,
    borderColor: '#00ff88',
  },
  serverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  serverFlag: {
    fontSize: 32,
  },
  serverInfo: {
    flex: 1,
    gap: 4,
  },
  serverName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  serverAddress: {
    fontSize: 12,
    color: '#999',
  },
  serverRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  latencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  latencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  infoDesc: {
    fontSize: 12,
    color: '#999',
  },
});
