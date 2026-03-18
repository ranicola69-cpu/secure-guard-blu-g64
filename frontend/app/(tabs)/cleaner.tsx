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

export default function CleanerScreen() {
  const [deviceId, setDeviceId] = useState('');
  const [cleaning, setCleaning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);

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
    loadHistory(id);
  };

  const loadHistory = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/cache/history/${id}`);
      setHistory(response.data);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const performClean = async () => {
    if (selectedApps.length === 0) {
      Alert.alert('No Selection', 'Please select at least one app to clean');
      return;
    }

    setCleaning(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/cache/clean?device_id=${deviceId}`,
        selectedApps,
        { headers: { 'Content-Type': 'application/json' } }
      );
      Alert.alert(
        'Cleaning Complete',
        `Freed ${(response.data.space_freed / (1024 * 1024)).toFixed(2)} MB from ${response.data.apps_cleaned} apps`
      );
      setSelectedApps([]);
      await loadHistory(deviceId);
    } catch (error) {
      console.error('Error cleaning cache:', error);
      Alert.alert('Error', 'Failed to clean cache');
    }
    setCleaning(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory(deviceId);
    setRefreshing(false);
  };

  const mockApps = [
    { package: 'com.android.chrome', name: 'Chrome', cache: 145 },
    { package: 'com.whatsapp', name: 'WhatsApp', cache: 320 },
    { package: 'com.facebook.katana', name: 'Facebook', cache: 280 },
    { package: 'com.instagram.android', name: 'Instagram', cache: 195 },
    { package: 'com.twitter.android', name: 'Twitter', cache: 78 },
    { package: 'com.spotify.music', name: 'Spotify', cache: 412 },
  ];

  const toggleAppSelection = (pkg: string) => {
    setSelectedApps((prev) =>
      prev.includes(pkg) ? prev.filter((p) => p !== pkg) : [...prev, pkg]
    );
  };

  const selectAll = () => {
    setSelectedApps(mockApps.map((app) => app.package));
  };

  const deselectAll = () => {
    setSelectedApps([]);
  };

  const totalCache = mockApps.reduce((sum, app) => sum + app.cache, 0);
  const selectedCache = mockApps
    .filter((app) => selectedApps.includes(app.package))
    .reduce((sum, app) => sum + app.cache, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cache Cleaner</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={selectAll}>
            <Text style={styles.headerButtonText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={deselectAll}>
            <Text style={styles.headerButtonText}>None</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff88" />
        }
      >
        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="albums" size={32} color="#00ff88" />
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{totalCache} MB</Text>
              <Text style={styles.statLabel}>Total Cache</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={32} color="#00aaff" />
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{selectedCache} MB</Text>
              <Text style={styles.statLabel}>Selected</Text>
            </View>
          </View>
        </View>

        {/* Clean Button */}
        <TouchableOpacity
          style={[styles.cleanButton, cleaning && styles.cleanButtonActive]}
          onPress={performClean}
          disabled={cleaning || selectedApps.length === 0}
        >
          <Ionicons name="trash" size={24} color="#000" />
          <Text style={styles.cleanButtonText}>
            {cleaning ? 'CLEANING...' : 'CLEAN CACHE'}
          </Text>
        </TouchableOpacity>

        {/* App List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apps ({mockApps.length})</Text>
          {mockApps.map((app) => (
            <TouchableOpacity
              key={app.package}
              style={[
                styles.appCard,
                selectedApps.includes(app.package) && styles.appCardSelected,
              ]}
              onPress={() => toggleAppSelection(app.package)}
            >
              <View style={styles.appLeft}>
                <View
                  style={[
                    styles.checkbox,
                    selectedApps.includes(app.package) && styles.checkboxSelected,
                  ]}
                >
                  {selectedApps.includes(app.package) && (
                    <Ionicons name="checkmark" size={16} color="#000" />
                  )}
                </View>
                <View style={styles.appIcon}>
                  <Ionicons name="apps" size={24} color="#00ff88" />
                </View>
                <View style={styles.appInfo}>
                  <Text style={styles.appName}>{app.name}</Text>
                  <Text style={styles.appPackage}>{app.package}</Text>
                </View>
              </View>
              <View style={styles.appRight}>
                <Text style={styles.appCache}>{app.cache} MB</Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {history.slice(0, 5).map((item: any) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyIcon}>
                  <Ionicons name="checkmark-circle" size={24} color="#00ff88" />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyText}>
                    Cleaned {item.apps_cleaned} apps
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.clean_date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.historySize}>
                  {(item.space_freed / (1024 * 1024)).toFixed(0)} MB
                </Text>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  headerButtonText: {
    color: '#00ff88',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statInfo: {
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  divider: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 16,
  },
  cleanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ff88',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  cleanButtonActive: {
    opacity: 0.7,
  },
  cleanButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  appCard: {
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
  appCardSelected: {
    borderColor: '#00ff88',
  },
  appLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appInfo: {
    flex: 1,
    gap: 4,
  },
  appName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  appPackage: {
    fontSize: 11,
    color: '#999',
  },
  appRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appCache: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00ff88',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  historyIcon: {},
  historyInfo: {
    flex: 1,
    gap: 4,
  },
  historyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
  },
  historySize: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00ff88',
  },
});
