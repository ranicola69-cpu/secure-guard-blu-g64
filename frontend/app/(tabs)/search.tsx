import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import DonateButton from '../../components/DonateButton';
import { Shizuku } from '../../modules/ShizukuService';

type SearchTab = 'rom' | 'xda';

const COLORS = {
  bg: '#0a0a0a',
  card: '#111',
  border: '#1e1e1e',
  green: '#00ff88',
  blue: '#00aaff',
  red: '#ff3366',
  orange: '#ff9500',
  yellow: '#ffdd00',
  dim: '#444',
  text: '#fff',
  textDim: '#888',
};

interface RomSource {
  name: string;
  icon: string;
  color: string;
  description: string;
  getUrl: (model: string, manufacturer: string) => string;
}

const ROM_SOURCES: RomSource[] = [
  {
    name: 'XDA Forums',
    icon: 'chatbubbles',
    color: COLORS.orange,
    description: 'Community ROMs, guides & support',
    getUrl: (model, _) => `https://xdaforums.com/search?query=${encodeURIComponent(model + ' ROM')}&type=post`,
  },
  {
    name: 'GSM Arena',
    icon: 'phone-portrait',
    color: COLORS.blue,
    description: 'Official firmware & specs',
    getUrl: (model, mfg) => `https://www.gsmarena.com/search.php3?sQuickSearch=1&sName=${encodeURIComponent(mfg + ' ' + model)}`,
  },
  {
    name: 'Sammobile (Samsung)',
    icon: 'layers',
    color: '#1428a0',
    description: 'Samsung stock firmware database',
    getUrl: (model, _) => `https://www.sammobile.com/samsung/firmware/${encodeURIComponent(model)}/`,
  },
  {
    name: 'Firmware.Science',
    icon: 'server',
    color: COLORS.green,
    description: 'Multi-brand firmware archive',
    getUrl: (model, mfg) => `https://firmware.science/?q=${encodeURIComponent(mfg + ' ' + model)}`,
  },
  {
    name: 'Android File Host',
    icon: 'cloud-download',
    color: '#5bc0de',
    description: 'Custom ROM hosting & archives',
    getUrl: (model, _) => `https://androidfilehost.com/?w=search&q=${encodeURIComponent(model)}`,
  },
  {
    name: 'LineageOS',
    icon: 'git-branch',
    color: '#9BC200',
    description: 'Official LineageOS device support',
    getUrl: (model, _) => `https://wiki.lineageos.org/devices/${encodeURIComponent(model.toLowerCase().replace(/\s+/g, '_'))}/`,
  },
  {
    name: 'PixelExperience',
    icon: 'star',
    color: '#0052CC',
    description: 'Pixel-like AOSP experience',
    getUrl: (model, _) => `https://get.pixelexperience.org/devices?q=${encodeURIComponent(model)}`,
  },
  {
    name: 'Evolution X',
    icon: 'planet',
    color: '#8B00FF',
    description: 'Feature-rich Pixel-based ROM',
    getUrl: (model, _) => `https://evolution-x.org/devices?search=${encodeURIComponent(model)}`,
  },
];

const XDA_CATEGORIES = [
  { label: 'ROMs', query: 'ROM stock firmware' },
  { label: 'Recovery', query: 'TWRP recovery' },
  { label: 'Kernels', query: 'kernel' },
  { label: 'Root/Magisk', query: 'Magisk root' },
  { label: 'Mods', query: 'mod xposed' },
  { label: 'Guides', query: 'guide tutorial' },
];

export default function SearchScreen() {
  const [tab, setTab] = useState<SearchTab>('rom');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceManufacturer, setDeviceManufacturer] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [detectingDevice, setDetectingDevice] = useState(false);
  const [webUrl, setWebUrl] = useState('');
  const [showWebView, setShowWebView] = useState(false);
  const [webLoading, setWebLoading] = useState(false);
  const [xdaQuery, setXdaQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    detectDevice();
  }, []);

  const detectDevice = async () => {
    setDetectingDevice(true);
    try {
      const ok = await Shizuku.checkPermission();
      if (ok) {
        const model = (await Shizuku.executeCommand('getprop ro.product.model 2>/dev/null')).output;
        const mfg = (await Shizuku.executeCommand('getprop ro.product.manufacturer 2>/dev/null')).output;
        setDeviceModel(model.trim());
        setDeviceManufacturer(mfg.trim());
        setCustomModel(model.trim());
      }
    } catch {
      // fallback
    } finally {
      setDetectingDevice(false);
    }
  };

  const effectiveModel = customModel || deviceModel || 'BLU G64';
  const effectiveManufacturer = deviceManufacturer || 'BLU';

  const openSource = (source: RomSource) => {
    const url = source.getUrl(effectiveModel, effectiveManufacturer);
    setWebUrl(url);
    setShowWebView(true);
  };

  const openXdaSearch = (extra?: string) => {
    const q = (xdaQuery + (extra ? ' ' + extra : '')).trim() || effectiveModel + ' ROM';
    const url = `https://xdaforums.com/search?query=${encodeURIComponent(effectiveModel + ' ' + q)}&type=post`;
    setWebUrl(url);
    setShowWebView(true);
  };

  const openXdaSubforum = (category: string) => {
    const url = `https://xdaforums.com/search?query=${encodeURIComponent(effectiveModel + ' ' + category)}&type=thread&sortBy=relevance`;
    setWebUrl(url);
    setShowWebView(true);
  };

  if (showWebView) {
    return (
      <View style={styles.container}>
        <View style={styles.webHeader}>
          <TouchableOpacity onPress={() => setShowWebView(false)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.webUrl} numberOfLines={1}>{webUrl}</Text>
          {webLoading && <ActivityIndicator size="small" color={COLORS.green} style={{ marginLeft: 8 }} />}
        </View>
        <WebView
          source={{ uri: webUrl }}
          style={{ flex: 1 }}
          onLoadStart={() => setWebLoading(true)}
          onLoadEnd={() => setWebLoading(false)}
          onError={() => setWebLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          userAgent="Mozilla/5.0 (Linux; Android 11; BLU G64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>ROM & Forums</Text>
          <Text style={styles.headerSub}>Stock ROM · XDA Search</Text>
        </View>
        <DonateButton />
      </View>

      {/* Device Bar */}
      <View style={styles.deviceBar}>
        <Ionicons name="phone-portrait" size={16} color={COLORS.green} />
        <TextInput
          style={styles.modelInput}
          value={customModel}
          onChangeText={setCustomModel}
          placeholder="Device model (e.g. BLU G64)"
          placeholderTextColor={COLORS.dim}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={detectDevice} style={styles.detectBtn}>
          {detectingDevice
            ? <ActivityIndicator size="small" color={COLORS.bg} />
            : <Ionicons name="locate" size={16} color={COLORS.bg} />
          }
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'rom' && styles.tabItemActive]}
          onPress={() => setTab('rom')}>
          <Ionicons name="cloud-download" size={16} color={tab === 'rom' ? COLORS.bg : COLORS.textDim} />
          <Text style={[styles.tabLabel, tab === 'rom' && styles.tabLabelActive]}>Stock ROM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'xda' && styles.tabItemActive]}
          onPress={() => setTab('xda')}>
          <Ionicons name="chatbubbles" size={16} color={tab === 'xda' ? COLORS.bg : COLORS.textDim} />
          <Text style={[styles.tabLabel, tab === 'xda' && styles.tabLabelActive]}>XDA Forums</Text>
        </TouchableOpacity>
      </View>

      {tab === 'rom' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Firmware Sources</Text>
            <Text style={styles.sectionSub}>for {effectiveManufacturer} {effectiveModel}</Text>
          </View>

          {ROM_SOURCES.map(source => (
            <TouchableOpacity key={source.name} style={styles.sourceCard} onPress={() => openSource(source)}>
              <View style={[styles.sourceIcon, { backgroundColor: source.color + '22' }]}>
                <Ionicons name={source.icon as any} size={22} color={source.color} />
              </View>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceName}>{source.name}</Text>
                <Text style={styles.sourceDesc}>{source.description}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={COLORS.dim} />
            </TouchableOpacity>
          ))}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Direct Links</Text>
          </View>
          {[
            { label: 'BLU Official Support', url: 'https://www.bluproducts.com/support', icon: 'help-circle' },
            { label: 'BLU Firmware Updates', url: 'https://www.bluproducts.com/firmware', icon: 'download' },
            { label: 'Android Security Bulletins', url: 'https://source.android.com/docs/security/bulletin', icon: 'shield-checkmark' },
          ].map(link => (
            <TouchableOpacity key={link.url} style={styles.sourceCard}
              onPress={() => { setWebUrl(link.url); setShowWebView(true); }}>
              <View style={[styles.sourceIcon, { backgroundColor: COLORS.blue + '22' }]}>
                <Ionicons name={link.icon as any} size={22} color={COLORS.blue} />
              </View>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceName}>{link.label}</Text>
                <Text style={styles.sourceDesc}>{link.url}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={COLORS.dim} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* XDA Search bar */}
          <View style={styles.xdaSearchBar}>
            <TextInput
              style={styles.xdaSearchInput}
              value={xdaQuery}
              onChangeText={setXdaQuery}
              placeholder={`Search XDA for ${effectiveModel}…`}
              placeholderTextColor={COLORS.dim}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => openXdaSearch()}
            />
            <TouchableOpacity style={styles.xdaSearchBtn} onPress={() => openXdaSearch()}>
              <Ionicons name="search" size={18} color={COLORS.bg} />
            </TouchableOpacity>
          </View>

          {/* Quick categories */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Search</Text>
            <Text style={styles.sectionSub}>{effectiveManufacturer} {effectiveModel}</Text>
          </View>
          <View style={styles.categoryGrid}>
            {XDA_CATEGORIES.map(cat => (
              <TouchableOpacity key={cat.label} style={styles.categoryChip}
                onPress={() => openXdaSubforum(cat.query)}>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Forum sections */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>XDA Sections</Text>
          </View>
          {[
            {
              title: 'Device Forum',
              desc: `Main ${effectiveManufacturer} ${effectiveModel} discussion`,
              icon: 'chatbubbles',
              color: COLORS.orange,
              url: `https://xdaforums.com/search?query=${encodeURIComponent(effectiveManufacturer + ' ' + effectiveModel)}&type=thread`,
            },
            {
              title: 'ROM Development',
              desc: 'Custom ROMs for your device',
              icon: 'code-slash',
              color: COLORS.green,
              url: `https://xdaforums.com/search?query=${encodeURIComponent(effectiveModel + ' custom ROM development')}&type=thread`,
            },
            {
              title: 'Themes & Apps',
              desc: 'Themes, mods, and customizations',
              icon: 'color-palette',
              color: '#aa55ff',
              url: `https://xdaforums.com/search?query=${encodeURIComponent(effectiveModel + ' theme mod')}&type=thread`,
            },
            {
              title: 'General Discussion',
              desc: 'Tips, tricks, and help',
              icon: 'people',
              color: COLORS.blue,
              url: `https://xdaforums.com/search?query=${encodeURIComponent(effectiveModel + ' help tips tricks')}&type=post`,
            },
            {
              title: 'XDA Portal',
              desc: 'Latest Android news & guides',
              icon: 'newspaper',
              color: COLORS.yellow,
              url: `https://xda-developers.com/search/?q=${encodeURIComponent(effectiveModel)}`,
            },
          ].map(item => (
            <TouchableOpacity key={item.title} style={styles.sourceCard}
              onPress={() => { setWebUrl(item.url); setShowWebView(true); }}>
              <View style={[styles.sourceIcon, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceName}>{item.title}</Text>
                <Text style={styles.sourceDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={COLORS.dim} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12,
    borderBottomColor: COLORS.border, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.orange, fontWeight: '600', marginTop: 2 },

  deviceBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  modelInput: {
    flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 4,
  },
  detectBtn: {
    backgroundColor: COLORS.green, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 6,
  },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12 },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: COLORS.green },
  tabLabel: { fontSize: 13, color: COLORS.textDim, fontWeight: '600' },
  tabLabelActive: { color: COLORS.green },

  scroll: { flex: 1, padding: 12 },
  sectionHeader: { marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  sectionSub: { fontSize: 11, color: COLORS.textDim, marginTop: 2 },

  sourceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  sourceIcon: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sourceInfo: { flex: 1 },
  sourceName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  sourceDesc: { fontSize: 12, color: COLORS.textDim, marginTop: 2 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryChip: {
    backgroundColor: COLORS.card, borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  categoryLabel: { fontSize: 13, color: COLORS.orange, fontWeight: '600' },

  xdaSearchBar: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
  },
  xdaSearchInput: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text,
    fontSize: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  xdaSearchBtn: {
    backgroundColor: COLORS.orange, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
  },

  webHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 50, paddingBottom: 10, paddingHorizontal: 12,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: 8,
  },
  backBtn: { padding: 4 },
  webUrl: { flex: 1, fontSize: 12, color: COLORS.textDim },
});
