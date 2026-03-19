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

export default function AppsScreen() {
  const [deviceId, setDeviceId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [runningApps, setRunningApps] = useState([]);
  const [selectedTab, setSelectedTab] = useState<'running' | 'all'>('running');

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
    loadRunningApps(id);
  };

  const loadRunningApps = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/apps/running/${id}`);
      setRunningApps(response.data);
    } catch (error) {
      console.error('Error loading running apps:', error);
    }
  };

  const stopApp = async (packageName: string, appName: string) => {
    Alert.alert(
      'Stop App',
      `Are you sure you want to force stop ${appName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.post(
                `${API_URL}/api/apps/stop?device_id=${deviceId}&package_name=${packageName}`
              );
              Alert.alert('Success', `${appName} has been stopped`);
              await loadRunningApps(deviceId);
            } catch (error) {
              console.error('Error stopping app:', error);
              Alert.alert('Error', 'Failed to stop app');
            }
          },
        },
      ]
    );
  };

  const removeApp = async (packageName: string, appName: string, isSystem: boolean) => {
    Alert.alert(
      isSystem ? 'Remove System App' : 'Uninstall App',
      `⚠️ ${isSystem ? 'WARNING: This is a system app!' : ''}\n\nAre you sure you want to ${isSystem ? 'remove' : 'uninstall'} ${appName}?\n\n${isSystem ? 'This requires Shizuku with root-level permissions and may affect system stability.' : 'This will uninstall the app from your device.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSystem ? 'Force Remove' : 'Uninstall',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.post(
                `${API_URL}/api/apps/remove?device_id=${deviceId}&package_name=${packageName}&force=${isSystem}`
              );
              Alert.alert('Success', `${appName} has been ${isSystem ? 'removed' : 'uninstalled'}`);
              await loadRunningApps(deviceId);
            } catch (error) {
              console.error('Error removing app:', error);
              Alert.alert('Error', 'Failed to remove app. Make sure Shizuku is running with proper permissions.');
            }
          },
        },
      ]
    );
  };

  const clearAppCache = async (packageName: string, appName: string) => {
    try {
      await axios.post(
        `${API_URL}/api/apps/clear-cache?device_id=${deviceId}&package_name=${packageName}`
      );
      Alert.alert('Success', `Cache cleared for ${appName}`);
    } catch (error) {
      console.error('Error clearing cache:', error);
      Alert.alert('Error', 'Failed to clear cache');
    }
  };

  const viewPermissions = async (packageName: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/apps/permissions/${packageName}`);
      const perms = response.data.permissions;
      const dangerousPerms = perms.filter((p: any) => p.dangerous && p.granted);
      Alert.alert(
        'App Permissions',
        `Dangerous permissions granted: ${dangerousPerms.length}\n\n${dangerousPerms.map((p: any) => `• ${p.name}`).join('\n')}`
      );
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRunningApps(deviceId);
    setRefreshing(false);
  };

  const allApps = [
    { package: 'com.android.chrome', name: 'Chrome', isSystem: false },
    { package: 'com.whatsapp', name: 'WhatsApp', isSystem: false },
    { package: 'com.facebook.katana', name: 'Facebook', isSystem: false },
    { package: 'com.instagram.android', name: 'Instagram', isSystem: false },
    { package: 'com.android.systemui', name: 'System UI', isSystem: true },
    { package: 'com.android.settings', name: 'Settings', isSystem: true },
  ];

  const displayApps = selectedTab === 'running' ? runningApps : allApps;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>App Manager</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>SHIZUKU</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'running' && styles.tabActive]}
          onPress={() => setSelectedTab('running')}
        >
          <Text style={[styles.tabText, selectedTab === 'running' && styles.tabTextActive]}>
            Running ({runningApps.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
          onPress={() => setSelectedTab('all')}
        >
          <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
            All Apps ({allApps.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff88" />
        }
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#00aaff" />
          <Text style={styles.infoText}>
            Using Shizuku for system-level app management. Tap any app to manage.
          </Text>
        </View>

        {/* Apps List */}
        {displayApps.map((app: any, index) => (
          <View key={app.package_name || app.package || index} style={styles.appCard}>
            <View style={styles.appLeft}>
              <View style={styles.appIconContainer}>
                <Ionicons
                  name={app.isSystem || app.is_system ? 'settings' : 'apps'}
                  size={28}
                  color={app.isSystem || app.is_system ? '#ff9900' : '#00ff88'}
                />
              </View>
              <View style={styles.appInfo}>
                <Text style={styles.appName}>{app.app_name || app.name}</Text>
                <Text style={styles.appPackage}>{app.package_name || app.package}</Text>
                {app.memory_usage && (
                  <View style={styles.memoryBadge}>
                    <Ionicons name="hardware-chip" size={12} color="#00aaff" />
                    <Text style={styles.memoryText}>{app.memory_usage} MB</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.appActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => viewPermissions(app.package_name || app.package)}
              >
                <Ionicons name="shield-outline" size={20} color="#00aaff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => clearAppCache(app.package_name || app.package, app.app_name || app.name)}
              >
                <Ionicons name="trash-outline" size={20} color="#ffaa00" />
              </TouchableOpacity>
              {selectedTab === 'running' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.stopButton]}
                  onPress={() => stopApp(app.package_name || app.package, app.app_name || app.name)}
                >
                  <Ionicons name="stop-circle" size={20} color="#ff3366" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.removeButton]}
                onPress={() => removeApp(app.package_name || app.package, app.app_name || app.name, app.isSystem || app.is_system || false)}
              >
                <Ionicons name="close-circle" size={20} color="#ff0033" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>System Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="apps" size={28} color="#00ff88" />
              <Text style={styles.statValue}>{allApps.length}</Text>
              <Text style={styles.statLabel}>Total Apps</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="play-circle" size={28} color="#00aaff" />
              <Text style={styles.statValue}>{runningApps.length}</Text>
              <Text style={styles.statLabel}>Running</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="settings" size={28} color="#ff9900" />
              <Text style={styles.statValue}>
                {allApps.filter((a) => a.isSystem).length}
              </Text>
              <Text style={styles.statLabel}>System</Text>
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
  badge: {
    backgroundColor: '#00ff8820',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  badgeText: {
    color: '#00ff88',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#00ff8820',
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#00ff88',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#00aaff20',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
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
  appCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  appLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  appIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
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
  memoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00aaff20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  memoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00aaff',
  },
  appActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {},
  removeButton: {},
  statsSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
});
