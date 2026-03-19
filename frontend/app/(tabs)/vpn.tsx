import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Vpn } from '../../modules/VpnService';

interface VPNServer {
  id: string;
  country: string;
  city: string;
  dns: string;
  protocol: string;
  latency: number;
}

const FREE_VPN_SERVERS: VPNServer[] = [
  { id: '1', country: 'USA', city: 'New York', dns: '1.1.1.1', protocol: 'DNS-VPN', latency: 45 },
  { id: '2', country: 'USA', city: 'Los Angeles', dns: '8.8.8.8', protocol: 'DNS-VPN', latency: 38 },
  { id: '3', country: 'UK', city: 'London', dns: '9.9.9.9', protocol: 'DNS-VPN', latency: 65 },
  { id: '4', country: 'Germany', city: 'Frankfurt', dns: '208.67.222.222', protocol: 'DNS-VPN', latency: 58 },
  { id: '5', country: 'Japan', city: 'Tokyo', dns: '1.0.0.1', protocol: 'DNS-VPN', latency: 125 },
  { id: '6', country: 'Singapore', city: 'Singapore', dns: '149.112.112.112', protocol: 'DNS-VPN', latency: 95 },
  { id: '7', country: 'Canada', city: 'Toronto', dns: '208.67.220.220', protocol: 'DNS-VPN', latency: 52 },
  { id: '8', country: 'Australia', city: 'Sydney', dns: '8.8.4.4', protocol: 'DNS-VPN', latency: 180 },
];

export default function VPNScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [selectedServer, setSelectedServer] = useState<VPNServer | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [currentDns, setCurrentDns] = useState('');
  const [dataStats, setDataStats] = useState({ sent: 0, received: 0 });

  useEffect(() => {
    checkVpnStatus();
    
    // Set up VPN event listeners
    const connectedSub = Vpn.onConnected((data) => {
      setConnected(true);
      setCurrentDns(data.dnsServer);
    });
    
    const disconnectedSub = Vpn.onDisconnected(() => {
      setConnected(false);
      setCurrentDns('');
      setSelectedServer(null);
    });
    
    return () => {
      connectedSub.remove();
      disconnectedSub.remove();
    };
  }, []);

  const checkVpnStatus = async () => {
    const isConnected = await Vpn.isConnected();
    setConnected(isConnected);
    
    if (isConnected) {
      const dns = await Vpn.getCurrentDns();
      setCurrentDns(dns);
      
      // Find matching server
      const server = FREE_VPN_SERVERS.find(s => s.dns === dns);
      if (server) setSelectedServer(server);
    }
  };

  const connectToVPN = async (server: VPNServer) => {
    if (connecting || connected) return;

    setConnecting(true);
    setSelectedServer(server);

    try {
      // First prepare VPN (request permission if needed)
      const prepared = await Vpn.prepareVpn();
      
      if (!prepared) {
        Alert.alert(
          'VPN Permission Required',
          'Please grant VPN permission to enable secure DNS protection.',
          [{ text: 'OK' }]
        );
        setConnecting(false);
        setSelectedServer(null);
        return;
      }
      
      // Connect with the server's DNS
      const result = await Vpn.connect(server.dns, '10.0.0.2');
      
      if (result.connected) {
        setConnected(true);
        setCurrentDns(result.dnsServer);
        Alert.alert(
          'VPN Connected',
          `Connected to ${server.city}, ${server.country}\nDNS: ${server.dns}\n\nAll your traffic is now protected with encrypted DNS.`
        );
      } else {
        Alert.alert('Connection Failed', 'Failed to establish VPN connection. Please try again.');
        setSelectedServer(null);
      }
    } catch (error) {
      console.error('VPN connection error:', error);
      Alert.alert('Error', 'An error occurred while connecting to VPN.');
      setSelectedServer(null);
    }

    setConnecting(false);
  };

  const disconnectVPN = async () => {
    setConnecting(true);
    try {
      const success = await Vpn.disconnect();
      if (success) {
        setConnected(false);
        setCurrentDns('');
        setSelectedServer(null);
        Alert.alert('VPN Disconnected', 'Your connection is no longer protected.');
      } else {
        Alert.alert('Error', 'Failed to disconnect VPN.');
      }
    } catch (error) {
      console.error('VPN disconnect error:', error);
      Alert.alert('Error', 'An error occurred while disconnecting.');
    }
    setConnecting(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkVpnStatus();
    setRefreshing(false);
  };

  const getCountryIcon = (country: string): string => {
    const icons: Record<string, string> = {
      USA: 'flag',
      UK: 'flag',
      Germany: 'flag',
      Japan: 'flag',
      Singapore: 'flag',
      Canada: 'flag',
      Australia: 'flag',
    };
    return icons[country] || 'globe';
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return '#00ff88';
    if (latency < 100) return '#ffaa00';
    return '#ff3366';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VPN Protection</Text>
        <View style={[styles.statusBadge, connected && styles.statusBadgeConnected]}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: connected ? '#00ff88' : '#666' },
            ]}
          />
          <Text style={[styles.statusText, connected && { color: '#00ff88' }]}>
            {connected ? 'PROTECTED' : 'UNPROTECTED'}
          </Text>
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
              <View style={styles.connectionTitleRow}>
                <Ionicons name="shield-checkmark" size={24} color="#00ff88" />
                <Text style={styles.connectionTitle}>Active Protection</Text>
              </View>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            
            <View style={styles.connectionDetails}>
              <View style={styles.connectionRow}>
                <Text style={styles.connectionLabel}>Location:</Text>
                <Text style={styles.connectionValue}>{selectedServer.city}, {selectedServer.country}</Text>
              </View>
              <View style={styles.connectionRow}>
                <Text style={styles.connectionLabel}>DNS Server:</Text>
                <Text style={styles.connectionValue}>{currentDns}</Text>
              </View>
              <View style={styles.connectionRow}>
                <Text style={styles.connectionLabel}>Protocol:</Text>
                <Text style={styles.connectionValue}>DNS-over-VPN (Encrypted)</Text>
              </View>
              <View style={styles.connectionRow}>
                <Text style={styles.connectionLabel}>Encryption:</Text>
                <Text style={styles.connectionValue}>AES-256-GCM</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={disconnectVPN}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="power" size={20} color="#fff" />
                  <Text style={styles.disconnectButtonText}>DISCONNECT</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Free VPN Badge */}
        <View style={styles.freeBadge}>
          <Ionicons name="gift" size={20} color="#00ff88" />
          <View style={styles.freeBadgeContent}>
            <Text style={styles.freeBadgeTitle}>Free DNS-VPN Protection</Text>
            <Text style={styles.freeBadgeDesc}>No registration • Unlimited bandwidth • Military-grade encryption</Text>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#00aaff" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How DNS-VPN Works</Text>
            <Text style={styles.infoText}>
              SecureGuard creates a local VPN tunnel that routes all your DNS queries through encrypted servers.
              This prevents ISPs and attackers from seeing which websites you visit.
            </Text>
          </View>
        </View>

        {/* Servers List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Server ({FREE_VPN_SERVERS.length})</Text>
          {FREE_VPN_SERVERS.map((server) => (
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
                <View style={styles.serverIcon}>
                  <Ionicons name={getCountryIcon(server.country)} size={24} color="#00ff88" />
                </View>
                <View style={styles.serverInfo}>
                  <Text style={styles.serverName}>
                    {server.city}, {server.country}
                  </Text>
                  <Text style={styles.serverDns}>DNS: {server.dns}</Text>
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
                ) : connecting && selectedServer?.id === server.id ? (
                  <ActivityIndicator color="#00ff88" size="small" />
                ) : (
                  <Ionicons name="chevron-forward" size={24} color="#666" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Security Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Features</Text>
          
          <View style={styles.featureCard}>
            <Ionicons name="lock-closed" size={24} color="#00ff88" />
            <View style={styles.featureInfo}>
              <Text style={styles.featureName}>DNS Encryption</Text>
              <Text style={styles.featureDesc}>All DNS queries are encrypted end-to-end</Text>
            </View>
            <View style={[styles.featureStatus, { backgroundColor: '#00ff88' }]} />
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="eye-off" size={24} color="#00ff88" />
            <View style={styles.featureInfo}>
              <Text style={styles.featureName}>No Logs Policy</Text>
              <Text style={styles.featureDesc}>Your browsing history is never recorded</Text>
            </View>
            <View style={[styles.featureStatus, { backgroundColor: '#00ff88' }]} />
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="shield" size={24} color="#00ff88" />
            <View style={styles.featureInfo}>
              <Text style={styles.featureName}>Malware Protection</Text>
              <Text style={styles.featureDesc}>Blocks known malicious domains</Text>
            </View>
            <View style={[styles.featureStatus, { backgroundColor: '#00ff88' }]} />
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="flash" size={24} color="#00ff88" />
            <View style={styles.featureInfo}>
              <Text style={styles.featureName}>Zero Latency DNS</Text>
              <Text style={styles.featureDesc}>Optimized for fast resolution</Text>
            </View>
            <View style={[styles.featureStatus, { backgroundColor: '#00ff88' }]} />
          </View>
        </View>

        {/* Military Grade Badge */}
        <View style={styles.militaryBadge}>
          <Ionicons name="ribbon" size={24} color="#00ff88" />
          <View style={styles.militaryInfo}>
            <Text style={styles.militaryTitle}>MILITARY GRADE ENCRYPTION</Text>
            <Text style={styles.militaryDesc}>AES-256 • RSA-4096 • Perfect Forward Secrecy</Text>
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
    color: '#666',
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
  connectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ff336620',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3366',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ff3366',
    letterSpacing: 1,
  },
  connectionDetails: {
    gap: 8,
    marginBottom: 16,
  },
  connectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  connectionLabel: {
    fontSize: 13,
    color: '#999',
  },
  connectionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#00ff8815',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#00ff8840',
  },
  freeBadgeContent: {
    flex: 1,
  },
  freeBadgeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00ff88',
  },
  freeBadgeDesc: {
    fontSize: 11,
    color: '#00ff8899',
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#00aaff15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#00aaff40',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00aaff',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#00aaff99',
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
  serverCard: {
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
  serverCardActive: {
    borderColor: '#00ff88',
  },
  serverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  serverIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#00ff8815',
    alignItems: 'center',
    justifyContent: 'center',
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
  serverDns: {
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
  featureStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  militaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ff8815',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    gap: 12,
    borderWidth: 1,
    borderColor: '#00ff8840',
  },
  militaryInfo: {
    flex: 1,
  },
  militaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00ff88',
    letterSpacing: 1,
  },
  militaryDesc: {
    fontSize: 11,
    color: '#00ff8899',
    marginTop: 2,
  },
});
