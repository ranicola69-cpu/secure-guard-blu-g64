import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, TextInput, FlatList, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shizuku } from '@/modules/ShizukuService';
import DonateButton from '@/components/DonateButton';

const C = {
  bg: '#0a0a0a', card: '#111', border: '#1e1e1e',
  green: '#00ff88', blue: '#00aaff', red: '#ff3366', orange: '#ff9500',
  text: '#fff', dim: '#999',
};

type Section = 'root' | 'terminal' | 'activity';

interface CommandEntry {
  id: string; input: string; output: string; isError: boolean; timestamp: number;
}

const QUICK_COMMANDS = [
  { label: 'App List', cmd: 'pm list packages' },
  { label: 'Device Info', cmd: 'getprop ro.product.model' },
  { label: 'Android Ver', cmd: 'getprop ro.build.version.release' },
  { label: 'CPU Info', cmd: 'cat /proc/cpuinfo | head -5' },
  { label: 'Memory', cmd: 'cat /proc/meminfo | head -5' },
  { label: 'IP Address', cmd: 'ip addr show wlan0' },
];

export default function RootScreen() {
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>('root');
  const [shizukuReady, setShizukuReady] = useState(false);
  const [shizukuInstalled, setShizukuInstalled] = useState(false);
  const [shizukuRunning, setShizukuRunning] = useState(false);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<CommandEntry[]>([]);
  const [running, setRunning] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    checkShizuku();
  }, []);

  const checkShizuku = async () => {
    const installed = await Shizuku.isInstalled();
    setShizukuInstalled(installed);
    if (installed) {
      const running = await Shizuku.isRunning();
      setShizukuRunning(running);
      if (running) {
        const perm = await Shizuku.checkPermission();
        setShizukuReady(perm);
      }
    }
  };

  const executeCommand = async (cmd?: string) => {
    const input = (cmd || command).trim();
    if (!input) return;

    if (!shizukuReady) {
      Alert.alert('Shizuku Required', 'You need Shizuku with permission to run ADB commands.');
      return;
    }

    setRunning(true);
    setCommand('');

    const result = await Shizuku.executeCommand(input);
    const entry: CommandEntry = {
      id: Date.now().toString(),
      input,
      output: result.output || result.error || 'No output',
      isError: result.exitCode !== 0,
      timestamp: Date.now(),
    };

    setHistory(prev => [...prev, entry]);
    setRunning(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const clearHistory = () => {
    Alert.alert('Clear History', 'Clear all terminal history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setHistory([]) },
    ]);
  };

  const openWirelessDebugging = () => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.APPLICATION_DEVELOPMENT_SETTINGS').catch(() => {
        Alert.alert('Open Developer Options', 'Go to Settings > About Phone > tap Build Number 7 times > Developer Options > Wireless Debugging');
      });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Root & ADB</Text>
        <DonateButton />
      </View>

      {/* Section Tabs */}
      <View style={styles.sectionTabs}>
        {([
          { key: 'root', label: 'Status', icon: 'shield' },
          { key: 'terminal', label: 'Terminal', icon: 'terminal' },
          { key: 'activity', label: 'Activity', icon: 'pulse' },
        ] as const).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.sectionTab, section === tab.key && styles.sectionTabActive]}
            onPress={() => setSection(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={14} color={section === tab.key ? C.green : C.dim} />
            <Text style={[styles.sectionTabText, section === tab.key && styles.sectionTabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {section === 'root' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Shizuku Status */}
          <View style={styles.statusCard}>
            <Text style={styles.statusCardTitle}>Shizuku Status</Text>
            {[
              { label: 'Installed', value: shizukuInstalled, icon: 'download' },
              { label: 'Service Running', value: shizukuRunning, icon: 'play-circle' },
              { label: 'Permission Granted', value: shizukuReady, icon: 'key' },
            ].map(({ label, value, icon }) => (
              <View key={label} style={styles.statusRow}>
                <Ionicons name={icon as any} size={18} color={value ? C.green : '#444'} />
                <Text style={styles.statusLabel}>{label}</Text>
                <View style={[styles.statusPill, { backgroundColor: value ? '#00ff8815' : '#1a1a1a', borderColor: value ? '#00ff8840' : '#2a2a2a' }]}>
                  <Text style={[styles.statusPillText, { color: value ? C.green : '#666' }]}>
                    {value ? 'YES' : 'NO'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {!shizukuInstalled && (
            <TouchableOpacity style={styles.setupBtn} onPress={() => Shizuku.openShizukuPlayStore()}>
              <Ionicons name="download" size={20} color={C.bg} />
              <Text style={styles.setupBtnText}>INSTALL SHIZUKU FROM PLAY STORE</Text>
            </TouchableOpacity>
          )}

          {shizukuInstalled && !shizukuRunning && (
            <TouchableOpacity style={[styles.setupBtn, { backgroundColor: C.orange }]} onPress={openWirelessDebugging}>
              <Ionicons name="wifi" size={20} color={C.bg} />
              <Text style={styles.setupBtnText}>ENABLE WIRELESS DEBUGGING</Text>
            </TouchableOpacity>
          )}

          {shizukuInstalled && shizukuRunning && !shizukuReady && (
            <TouchableOpacity style={styles.setupBtn} onPress={async () => {
              const granted = await Shizuku.requestPermission();
              setShizukuReady(granted);
            }}>
              <Ionicons name="key" size={20} color={C.bg} />
              <Text style={styles.setupBtnText}>GRANT SHIZUKU PERMISSION</Text>
            </TouchableOpacity>
          )}

          {!Shizuku.isNativeAvailable && (
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={C.blue} />
              <Text style={styles.infoText}>
                Shizuku requires a native Android APK build. This preview shows the UI but cannot execute ADB commands without native bindings.
              </Text>
            </View>
          )}

          {/* Setup Guide */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SETUP GUIDE</Text>
            <View style={styles.guideCard}>
              {[
                'Install Shizuku from Play Store',
                'Go to Settings > Developer Options',
                'Enable "Wireless Debugging"',
                'Open Shizuku app and tap Start',
                'Return here and grant permission',
                'You now have ADB-level access!',
              ].map((step, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <View style={styles.guideDivider} />}
                  <View style={styles.guideStep}>
                    <View style={styles.guideNum}>
                      <Text style={styles.guideNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.guideStepText}>{step}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {section === 'terminal' && (
        <View style={styles.terminalContainer}>
          {/* Quick Commands */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickCmds} contentContainerStyle={styles.quickCmdsContent}>
            {QUICK_COMMANDS.map(({ label, cmd }) => (
              <TouchableOpacity key={label} style={styles.quickCmd} onPress={() => executeCommand(cmd)}>
                <Text style={styles.quickCmdText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Terminal Output */}
          <ScrollView ref={scrollRef} style={styles.terminal} showsVerticalScrollIndicator={false}>
            <Text style={styles.terminalWelcome}>Secure Guard Terminal — ADB via Shizuku{'\n'}{'>'} Type a command below or use quick commands{'\n'}</Text>
            {history.map(entry => (
              <View key={entry.id} style={styles.terminalEntry}>
                <Text style={styles.terminalPrompt}>$ {entry.input}</Text>
                <Text style={[styles.terminalOutput, entry.isError && styles.terminalError]}>
                  {entry.output}
                </Text>
              </View>
            ))}
            {running && <Text style={styles.terminalRunning}>Running...</Text>}
          </ScrollView>

          {/* Input */}
          <View style={[styles.terminalInput, { paddingBottom: insets.bottom + 8 }]}>
            <Text style={styles.terminalInputPrompt}>$</Text>
            <TextInput
              style={styles.terminalInputField}
              placeholder="Enter ADB shell command..."
              placeholderTextColor="#444"
              value={command}
              onChangeText={setCommand}
              onSubmitEditing={() => executeCommand()}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={() => executeCommand()} disabled={running || !command.trim()}>
              <Ionicons name="send" size={20} color={command.trim() ? C.green : '#333'} />
            </TouchableOpacity>
            {history.length > 0 && (
              <TouchableOpacity onPress={clearHistory}>
                <Ionicons name="trash" size={20} color="#444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {section === 'activity' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Ionicons name="pulse" size={20} color={C.blue} />
            <Text style={styles.infoText}>
              Process monitoring requires Shizuku with active permission. Set up Shizuku in the Status tab to view running processes.
            </Text>
          </View>
          {!shizukuReady ? (
            <View style={styles.emptyState}>
              <Ionicons name="lock-closed" size={48} color="#333" />
              <Text style={styles.emptyTitle}>Shizuku Required</Text>
              <Text style={styles.emptyDesc}>Enable Shizuku to monitor running processes</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color={C.green} />
              <Text style={styles.emptyTitle}>Shizuku Active</Text>
              <Text style={styles.emptyDesc}>Process monitoring is available via the Terminal</Text>
            </View>
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
  sectionTabs: {
    flexDirection: 'row', backgroundColor: '#111',
    marginHorizontal: 16, marginVertical: 12, borderRadius: 12,
    padding: 3, borderWidth: 1, borderColor: '#1e1e1e',
  },
  sectionTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: 10,
  },
  sectionTabActive: { backgroundColor: '#00ff8815' },
  sectionTabText: { fontSize: 12, color: C.dim, fontFamily: 'Inter_500Medium' },
  sectionTabTextActive: { color: C.green, fontFamily: 'Inter_700Bold' },
  content: { flex: 1 },
  statusCard: {
    backgroundColor: C.card, marginHorizontal: 16, marginBottom: 16,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 14,
  },
  statusCardTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: C.text, marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusLabel: { flex: 1, fontSize: 13, color: '#ddd', fontFamily: 'Inter_400Regular' },
  statusPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  setupBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: C.green, marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, paddingVertical: 14,
  },
  setupBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: C.bg, letterSpacing: 0.5 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#00aaff08', marginHorizontal: 16, marginBottom: 16,
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#00aaff25',
  },
  infoText: { flex: 1, fontSize: 12, color: '#aaa', fontFamily: 'Inter_400Regular', lineHeight: 18 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#555', letterSpacing: 1.5, marginBottom: 10 },
  guideCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  guideDivider: { height: 1, backgroundColor: '#1a1a1a', marginVertical: 10 },
  guideStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guideNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#00ff8815', alignItems: 'center', justifyContent: 'center',
  },
  guideNumText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: C.green },
  guideStepText: { flex: 1, fontSize: 12, color: '#ccc', fontFamily: 'Inter_400Regular' },
  terminalContainer: { flex: 1 },
  quickCmds: { maxHeight: 44, marginBottom: 0 },
  quickCmdsContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  quickCmd: {
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1a1a1a',
    borderRadius: 8, borderWidth: 1, borderColor: '#2a2a2a',
  },
  quickCmdText: { fontSize: 11, color: C.green, fontFamily: 'Inter_500Medium' },
  terminal: { flex: 1, backgroundColor: '#050505', padding: 14 },
  terminalWelcome: { fontSize: 11, color: '#555', fontFamily: 'Inter_400Regular', lineHeight: 18, marginBottom: 8 },
  terminalEntry: { marginBottom: 12 },
  terminalPrompt: { fontSize: 12, color: C.green, fontFamily: 'Inter_500Medium', marginBottom: 3 },
  terminalOutput: { fontSize: 11, color: '#aaa', fontFamily: 'Inter_400Regular', lineHeight: 17 },
  terminalError: { color: '#ff6688' },
  terminalRunning: { fontSize: 12, color: '#666', fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  terminalInput: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#111', paddingHorizontal: 16, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#1a1a1a',
  },
  terminalInputPrompt: { fontSize: 16, color: C.green, fontFamily: 'Inter_700Bold' },
  terminalInputField: { flex: 1, fontSize: 13, color: C.text, fontFamily: 'Inter_400Regular', paddingVertical: 8 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: '#555' },
  emptyDesc: { fontSize: 13, color: '#444', fontFamily: 'Inter_400Regular', textAlign: 'center', paddingHorizontal: 40 },
});
