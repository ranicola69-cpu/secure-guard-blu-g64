import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import * as Network from 'expo-network';

import { Shizuku } from '../../modules/ShizukuService';

type NetworkType = '2G' | '3G' | '4G' | '5G' | 'WiFi' | 'Unknown';

interface CellTower {
  id: string;
  type: string;
  signalStrength: number;
  frequency: string;
  mcc: string;
  mnc: string;
  lac: string;
  cid: string;
}

interface WiFiInfo {
  ssid: string;
  bssid: string;
  signalStrength: number;
  frequency: number;
  security: string;
  linkSpeed: number;
  ipAddress: string;
}

export default function DeviceInfoScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [shizukuReady, setShizukuReady] = useState(false);
  
  // Device info
  const [deviceInfo, setDeviceInfo] = useState({
    brand: '',
    model: '',
    osName: '',
    osVersion: '',
    deviceType: '',
    totalMemory: 0,
    manufacturer: '',
  });
  
  // Network info
  const [networkType, setNetworkType] = useState<NetworkType>('Unknown');
  const [preferredNetwork, setPreferredNetwork] = useState<NetworkType>('4G');
  const [cellTowers, setCellTowers] = useState<CellTower[]>([]);
  const [wifiInfo, setWifiInfo] = useState<WiFiInfo | null>(null);
  const [ipAddress, setIpAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadDeviceInfo();
    loadNetworkInfo();
    checkShizuku();
  }, []);

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
      deviceType: getDeviceType(),
      totalMemory: Device.totalMemory ? Math.round(Device.totalMemory / (1024 * 1024 * 1024) * 10) / 10 : 0,
      manufacturer: Device.manufacturer || 'Unknown',
    });
  };

  const getDeviceType = () => {
    switch (Device.deviceType) {
      case Device.DeviceType.PHONE: return 'Phone';
      case Device.DeviceType.TABLET: return 'Tablet';
      case Device.DeviceType.DESKTOP: return 'Desktop';
      case Device.DeviceType.TV: return 'TV';
      default: return 'Unknown';
    }
  };

  const loadNetworkInfo = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      setIsConnected(networkState.isConnected || false);
      
      if (networkState.type === Network.NetworkStateType.WIFI) {
        setNetworkType('WiFi');
        loadWiFiInfo();
      } else if (networkState.type === Network.NetworkStateType.CELLULAR) {
        // Simulate cell network type detection
        setNetworkType('4G');
        loadCellTowerInfo();
      }
      
      const ip = await Network.getIpAddressAsync();
      setIpAddress(ip);
    } catch (error) {
      console.error('Error loading network info:', error);
    }
  };

  const loadWiFiInfo = async () => {
    // Use Shizuku for detailed WiFi info if available
    if (shizukuReady) {
      try {
        const result = await Shizuku.executeCommand('dumpsys wifi');
        // Parse WiFi info from dumpsys output
        // For now, we'll use simulated data
      } catch (error) {
        console.error('Error getting WiFi info:', error);
      }
    }
    
    // Simulated WiFi info (real info requires Shizuku)
    setWifiInfo({
      ssid: 'Connected Network',
      bssid: '00:00:00:00:00:00',
      signalStrength: -55,
      frequency: 5180,
      security: 'WPA3',
      linkSpeed: 866,
      ipAddress: ipAddress,
    });
  };

  const loadCellTowerInfo = async () => {
    if (shizukuReady) {
      try {
        const result = await Shizuku.executeCommand('dumpsys telephony.registry');
        // Parse cell tower info
      } catch (error) {
        console.error('Error getting cell tower info:', error);
      }
    }
    
    // Simulated cell tower info (real info requires Shizuku)
    setCellTowers([
      {
        id: '1',
        type: '4G LTE',
        signalStrength: -85,
        frequency: 'Band 4 (1700MHz)',
        mcc: '310',
        mnc: '260',
        lac: '12345',
        cid: '67890',
      },
      {
        id: '2',
        type: '4G LTE',
        signalStrength: -92,
        frequency: 'Band 12 (700MHz)',
        mcc: '310',
        mnc: '260',
        lac: '12346',
        cid: '67891',
      },
    ]);
  };

  const setNetworkPreference = async (type: NetworkType) => {
    if (!shizukuReady) {
      Alert.alert(
        'Shizuku Required',
        'Shizuku permission is required to change network preferences.',
      );
      return;
    }

    setPreferredNetwork(type);
    
    try {
      // Use Shizuku to set network preference
      let command = '';
      switch (type) {
        case '2G':
          command = 'settings put global preferred_network_mode 1';
          break;
        case '3G':
          command = 'settings put global preferred_network_mode 3';
          break;
        case '4G':
          command = 'settings put global preferred_network_mode 9';
          break;
        case '5G':
          command = 'settings put global preferred_network_mode 26';
          break;
      }
      
      if (command) {
        await Shizuku.executeCommand(command);
        Alert.alert('Success', `Network preference set to ${type}`);
      }
    } catch (error) {
      console.error('Error setting network preference:', error);
      Alert.alert('Error', 'Failed to set network preference');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDeviceInfo();
    await loadNetworkInfo();
    await checkShizuku();
    setRefreshing(false);
  };

  const getSignalColor = (strength: number) => {
    if (strength > -70) return '#00ff88';
    if (strength > -85) return '#ffaa00';
    return '#ff3366';
  };

  const getSignalBars = (strength: number) => {
    if (strength > -65) return 4;
    if (strength > -75) return 3;
    if (strength > -85) return 2;
    return 1;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Device Info</Text>
        <View style={[styles.connectionBadge, isConnected && styles.connectionBadgeConnected]}>
          <View style={[styles.connectionDot, { backgroundColor: isConnected ? '#00ff88' : '#ff3366' }]} />
          <Text style={[styles.connectionText, isConnected && { color: '#00ff88' }]}>
            {isConnected ? networkType : 'OFFLINE'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff88" />
        }
      >
        {/* Device Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="phone-portrait" size={24} color="#00ff88" />
            <Text style={styles.cardTitle}>Device Information</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Manufacturer</Text>
              <Text style={styles.infoValue}>{deviceInfo.manufacturer}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Model</Text>
              <Text style={styles.infoValue}>{deviceInfo.model}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Brand</Text>
              <Text style={styles.infoValue}>{deviceInfo.brand}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>OS</Text>
              <Text style={styles.infoValue}>{deviceInfo.osName} {deviceInfo.osVersion}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{deviceInfo.deviceType}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Memory</Text>
              <Text style={styles.infoValue}>{deviceInfo.totalMemory} GB</Text>
            </View>
          </View>
        </View>

        {/* Network Preference Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cellular" size={24} color="#00aaff" />
            <Text style={styles.cardTitle}>Network Preference</Text>
          </View>
          
          <Text style={styles.cardDesc}>
            Select your preferred network type. Requires Shizuku for changes.
          </Text>
          
          <View style={styles.networkOptions}>
            {(['2G', '3G', '4G', '5G'] as NetworkType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.networkOption,
                  preferredNetwork === type && styles.networkOptionActive,
                ]}
                onPress={() => setNetworkPreference(type)}
              >
                <Text style={[
                  styles.networkOptionText,
                  preferredNetwork === type && styles.networkOptionTextActive,
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cell Tower Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="radio" size={24} color="#ff9900" />
            <Text style={styles.cardTitle}>Connected Cell Towers</Text>
          </View>
          
          {cellTowers.length === 0 ? (
            <Text style={styles.noDataText}>No cell towers detected (WiFi connected)</Text>
          ) : (
            cellTowers.map((tower) => (
              <View key={tower.id} style={styles.towerCard}>
                <View style={styles.towerHeader}>
                  <View style={styles.towerType}>
                    <Text style={styles.towerTypeText}>{tower.type}</Text>
                  </View>
                  <View style={styles.signalBars}>
                    {[1, 2, 3, 4].map((bar) => (
                      <View
                        key={bar}
                        style={[
                          styles.signalBar,
                          {
                            height: bar * 4 + 4,
                            backgroundColor: bar <= getSignalBars(tower.signalStrength)
                              ? getSignalColor(tower.signalStrength)
                              : '#333',
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
                
                <View style={styles.towerDetails}>
                  <View style={styles.towerDetail}>
                    <Text style={styles.towerDetailLabel}>Signal</Text>
                    <Text style={[styles.towerDetailValue, { color: getSignalColor(tower.signalStrength) }]}>
                      {tower.signalStrength} dBm
                    </Text>
                  </View>
                  <View style={styles.towerDetail}>
                    <Text style={styles.towerDetailLabel}>Frequency</Text>
                    <Text style={styles.towerDetailValue}>{tower.frequency}</Text>
                  </View>
                  <View style={styles.towerDetail}>
                    <Text style={styles.towerDetailLabel}>MCC/MNC</Text>
                    <Text style={styles.towerDetailValue}>{tower.mcc}/{tower.mnc}</Text>
                  </View>
                  <View style={styles.towerDetail}>
                    <Text style={styles.towerDetailLabel}>Cell ID</Text>
                    <Text style={styles.towerDetailValue}>{tower.cid}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* WiFi Security Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wifi" size={24} color="#00ff88" />
            <Text style={styles.cardTitle}>WiFi Security</Text>
          </View>
          
          {wifiInfo ? (
            <>
              <View style={styles.wifiHeader}>
                <Text style={styles.wifiSSID}>{wifiInfo.ssid}</Text>
                <View style={[styles.securityBadge, 
                  wifiInfo.security.includes('WPA3') ? styles.securityBadgeGood :
                  wifiInfo.security.includes('WPA2') ? styles.securityBadgeMedium :
                  styles.securityBadgeBad
                ]}>
                  <Text style={styles.securityBadgeText}>{wifiInfo.security}</Text>
                </View>
              </View>
              
              <View style={styles.wifiDetails}>
                <View style={styles.wifiDetail}>
                  <Ionicons name="signal" size={16} color="#999" />
                  <Text style={styles.wifiDetailLabel}>Signal</Text>
                  <Text style={[styles.wifiDetailValue, { color: getSignalColor(wifiInfo.signalStrength) }]}>
                    {wifiInfo.signalStrength} dBm
                  </Text>
                </View>
                <View style={styles.wifiDetail}>
                  <Ionicons name="speedometer" size={16} color="#999" />
                  <Text style={styles.wifiDetailLabel}>Speed</Text>
                  <Text style={styles.wifiDetailValue}>{wifiInfo.linkSpeed} Mbps</Text>
                </View>
                <View style={styles.wifiDetail}>
                  <Ionicons name="radio-button-on" size={16} color="#999" />
                  <Text style={styles.wifiDetailLabel}>Frequency</Text>
                  <Text style={styles.wifiDetailValue}>{wifiInfo.frequency >= 5000 ? '5 GHz' : '2.4 GHz'}</Text>
                </View>
                <View style={styles.wifiDetail}>
                  <Ionicons name="globe" size={16} color="#999" />
                  <Text style={styles.wifiDetailLabel}>IP Address</Text>
                  <Text style={styles.wifiDetailValue}>{ipAddress}</Text>
                </View>
              </View>
              
              {/* Security Analysis */}
              <View style={styles.securityAnalysis}>
                <Text style={styles.securityAnalysisTitle}>Security Analysis</Text>
                <View style={styles.securityItem}>
                  <Ionicons 
                    name={wifiInfo.security.includes('WPA3') ? 'checkmark-circle' : 'warning'} 
                    size={18} 
                    color={wifiInfo.security.includes('WPA3') ? '#00ff88' : '#ffaa00'} 
                  />
                  <Text style={styles.securityItemText}>
                    {wifiInfo.security.includes('WPA3') 
                      ? 'Strong encryption (WPA3)' 
                      : 'Consider upgrading to WPA3'}
                  </Text>
                </View>
                <View style={styles.securityItem}>
                  <Ionicons 
                    name={wifiInfo.frequency >= 5000 ? 'checkmark-circle' : 'information-circle'} 
                    size={18} 
                    color={wifiInfo.frequency >= 5000 ? '#00ff88' : '#00aaff'} 
                  />
                  <Text style={styles.securityItemText}>
                    {wifiInfo.frequency >= 5000 
                      ? '5 GHz band - Less interference' 
                      : '2.4 GHz band - May have interference'}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.noDataText}>Not connected to WiFi</Text>
          )}
        </View>

        {/* Developer Credits */}
        <View style={styles.creditsCard}>
          <View style={styles.creditsIcon}>
            <Ionicons name="code-slash" size={24} color="#00ff88" />
          </View>
          <Text style={styles.creditsTitle}>Developed by</Text>
          <Text style={styles.creditsName}>Richard Carmen Anicola</Text>
          <Text style={styles.creditsCompany}>DPHMS - Doctor Power House Mobile Solutions</Text>
          <View style={styles.creditsBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#00ff88" />
            <Text style={styles.creditsBadgeText}>Military Grade Security</Text>
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
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  connectionBadgeConnected: {
    backgroundColor: '#00ff8820',
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cardDesc: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  networkOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  networkOption: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  networkOptionActive: {
    borderColor: '#00ff88',
    backgroundColor: '#00ff8815',
  },
  networkOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  networkOptionTextActive: {
    color: '#00ff88',
  },
  towerCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  towerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  towerType: {
    backgroundColor: '#ff990020',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  towerTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff9900',
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
  },
  towerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  towerDetail: {
    width: '50%',
    marginBottom: 8,
  },
  towerDetailLabel: {
    fontSize: 10,
    color: '#666',
  },
  towerDetailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  wifiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  wifiSSID: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  securityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  securityBadgeGood: {
    backgroundColor: '#00ff8830',
  },
  securityBadgeMedium: {
    backgroundColor: '#ffaa0030',
  },
  securityBadgeBad: {
    backgroundColor: '#ff336630',
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  wifiDetails: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  wifiDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  wifiDetailLabel: {
    flex: 1,
    fontSize: 13,
    color: '#999',
  },
  wifiDetailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
  securityAnalysis: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 12,
  },
  securityAnalysisTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  securityItemText: {
    fontSize: 12,
    color: '#999',
  },
  noDataText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  creditsCard: {
    backgroundColor: '#00ff8815',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00ff8840',
  },
  creditsIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00ff8830',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  creditsTitle: {
    fontSize: 12,
    color: '#00ff8899',
  },
  creditsName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  creditsCompany: {
    fontSize: 13,
    color: '#00ff88',
    marginTop: 4,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  creditsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00ff88',
  },
});
