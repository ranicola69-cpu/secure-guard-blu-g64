import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Linking, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DonateButton from '@/components/DonateButton';

const C = {
  bg: '#0a0a0a', card: '#111', border: '#1e1e1e',
  green: '#00ff88', blue: '#00aaff', orange: '#ff9500',
  text: '#fff', dim: '#999',
};

type SearchTab = 'rom' | 'xda';

const ROM_RESOURCES = [
  {
    name: 'LineageOS',
    description: 'Popular AOSP-based ROM with monthly security updates. Clean and lightweight.',
    url: 'https://lineageos.org',
    tag: 'AOSP',
    color: C.green,
  },
  {
    name: 'CalyxOS',
    description: 'Privacy-focused ROM with microG and built-in firewall. Ideal for security-conscious users.',
    url: 'https://calyxos.org',
    tag: 'Privacy',
    color: C.blue,
  },
  {
    name: 'GrapheneOS',
    description: 'Maximum security hardened Android. Focus on sandboxing and exploit mitigation.',
    url: 'https://grapheneos.org',
    tag: 'Security',
    color: C.orange,
  },
  {
    name: '/e/ OS',
    description: 'Degooglified Android with MicroG. Privacy by default, user friendly.',
    url: 'https://e.foundation',
    tag: 'DeGoogle',
    color: '#a855f7',
  },
  {
    name: 'DivestOS',
    description: 'Privacy-focused LineageOS fork with extended device support.',
    url: 'https://divestos.org',
    tag: 'FOSS',
    color: '#f59e0b',
  },
];

const TOOLS = [
  { name: 'TWRP', desc: 'Team Win Recovery Project — flash ROMs and backups', url: 'https://twrp.me', icon: 'refresh-circle' },
  { name: 'Magisk', desc: 'Systemless root solution for Android', url: 'https://github.com/topjohnwu/Magisk', icon: 'code-slash' },
  { name: 'ADB Toolkit', desc: 'Android Debug Bridge command reference', url: 'https://developer.android.com/tools/adb', icon: 'terminal' },
  { name: 'Shizuku', desc: 'ADB-level access without root using wireless debugging', url: 'https://shizuku.rikka.app', icon: 'key' },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<SearchTab>('rom');
  const [query, setQuery] = useState('');

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open link'));
  };

  const searchXDA = () => {
    const searchUrl = `https://forum.xda-developers.com/search/?q=${encodeURIComponent(query || 'Blu G64 ROM')}`;
    openUrl(searchUrl);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ROM Finder</Text>
        <DonateButton />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {([
          { key: 'rom', label: 'Custom ROMs' },
          { key: 'xda', label: 'XDA Search' },
        ] as const).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'rom' && (
          <>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={C.blue} />
              <Text style={styles.infoText}>
                These ROMs may or may not support the Blu G64. Always verify compatibility on XDA before flashing.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>POPULAR CUSTOM ROMs</Text>
              {ROM_RESOURCES.map(rom => (
                <TouchableOpacity key={rom.name} style={styles.romCard} onPress={() => openUrl(rom.url)}>
                  <View style={[styles.romTag, { backgroundColor: rom.color + '20', borderColor: rom.color + '40' }]}>
                    <Text style={[styles.romTagText, { color: rom.color }]}>{rom.tag}</Text>
                  </View>
                  <View style={styles.romInfo}>
                    <Text style={styles.romName}>{rom.name}</Text>
                    <Text style={styles.romDesc}>{rom.description}</Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color="#444" />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ESSENTIAL TOOLS</Text>
              {TOOLS.map(tool => (
                <TouchableOpacity key={tool.name} style={styles.toolCard} onPress={() => openUrl(tool.url)}>
                  <View style={styles.toolIcon}>
                    <Ionicons name={tool.icon as any} size={20} color={C.green} />
                  </View>
                  <View style={styles.toolInfo}>
                    <Text style={styles.toolName}>{tool.name}</Text>
                    <Text style={styles.toolDesc}>{tool.desc}</Text>
                  </View>
                  <Ionicons name="open-outline" size={16} color="#444" />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.warningCard}>
              <Ionicons name="warning" size={22} color={C.orange} />
              <View style={{ flex: 1 }}>
                <Text style={styles.warningTitle}>WARNING: Flash at your own risk</Text>
                <Text style={styles.warningDesc}>
                  Installing custom ROMs may void your warranty and can brick your device if done incorrectly. Always back up your data first using TWRP or ADB.
                </Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'xda' && (
          <>
            <View style={styles.xdaSearchCard}>
              <Text style={styles.xdaTitle}>Search XDA Developers</Text>
              <Text style={styles.xdaDesc}>Find ROMs, mods, and guides specific to your device</Text>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="e.g., Blu G64 ROM, kernel..."
                  placeholderTextColor="#555"
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                  onSubmitEditing={searchXDA}
                />
              </View>
              <TouchableOpacity style={styles.searchBtn} onPress={searchXDA}>
                <Ionicons name="search" size={18} color={C.bg} />
                <Text style={styles.searchBtnText}>SEARCH XDA FORUMS</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>QUICK SEARCHES</Text>
              {[
                { label: 'Blu G64 ROM', q: 'Blu G64 custom ROM' },
                { label: 'Blu G64 Kernel', q: 'Blu G64 kernel' },
                { label: 'Blu G64 Root', q: 'Blu G64 root guide' },
                { label: 'Blu G64 TWRP', q: 'Blu G64 TWRP recovery' },
                { label: 'Blu G64 LineageOS', q: 'Blu G64 LineageOS' },
              ].map(({ label, q }) => (
                <TouchableOpacity
                  key={label}
                  style={styles.quickSearchItem}
                  onPress={() => openUrl(`https://forum.xda-developers.com/search/?q=${encodeURIComponent(q)}`)}
                >
                  <Ionicons name="search" size={16} color={C.green} />
                  <Text style={styles.quickSearchText}>{label}</Text>
                  <Ionicons name="open-outline" size={14} color="#444" />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.xdaDirectBtn} onPress={() => openUrl('https://forum.xda-developers.com/')}>
              <Ionicons name="globe" size={18} color={C.text} />
              <Text style={styles.xdaDirectBtnText}>Open XDA Developers Forum</Text>
            </TouchableOpacity>
          </>
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
  tabs: {
    flexDirection: 'row', backgroundColor: '#111',
    marginHorizontal: 16, marginVertical: 12, borderRadius: 12,
    padding: 3, borderWidth: 1, borderColor: '#1e1e1e',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10 },
  tabActive: { backgroundColor: '#00ff8815' },
  tabText: { fontSize: 13, color: C.dim, fontFamily: 'Inter_500Medium' },
  tabTextActive: { color: C.green, fontFamily: 'Inter_700Bold' },
  content: { flex: 1 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#00aaff08', marginHorizontal: 16, marginBottom: 16,
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#00aaff25',
  },
  infoText: { flex: 1, fontSize: 12, color: '#aaa', fontFamily: 'Inter_400Regular', lineHeight: 18 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#555', letterSpacing: 1.5, marginBottom: 10 },
  romCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
  },
  romTag: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, alignSelf: 'flex-start',
  },
  romTagText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  romInfo: { flex: 1 },
  romName: { fontSize: 14, fontFamily: 'Inter_700Bold', color: C.text, marginBottom: 3 },
  romDesc: { fontSize: 11, color: C.dim, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  toolCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
  },
  toolIcon: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: '#00ff8810', alignItems: 'center', justifyContent: 'center',
  },
  toolInfo: { flex: 1 },
  toolName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: C.text, marginBottom: 2 },
  toolDesc: { fontSize: 11, color: C.dim, fontFamily: 'Inter_400Regular' },
  warningCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#ff950010', marginHorizontal: 16, marginBottom: 16,
    padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ff950030',
  },
  warningTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: C.orange, marginBottom: 4 },
  warningDesc: { fontSize: 11, color: '#aa8866', fontFamily: 'Inter_400Regular', lineHeight: 16 },
  xdaSearchCard: {
    backgroundColor: C.card, margin: 16, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: C.border, gap: 12,
  },
  xdaTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: C.text },
  xdaDesc: { fontSize: 12, color: C.dim, fontFamily: 'Inter_400Regular' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, fontFamily: 'Inter_400Regular' },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: C.green, borderRadius: 10, paddingVertical: 13,
  },
  searchBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: C.bg, letterSpacing: 0.5 },
  quickSearchItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 10, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: C.border,
  },
  quickSearchText: { flex: 1, fontSize: 13, color: C.text, fontFamily: 'Inter_400Regular' },
  xdaDirectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1a1a1a', marginHorizontal: 16, marginBottom: 16,
    borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: '#2a2a2a',
  },
  xdaDirectBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: C.text },
});
