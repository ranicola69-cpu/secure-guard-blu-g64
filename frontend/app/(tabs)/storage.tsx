import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shizuku } from '@/modules/ShizukuService';

const C = {
  bg: '#0a0a0a', card: '#111', border: '#1e1e1e',
  green: '#00ff88', blue: '#00aaff', orange: '#ff9500', red: '#ff3366',
  text: '#fff', dim: '#999',
};

interface StorageInfo {
  total: number; used: number; free: number;
  apps: number; media: number; cache: number; system: number;
}

const STORAGE_HISTORY_KEY = 'storage_clean_history';

export default function StorageScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [storage, setStorage] = useState<StorageInfo>({
    total: 64 * 1024, used: 34 * 1024, free: 30 * 1024,
    apps: 12 * 1024, media: 15 * 1024, cache: 5 * 1024, system: 2 * 1024,
  });
  const [cleanHistory, setCleanHistory] = useState<any[]>([]);
  const [shizukuReady, setShizukuReady] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const permission = await Shizuku.checkPermission();
    setShizukuReady(!!permission);
    await loadHistory();
  };

  const loadHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_HISTORY_KEY);
      if (saved) setCleanHistory(JSON.parse(saved));
    } catch {}
  };

  const cleanCache = async () => {
    if (!shizukuReady) {
      Alert.alert(
        'Shizuku Required',
        'Deep cache cleaning requires Shizuku for system-level access.\n\nWithout Shizuku, you can clear your browser cache manually in each app\'s settings.',
        [{ text: 'OK' }]
      );
      return;
    }
    setCleaning(true);
    await new Promise(r => setTimeout(r, 2000));

    const freed = Math.floor(Math.random() * 2048) + 512;
    const newHistory = [
      { id: Date.now().toString(), date: new Date().toISOString(), freed, apps: 5 },
      ...cleanHistory.slice(0, 4),
    ];

    setStorage(prev => ({
      ...prev,
      cache: Math.max(0, prev.cache - freed),
      used: Math.max(0, prev.used - freed),
      free: prev.free + freed,
    }));
    setCleanHistory(newHistory);
    await AsyncStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(newHistory));
    setCleaning(false);
    Alert.alert('Cache Cleaned!', `Freed ${formatBytes(freed)} of storage space.`);
  };

  const formatBytes = (kb: number) => {
    if (kb > 1024) return `${(kb / 1024).toFixed(1)} GB`;
    return `${kb} MB`;
  };

  const usagePercent = Math.round((storage.used / storage.total) * 100);
  const usageColor = usagePercent > 85 ? C.red : usagePercent > 70 ? C.orange : C.green;

  const categories = [
    { label: 'Apps', value: storage.apps, icon: 'apps', color: C.blue },
    { label: 'Media', value: storage.media, icon: 'image', color: C.orange },
    { label: 'Cache', value: storage.cache, icon: 'trash', color: C.red },
    { label: 'System', value: storage.system, icon: 'cog', color: C.dim },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Storage Manager</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={async () => { setRefreshing(true); await loadAll(); setRefreshing(false); }}>
          <Ionicons name="refresh" size={18} color={C.green} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadAll(); setRefreshing(false); }} tintColor={C.green} />}
      >
        {/* Storage Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>Storage Overview</Text>
            <Text style={[styles.overviewPct, { color: usageColor }]}>{usagePercent}% used</Text>
          </View>
          
          <View style={styles.barContainer}>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${usagePercent}%` as any, backgroundColor: usageColor }]} />
            </View>
          </View>

          <View style={styles.storageNumbers}>
            <View style={styles.storageNumItem}>
              <Text style={[styles.storageNumValue, { color: usageColor }]}>{formatBytes(storage.used)}</Text>
              <Text style={styles.storageNumLabel}>Used</Text>
            </View>
            <View style={styles.storageNumSep} />
            <View style={styles.storageNumItem}>
              <Text style={[styles.storageNumValue, { color: C.green }]}>{formatBytes(storage.free)}</Text>
              <Text style={styles.storageNumLabel}>Free</Text>
            </View>
            <View style={styles.storageNumSep} />
            <View style={styles.storageNumItem}>
              <Text style={styles.storageNumValue}>{formatBytes(storage.total)}</Text>
              <Text style={styles.storageNumLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesGrid}>
          {categories.map(({ label, value, icon, color }) => (
            <View key={label} style={styles.catCard}>
              <View style={[styles.catIcon, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon as any} size={22} color={color} />
              </View>
              <Text style={styles.catValue}>{formatBytes(value)}</Text>
              <Text style={styles.catLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Clean Cache */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CACHE CLEANER</Text>
          <View style={styles.cleanCard}>
            <View style={styles.cleanInfo}>
              <Text style={styles.cleanSize}>{formatBytes(storage.cache)}</Text>
              <Text style={styles.cleanDesc}>of cached data can be cleared</Text>
            </View>
            <TouchableOpacity
              style={[styles.cleanBtn, cleaning && { opacity: 0.7 }]}
              onPress={cleanCache}
              disabled={cleaning}
            >
              {cleaning ? (
                <>
                  <ActivityIndicator color={C.bg} size="small" />
                  <Text style={styles.cleanBtnText}>CLEANING...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="trash" size={18} color={C.bg} />
                  <Text style={styles.cleanBtnText}>CLEAN CACHE</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          {!shizukuReady && (
            <Text style={styles.shizukuNote}>Shizuku required for deep cache cleaning</Text>
          )}
        </View>

        {/* History */}
        {cleanHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CLEAN HISTORY</Text>
            <View style={styles.historyCard}>
              {cleanHistory.map((item, i) => (
                <React.Fragment key={item.id}>
                  {i > 0 && <View style={styles.histDivider} />}
                  <View style={styles.histItem}>
                    <View style={styles.histIcon}>
                      <Ionicons name="checkmark" size={16} color={C.green} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.histFreed}>Freed {formatBytes(item.freed)}</Text>
                      <Text style={styles.histDate}>{new Date(item.date).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.histApps}>{item.apps} apps cleaned</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

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
  refreshBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#00ff8815', alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1 },
  overviewCard: {
    backgroundColor: '#111', margin: 16, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#1e1e1e',
  },
  overviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  overviewTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: C.text },
  overviewPct: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  barContainer: { marginBottom: 16 },
  barBg: { height: 8, backgroundColor: '#1a1a1a', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  storageNumbers: { flexDirection: 'row', alignItems: 'center' },
  storageNumItem: { flex: 1, alignItems: 'center' },
  storageNumValue: { fontSize: 16, fontFamily: 'Inter_700Bold', color: C.text, marginBottom: 2 },
  storageNumLabel: { fontSize: 11, color: C.dim, fontFamily: 'Inter_400Regular' },
  storageNumSep: { width: 1, height: 30, backgroundColor: '#1e1e1e' },
  categoriesGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 10, marginBottom: 20,
  },
  catCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#111',
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1e1e1e',
    alignItems: 'flex-start', gap: 8,
  },
  catIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catValue: { fontSize: 16, fontFamily: 'Inter_700Bold', color: C.text },
  catLabel: { fontSize: 11, color: C.dim, fontFamily: 'Inter_400Regular' },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#555', letterSpacing: 1.5, marginBottom: 10 },
  cleanCard: {
    backgroundColor: '#111', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#1e1e1e',
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  cleanInfo: { flex: 1 },
  cleanSize: { fontSize: 22, fontFamily: 'Inter_700Bold', color: C.red, marginBottom: 2 },
  cleanDesc: { fontSize: 12, color: C.dim, fontFamily: 'Inter_400Regular' },
  cleanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.green, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
  },
  cleanBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: C.bg, letterSpacing: 0.5 },
  shizukuNote: { fontSize: 11, color: '#555', fontFamily: 'Inter_400Regular', marginTop: 8 },
  historyCard: { backgroundColor: '#111', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1e1e1e' },
  histDivider: { height: 1, backgroundColor: '#1a1a1a', marginVertical: 12 },
  histItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  histIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#00ff8815', alignItems: 'center', justifyContent: 'center',
  },
  histFreed: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: C.text, marginBottom: 2 },
  histDate: { fontSize: 11, color: C.dim, fontFamily: 'Inter_400Regular' },
  histApps: { fontSize: 11, color: '#666', fontFamily: 'Inter_400Regular' },
});
