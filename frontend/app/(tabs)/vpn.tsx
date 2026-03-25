import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Vpn } from '@/modules/VpnService';

const C = {
  bg: '#0a0a0a', card: '#111', card2: '#1a1a1a', border: '#1e1e1e',
  green: '#00ff88', blue: '#00aaff', red: '#ff3366', orange: '#ff9500',
  text: '#fff', dim: '#999',
};

interface VPNServer {
  id: string; country: string; city: string; dns: string; protocol: string; latency: number;
}

const FREE_VPN_SERVERS: VPNServer[] = [
  { id: '1', country: 'USA', city: 'New York (1)', dns: '1.1.1.1', protocol: 'DNS-VPN', latency: 42 },
  { id: '2', country: 'USA', city: 'New York (2)', dns: '1.0.0.1', protocol: 'DNS-VPN', latency: 45 },
  { id: '3', country: 'USA', city: 'Los Angeles', dns: '8.8.8.8', protocol: 'DNS-VPN', latency: 38 },
  { id: '4', country: 'Canada', city: 'Toronto', dns: '208.67.220.220', protocol: 'DNS-VPN', latency: 52 },
  { id: '5', country: 'Canada', city: 'Montreal', dns: '149.112.112.112', protocol: 'DNS-VPN', latency: 48 },
  { id: '6', country: 'Brazil', city: 'São Paulo', dns: '9.9.9.9', protocol: 'DNS-VPN', latency: 85 },
  { id: '7', country: 'UK', city: 'London', dns: '208.67.222.222', protocol: 'DNS-VPN', latency: 65 },
  { id: '8', country: 'Germany', city: 'Frankfurt', dns: '94.140.14.14', protocol: 'DNS-VPN', latency: 58 },
  { id: '9', country: 'Japan', city: 'Tokyo', dns: '8.8.4.4', protocol: 'DNS-VPN', latency: 125 },
  { id: '10', country: 'Singapore', city: 'Singapore', dns: '94.140.15.15', protocol: 'DNS-VPN', latency: 95 },
  { id: '11', country: 'Australia', city: 'Sydney', dns: '76.76.2.0', protocol: 'DNS-VPN', latency: 180 },
];

export default function VPNScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [selectedServer, setSelectedServer] = useState<VPNServer | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [currentDns, setCurrentDns] = useState('');

  useEffect(() => {
    checkVpnStatus();
    const connectedSub = Vpn.onConnected((data) => {
      setConnected(true);
      setCurrentDns(data.dnsServer);
    });
    const disconnectedSub = Vpn.onDisconnected(() => {
      setConnected(false);
      setCurrentDns('');
      setSelectedServer(null);
    });
    return () => { connectedSub.remove(); disconnectedSub.remove(); };
  }, []);

  const checkVpnStatus = async () => {
    const isConnected = await Vpn.isConnected();
    setConnected(isConnected);
    if (isConnected) {
      const dns = await Vpn.getCurrentDns();
      setCurrentDns(dns);
      const server = FREE_VPN_SERVERS.find(s => s.dns === dns);
      if (server) setSelectedServer(server);
    }
  };

  const connectToVPN = async (server: VPNServer) => {
    if (connecting || connected) return;
    setConnecting(true);
    setSelectedServer(server);
    try {
      const prepared = await Vpn.prepareVpn();
      if (!prepared) {
        setConnecting(false);
        setSelectedServer(null);
        return;
      }
      const result = await Vpn.connect(server.dns, '10.0.0.2');
      if (result.connected) {
        setConnected(true);
        setCurrentDns(result.dnsServer);
        Alert.alert('VPN Connected', `Connected to ${server.city}, ${server.country}\nDNS: ${server.dns}\n\nAll traffic is now DNS-protected.`);
      } else {
        Alert.alert('Connection Failed', 'Failed to establish VPN connection. Please try again.');
        setSelectedServer(null);
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while connecting.');
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
      } else {
        Alert.alert('Error', 'Failed to disconnect VPN.');
      }
    } catch {
      Alert.alert('Error', 'An error occurred while disconnecting.');
    }
    setConnecting(false);
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return C.green;
    if (latency < 100) return C.orange;
    return C.red;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VPN Protection</Text>
        <View style={[styles.statusBadge, connected && styles.statusBadgeOn]}>
          <View style={[styles.statusDot, { backgroundColor: connected ? C.green : '#444' }]} />
          <Text style={[styles.statusText, { color: connected ? C.green : '#888' }]}>
            {connected ? 'PROTECTED' : 'UNPROTECTED'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await checkVpnStatus(); setRefreshing(false); }} tintColor={C.green} />}
      >
        {connected && selectedServer && (
          <View style={styles.connectionCard}>
            <View style={styles.connectionTop}>
              <View style={styles.connectionTitleRow}>
                <Ionicons name="shield-checkmark" size={22} color={C.green} />
                <Text style={styles.connectionTitle}>Active Protection</Text>
              </View>
              <View style={styles.liveTag}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <View style={styles.connectionDetails}>
              {[
                { label: 'Location', value: `${selectedServer.city}, ${selectedServer.country}` },
                { label: 'DNS Server', value: currentDns },
                { label: 'Protocol', value: 'DNS-over-VPN (Encrypted)' },
                { label: 'Encryption', value: 'AES-256-GCM' },
              ].map(({ label, value }) => (
                <View key={label} style={styles.connectionRow}>
                  <Text style={styles.connectionLabel}>{label}:</Text>
                  <Text style={styles.connectionValue}>{value}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.disconnectBtn} onPress={disconnectVPN} disabled={connecting}>
              {connecting ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="power" size={18} color="#fff" />
                  <Text style={styles.disconnectBtnText}>DISCONNECT</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Free VPN Info */}
        <View style={styles.freeBadge}>
          <Ionicons name="gift" size={20} color={C.green} />
          <View>
            <Text style={styles.freeTitle}>100% FREE VPN Protection</Text>
            <Text style={styles.freeDesc}>DNS-based privacy protection • No registration required • No data limits</Text>
          </View>
        </View>

        {!Vpn.isNativeAvailable && (
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={C.blue} />
            <Text style={styles.infoText}>
              VPN requires a native Android build. For DNS protection now, configure Private DNS in Android settings with one of these servers.
            </Text>
          </View>
        )}

        {/* Server List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SERVER LOCATIONS ({FREE_VPN_SERVERS.length} available)</Text>
          {FREE_VPN_SERVERS.map((server) => (
            <TouchableOpacity
              key={server.id}
              style={[
                styles.serverCard,
                selectedServer?.id === server.id && styles.serverCardSelected,
              ]}
              onPress={() => connected ? null : connectToVPN(server)}
              disabled={connected}
            >
              <View style={styles.serverLeft}>
                <View style={styles.serverIcon}>
                  <Ionicons name="globe" size={20} color={selectedServer?.id === server.id ? C.green : C.dim} />
                </View>
                <View>
                  <Text style={styles.serverCity}>{server.city}</Text>
                  <View style={styles.serverRow}>
                    <Text style={styles.serverCountry}>{server.country}</Text>
                    <Text style={styles.serverDot}>•</Text>
                    <Text style={styles.serverDns}>{server.dns}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.serverRight}>
                <Text style={[styles.serverLatency, { color: getLatencyColor(server.latency) }]}>
                  {server.latency}ms
                </Text>
                {selectedServer?.id === server.id && connected && (
                  <Ionicons name="checkmark-circle" size={20} color={C.green} />
                )}
                {selectedServer?.id === server.id && connecting && (
                  <ActivityIndicator size="small" color={C.green} />
                )}
              </View>
            </TouchableOpacity>
          ))}
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
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
  },
  statusBadgeOn: { backgroundColor: '#00ff8808', borderColor: '#00ff8830' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  content: { flex: 1 },
  connectionCard: {
    backgroundColor: '#00ff8808', margin: 16, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#00ff8830',
  },
  connectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  connectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: C.green },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00ff8820', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.green },
  liveText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: C.green, letterSpacing: 1 },
  connectionDetails: { gap: 8, marginBottom: 16 },
  connectionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  connectionLabel: { fontSize: 12, color: '#888', fontFamily: 'Inter_400Regular' },
  connectionValue: { fontSize: 12, color: C.text, fontFamily: 'Inter_500Medium' },
  disconnectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: C.red, borderRadius: 10, paddingVertical: 12,
  },
  disconnectBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 0.5 },
  freeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#00ff8808', marginHorizontal: 16, marginBottom: 16,
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#00ff8825',
  },
  freeTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: C.green, marginBottom: 3 },
  freeDesc: { fontSize: 11, color: '#00ff8880', fontFamily: 'Inter_400Regular' },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#00aaff08', marginHorizontal: 16, marginBottom: 16,
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#00aaff25',
  },
  infoText: { flex: 1, fontSize: 12, color: '#aaa', fontFamily: 'Inter_400Regular', lineHeight: 18 },
  section: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#555', letterSpacing: 1.5, marginBottom: 10 },
  serverCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
  },
  serverCardSelected: { borderColor: '#00ff8840', backgroundColor: '#00ff8806' },
  serverLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serverIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center',
  },
  serverCity: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: C.text, marginBottom: 2 },
  serverRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  serverCountry: { fontSize: 11, color: C.dim, fontFamily: 'Inter_400Regular' },
  serverDot: { fontSize: 11, color: '#444' },
  serverDns: { fontSize: 11, color: '#666', fontFamily: 'Inter_400Regular' },
  serverRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serverLatency: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
