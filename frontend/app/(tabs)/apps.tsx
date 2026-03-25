import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shizuku, PackageInfo } from '@/modules/ShizukuService';
import { ThreatDB, ThreatDefinition } from '@/modules/ThreatDatabase';

const C = {
  bg: '#0a0a0a', card: '#111', border: '#1e1e1e',
  green: '#00ff88', red: '#ff3366', orange: '#ff9500', yellow: '#ffdd00',
  text: '#fff', dim: '#999',
};

type AppFilter = 'all' | 'system' | 'user' | 'threats';

interface EnhancedApp extends PackageInfo {
  threat?: ThreatDefinition;
}

const DEMO_APPS: PackageInfo[] = [
  { packageName: 'com.facebook.appmanager', versionName: '403.0.0', versionCode: 403000, isSystem: true },
  { packageName: 'com.facebook.services', versionName: '403.0.0', versionCode: 403000, isSystem: true },
  { packageName: 'com.tracfone', versionName: '2.0.1', versionCode: 201, isSystem: true },
  { packageName: 'com.android.enterprise', versionName: '1.0', versionCode: 100, isSystem: true },
  { packageName: 'com.google.android.gms', versionName: '23.0.0', versionCode: 230000, isSystem: true },
  { packageName: 'com.android.chrome', versionName: '119.0.0', versionCode: 119000, isSystem: false },
  { packageName: 'com.spotify.music', versionName: '8.8.72', versionCode: 88720, isSystem: false },
  { packageName: 'com.whatsapp', versionName: '2.23.24', versionCode: 22324, isSystem: false },
];

export default function AppsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<EnhancedApp[]>([]);
  const [filteredApps, setFilteredApps] = useState<EnhancedApp[]>([]);
  const [filter, setFilter] = useState<AppFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [shizukuAvailable, setShizukuAvailable] = useState(false);

  useEffect(() => { loadApps(); }, []);

  useEffect(() => {
    filterApps();
  }, [apps, filter, searchQuery]);

  const loadApps = async () => {
    setLoading(true);
    const permission = await Shizuku.checkPermission();
    setShizukuAvailable(!!permission);

    let rawApps: PackageInfo[] = [];
    if (permission) {
      rawApps = await Shizuku.getInstalledPackages();
    }
    if (rawApps.length === 0) {
      rawApps = DEMO_APPS;
    }

    const db = await ThreatDB.getDatabase();
    const enhanced: EnhancedApp[] = rawApps.map(app => ({
      ...app,
      threat: db.threats.find(t => t.package_name === app.packageName),
    }));

    setApps(enhanced);
    setLoading(false);
  };

  const filterApps = () => {
    let result = [...apps];
    if (filter === 'system') result = result.filter(a => a.isSystem);
    else if (filter === 'user') result = result.filter(a => !a.isSystem);
    else if (filter === 'threats') result = result.filter(a => !!a.threat);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.packageName.toLowerCase().includes(q));
    }
    setFilteredApps(result);
  };

  const handleAppAction = (app: EnhancedApp) => {
    if (!app.threat) {
      Alert.alert('App Info', `Package: ${app.packageName}\nVersion: ${app.versionName}\nSystem App: ${app.isSystem ? 'Yes' : 'No'}`);
      return;
    }
    Alert.alert(
      `Threat Detected: ${app.threat.app_name}`,
      `Level: ${app.threat.threat_level.toUpperCase()}\nCategory: ${app.threat.category}\n\n${app.threat.description}\n\nCan Remove: ${app.threat.can_remove ? 'Yes' : 'No (System App)'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        app.threat.can_remove
          ? { text: 'Remove App', style: 'destructive', onPress: () => removeApp(app) }
          : { text: 'Disable App', onPress: () => disableApp(app) },
      ]
    );
  };

  const removeApp = async (app: EnhancedApp) => {
    if (!shizukuAvailable) {
      Alert.alert('Shizuku Required', 'Shizuku is required to remove apps. Please set it up in the Security tab.');
      return;
    }
    const success = await Shizuku.uninstallPackage(app.packageName);
    if (success) {
      setApps(prev => prev.filter(a => a.packageName !== app.packageName));
      Alert.alert('Success', `${app.packageName} has been removed.`);
    } else {
      Alert.alert('Failed', 'Could not remove app. It may be a protected system app.');
    }
  };

  const disableApp = async (app: EnhancedApp) => {
    if (!shizukuAvailable) {
      Alert.alert('Shizuku Required', 'Shizuku is required to disable apps. Please set it up in the Security tab.');
      return;
    }
    const success = await Shizuku.disablePackage(app.packageName);
    Alert.alert(success ? 'Success' : 'Failed', success ? `${app.packageName} has been disabled.` : 'Could not disable app.');
  };

  const getThreatColor = (level: string) => {
    if (level === 'critical') return C.red;
    if (level === 'high') return C.orange;
    if (level === 'medium') return C.yellow;
    return C.dim;
  };

  const filters: { key: AppFilter; label: string }[] = [
    { key: 'all', label: `All (${apps.length})` },
    { key: 'threats', label: `Threats (${apps.filter(a => a.threat).length})` },
    { key: 'system', label: `System (${apps.filter(a => a.isSystem).length})` },
    { key: 'user', label: `User (${apps.filter(a => !a.isSystem).length})` },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>App Manager</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => { setRefreshing(true); loadApps().then(() => setRefreshing(false)); }}>
          <Ionicons name="refresh" size={18} color={C.green} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search packages..."
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filters}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!shizukuAvailable && (
        <View style={styles.shizukuBanner}>
          <Ionicons name="information-circle" size={16} color={C.orange} />
          <Text style={styles.shizukuBannerText}>Showing demo data. Shizuku needed for real app list.</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.green} />
          <Text style={styles.loadingText}>Scanning installed apps...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadApps().then(() => setRefreshing(false)); }} tintColor={C.green} />}
        >
          {filteredApps.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="apps-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>No apps found</Text>
            </View>
          ) : (
            filteredApps.map((app, i) => (
              <TouchableOpacity key={i} style={styles.appItem} onPress={() => handleAppAction(app)}>
                <View style={[styles.appIcon, app.threat && { borderColor: getThreatColor(app.threat.threat_level) + '60', backgroundColor: getThreatColor(app.threat.threat_level) + '10' }]}>
                  {app.threat
                    ? <Ionicons name="warning" size={22} color={getThreatColor(app.threat.threat_level)} />
                    : <Ionicons name={app.isSystem ? 'cog' : 'apps'} size={22} color={app.isSystem ? C.dim : C.green} />
                  }
                </View>
                <View style={styles.appInfo}>
                  <Text style={styles.appPkg} numberOfLines={1}>{app.packageName}</Text>
                  {app.threat && (
                    <View style={[styles.threatBadge, { backgroundColor: getThreatColor(app.threat.threat_level) + '15', borderColor: getThreatColor(app.threat.threat_level) + '40' }]}>
                      <Text style={[styles.threatBadgeText, { color: getThreatColor(app.threat.threat_level) }]}>
                        {app.threat.threat_level.toUpperCase()} • {app.threat.category}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.appVersion}>v{app.versionName} {app.isSystem ? '• System' : '• User'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#444" />
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}
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
  refreshBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#00ff8815', alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#111', marginHorizontal: 16, marginVertical: 12,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: '#1e1e1e',
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, fontFamily: 'Inter_400Regular' },
  filtersScroll: { maxHeight: 40, marginBottom: 8 },
  filters: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#111', borderWidth: 1, borderColor: '#2a2a2a',
  },
  filterBtnActive: { backgroundColor: '#00ff8815', borderColor: '#00ff8840' },
  filterText: { fontSize: 12, color: '#888', fontFamily: 'Inter_500Medium' },
  filterTextActive: { color: C.green, fontFamily: 'Inter_700Bold' },
  shizukuBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ff950010', marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#ff950030',
  },
  shizukuBannerText: { fontSize: 11, color: '#ff9500', fontFamily: 'Inter_400Regular', flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: C.dim, fontFamily: 'Inter_400Regular' },
  list: { flex: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#555', fontFamily: 'Inter_400Regular' },
  appItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#111',
  },
  appIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  appInfo: { flex: 1 },
  appPkg: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#ddd', marginBottom: 4 },
  threatBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5,
    borderWidth: 1, alignSelf: 'flex-start', marginBottom: 3,
  },
  threatBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
  appVersion: { fontSize: 10, color: '#555', fontFamily: 'Inter_400Regular' },
});
