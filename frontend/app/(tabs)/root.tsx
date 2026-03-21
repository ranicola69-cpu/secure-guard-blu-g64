import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  FlatList,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Shizuku } from '../../modules/ShizukuService';
import DonateButton from '../../components/DonateButton';

type Section = 'root' | 'terminal' | 'activity' | 'power';
type TerminalMode = 'shell' | 'wireless';

interface CommandEntry {
  id: string;
  input: string;
  output: string;
  isError: boolean;
  timestamp: number;
}

interface ActivityInfo {
  packageName: string;
  activityName: string;
  label: string;
}

const COLORS = {
  bg: '#0a0a0a',
  card: '#111',
  border: '#1e1e1e',
  green: '#00ff88',
  blue: '#00aaff',
  red: '#ff3366',
  orange: '#ff9500',
  yellow: '#ffdd00',
  purple: '#aa55ff',
  dim: '#444',
  text: '#fff',
  textDim: '#888',
  termBg: '#050505',
  termText: '#00ff88',
  termErr: '#ff3366',
  termPrompt: '#00aaff',
};

export default function RootScreen() {
  const [section, setSection] = useState<Section>('root');
  const [refreshing, setRefreshing] = useState(false);
  const [shizukuReady, setShizukuReady] = useState(false);

  // Root / TWRP / Magisk state
  const [rootStatus, setRootStatus] = useState<'unknown' | 'rooted' | 'unrooted'>('unknown');
  const [magiskVersion, setMagiskVersion] = useState<string | null>(null);
  const [magiskInstalled, setMagiskInstalled] = useState(false);
  const [twrpInstalled, setTwrpInstalled] = useState(false);
  const [suBinary, setSuBinary] = useState(false);
  const [checkingRoot, setCheckingRoot] = useState(false);

  // Wireless Debugging
  const [wifiAdbEnabled, setWifiAdbEnabled] = useState(false);
  const [wifiAdbPort, setWifiAdbPort] = useState<string>('');
  const [deviceIp, setDeviceIp] = useState<string>('');
  const [pairingPort, setPairingPort] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [checkingWifi, setCheckingWifi] = useState(false);

  // Terminal
  const [termMode, setTermMode] = useState<TerminalMode>('shell');
  const [history, setHistory] = useState<CommandEntry[]>([]);
  const [currentCmd, setCurrentCmd] = useState('');
  const [cmdRunning, setCmdRunning] = useState(false);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<ScrollView>(null);

  // Activity Launcher
  const [activities, setActivities] = useState<ActivityInfo[]>([]);
  const [activitySearch, setActivitySearch] = useState('');
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [launchingActivity, setLaunchingActivity] = useState<string | null>(null);

  useEffect(() => {
    init();
    const connSub = Shizuku.onConnected(() => {
      setShizukuReady(true);
      checkAll();
    });
    const discSub = Shizuku.onDisconnected(() => setShizukuReady(false));
    return () => { connSub.remove(); discSub.remove(); };
  }, []);

  const init = async () => {
    const ok = await Shizuku.checkPermission();
    setShizukuReady(ok);
    if (ok) checkAll();
  };

  const checkAll = async () => {
    await checkRootStatus();
    await checkWirelessDebugging();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await init();
    setRefreshing(false);
  };

  // ── Root Detection ────────────────────────────────────────
  const checkRootStatus = async () => {
    setCheckingRoot(true);
    try {
      const suCheck = (await Shizuku.executeCommand('which su 2>/dev/null; su --version 2>/dev/null | head -1')).output;
      const hasSu = suCheck.trim().length > 0 && !suCheck.includes('not found');
      setSuBinary(hasSu);

      const magiskCheck = (await Shizuku.executeCommand(
        'pm list packages | grep -E "io.github.vvb2060.magisk|com.topjohnwu.magisk|io.github.huskydg.magisk" 2>/dev/null'
      )).output;
      const hasMagisk = magiskCheck.trim().length > 0;
      setMagiskInstalled(hasMagisk);

      if (hasMagisk) {
        const versionCheck = (await Shizuku.executeCommand(
          'dumpsys package com.topjohnwu.magisk 2>/dev/null | grep versionName | head -1 || ' +
          'dumpsys package io.github.huskydg.magisk 2>/dev/null | grep versionName | head -1'
        )).output;
        const match = versionCheck.match(/versionName=([^\s]+)/);
        setMagiskVersion(match ? match[1] : 'Installed');
      } else {
        setMagiskVersion(null);
      }

      const twrpCheck = (await Shizuku.executeCommand(
        'ls /system/etc/recovery.fstab 2>/dev/null; ls /cache/recovery 2>/dev/null; getprop ro.build.type 2>/dev/null'
      )).output;
      setTwrpInstalled(twrpCheck.includes('recovery.fstab') || twrpCheck.includes('/cache/recovery'));

      setRootStatus(hasSu || hasMagisk ? 'rooted' : 'unrooted');
    } catch {
      setRootStatus('unknown');
    } finally {
      setCheckingRoot(false);
    }
  };

  // ── Wireless Debugging ────────────────────────────────────
  const checkWirelessDebugging = async () => {
    setCheckingWifi(true);
    try {
      const adbState = (await Shizuku.executeCommand('settings get global adb_wifi_enabled 2>/dev/null')).output;
      setWifiAdbEnabled(adbState.trim() === '1');

      const ip = (await Shizuku.executeCommand(
        'ip route get 1 2>/dev/null | awk \'{print $7}\' | head -1'
      )).output;
      setDeviceIp(ip.trim() || 'Unknown');

      const port = (await Shizuku.executeCommand(
        'getprop service.adb.tcp.port 2>/dev/null'
      )).output;
      setWifiAdbPort(port.trim() || '5555');
    } catch {
      setDeviceIp('Unknown');
    } finally {
      setCheckingWifi(false);
    }
  };

  const toggleWirelessDebugging = async () => {
    if (!shizukuReady) {
      Alert.alert('Shizuku Required', 'Enable Shizuku to toggle wireless debugging.');
      return;
    }
    try {
      if (wifiAdbEnabled) {
        await Shizuku.executeCommand('settings put global adb_wifi_enabled 0');
        setWifiAdbEnabled(false);
      } else {
        await Shizuku.executeCommand('settings put global adb_wifi_enabled 1');
        setWifiAdbEnabled(true);
        await checkWirelessDebugging();
      }
    } catch {
      Alert.alert('Error', 'Failed to toggle wireless debugging.');
    }
  };

  const triggerPairingNotification = async () => {
    if (!shizukuReady) return;
    Alert.alert(
      'Wireless Pairing',
      'Go to Developer Options → Wireless Debugging → Pair device with pairing code.\n\n' +
      'Then enter the 6-digit code shown in the notification here.',
      [
        { text: 'Open Developer Options', onPress: () => Linking.openSettings() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ── Terminal ──────────────────────────────────────────────
  const runCommand = async () => {
    if (!currentCmd.trim() || cmdRunning) return;
    const cmd = currentCmd.trim();
    setCurrentCmd('');
    setCmdRunning(true);
    setCmdHistory(prev => [cmd, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);

    const entry: CommandEntry = {
      id: Date.now().toString(),
      input: cmd,
      output: '',
      isError: false,
      timestamp: Date.now(),
    };

    if (!shizukuReady) {
      entry.output = 'Error: Shizuku not available. Grant Shizuku permission first.';
      entry.isError = true;
      setHistory(prev => [...prev, entry]);
      setCmdRunning(false);
      return;
    }

    try {
      const output = (await Shizuku.executeCommand(cmd)).output;
      entry.output = output.trim() || '(no output)';
    } catch (err: any) {
      entry.output = err?.message || 'Command failed';
      entry.isError = true;
    }

    setHistory(prev => [...prev, entry]);
    setCmdRunning(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const clearTerminal = () => setHistory([]);

  const QUICK_CMDS = [
    { label: 'ADB state', cmd: 'getprop sys.usb.state' },
    { label: 'IP addr', cmd: 'ip addr show wlan0 | grep inet' },
    { label: 'ADB port', cmd: 'getprop service.adb.tcp.port' },
    { label: 'Fastboot mode', cmd: 'getprop ro.bootmode' },
    { label: 'Build info', cmd: 'getprop ro.build.display.id' },
    { label: 'CPU info', cmd: 'cat /proc/cpuinfo | grep "Hardware" | head -1' },
    { label: 'Kernel', cmd: 'uname -r' },
    { label: 'Uptime', cmd: 'uptime' },
    { label: 'Memory', cmd: 'cat /proc/meminfo | head -6' },
    { label: 'Partitions', cmd: 'df -h | head -15' },
    { label: 'USB config', cmd: 'getprop sys.usb.config' },
    { label: 'ADB enabled', cmd: 'settings get global adb_enabled' },
  ];

  // ── Activity Launcher ─────────────────────────────────────
  const loadActivities = async () => {
    if (!shizukuReady) {
      Alert.alert('Shizuku Required', 'Shizuku permission is needed to list activities.');
      return;
    }
    setLoadingActivities(true);
    try {
      const raw = (await Shizuku.executeCommand(
        'pm query-activities -a android.intent.action.MAIN --include-stopped-packages 2>/dev/null | grep -E "^\\s+Activity" | head -200'
      )).output;
      const lines = raw.split('\n').filter(l => l.includes('Activity'));
      const parsed: ActivityInfo[] = lines.map(l => {
        const match = l.match(/Activity\{[^ ]+ ([^/]+)\/([^}]+)\}/);
        if (!match) return null;
        return {
          packageName: match[1],
          activityName: match[2],
          label: match[2].split('.').pop() || match[2],
        };
      }).filter(Boolean) as ActivityInfo[];
      setActivities(parsed.length > 0 ? parsed : await loadActivitiesFallback());
    } catch {
      setActivities(await loadActivitiesFallback());
    } finally {
      setLoadingActivities(false);
    }
  };

  const loadActivitiesFallback = async (): Promise<ActivityInfo[]> => {
    try {
      const pkgs = (await Shizuku.executeCommand('pm list packages -3 2>/dev/null | head -50')).output;
      return pkgs.split('\n')
        .filter(l => l.startsWith('package:'))
        .map(l => {
          const pkg = l.replace('package:', '').trim();
          return { packageName: pkg, activityName: `${pkg}.MainActivity`, label: 'MainActivity' };
        });
    } catch {
      return [];
    }
  };

  const launchActivity = async (act: ActivityInfo) => {
    if (!shizukuReady) return;
    setLaunchingActivity(act.activityName);
    try {
      const result = (await Shizuku.executeCommand(
        `am start -n "${act.packageName}/${act.activityName}" 2>&1`
      )).output;
      if (result.includes('Error') || result.includes('error')) {
        Alert.alert('Launch Failed', result.slice(0, 200));
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to launch activity');
    } finally {
      setLaunchingActivity(null);
    }
  };

  const filteredActivities = activities.filter(a =>
    activitySearch.length === 0 ||
    a.packageName.toLowerCase().includes(activitySearch.toLowerCase()) ||
    a.activityName.toLowerCase().includes(activitySearch.toLowerCase())
  );

  // ── Power ─────────────────────────────────────────────────
  const powerAction = async (action: string, label: string) => {
    if (!shizukuReady) {
      Alert.alert('Shizuku Required', `Need Shizuku to ${label.toLowerCase()}.`);
      return;
    }
    Alert.alert(
      `Confirm ${label}`,
      `Are you sure you want to ${label.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: 'destructive',
          onPress: async () => {
            try {
              await Shizuku.executeCommand(action);
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Power action failed');
            }
          },
        },
      ]
    );
  };

  // ── Render Helpers ─────────────────────────────────────────
  const renderRootStatus = () => (
    <ScrollView
      style={styles.sectionScroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
    >
      {/* Shizuku Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          <Ionicons name="key" size={14} color={COLORS.blue} />  Shizuku Control
        </Text>
        <View style={styles.row}>
          <View style={[styles.statusDot, { backgroundColor: shizukuReady ? COLORS.green : COLORS.red }]} />
          <Text style={styles.statusLabel}>
            {shizukuReady ? 'Shizuku Active & Granted' : 'Shizuku Not Ready'}
          </Text>
        </View>
        {!shizukuReady && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => Shizuku.requestPermission()}>
            <Ionicons name="key-outline" size={16} color={COLORS.bg} />
            <Text style={styles.actionBtnText}>Grant Shizuku Permission</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Root Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            <Ionicons name="shield" size={14} color={COLORS.orange} />  Root Status
          </Text>
          <TouchableOpacity onPress={checkRootStatus} style={styles.refreshBtn}>
            {checkingRoot
              ? <ActivityIndicator size="small" color={COLORS.green} />
              : <Ionicons name="refresh" size={16} color={COLORS.green} />
            }
          </TouchableOpacity>
        </View>

        <View style={styles.rootBadge}>
          <Ionicons
            name={rootStatus === 'rooted' ? 'lock-open' : rootStatus === 'unrooted' ? 'lock-closed' : 'help-circle'}
            size={32}
            color={rootStatus === 'rooted' ? COLORS.orange : rootStatus === 'unrooted' ? COLORS.green : COLORS.dim}
          />
          <Text style={[styles.rootLabel, {
            color: rootStatus === 'rooted' ? COLORS.orange : rootStatus === 'unrooted' ? COLORS.green : COLORS.dim
          }]}>
            {rootStatus === 'rooted' ? 'ROOTED' : rootStatus === 'unrooted' ? 'NOT ROOTED' : 'UNKNOWN'}
          </Text>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Ionicons name={suBinary ? 'checkmark-circle' : 'close-circle'} size={18}
              color={suBinary ? COLORS.orange : COLORS.dim} />
            <Text style={styles.detailLabel}>SU Binary</Text>
            <Text style={[styles.detailValue, { color: suBinary ? COLORS.orange : COLORS.dim }]}>
              {suBinary ? 'Found' : 'Not Found'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name={magiskInstalled ? 'checkmark-circle' : 'close-circle'} size={18}
              color={magiskInstalled ? COLORS.purple : COLORS.dim} />
            <Text style={styles.detailLabel}>Magisk</Text>
            <Text style={[styles.detailValue, { color: magiskInstalled ? COLORS.purple : COLORS.dim }]}>
              {magiskInstalled ? (magiskVersion || 'Installed') : 'Not Found'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name={twrpInstalled ? 'checkmark-circle' : 'close-circle'} size={18}
              color={twrpInstalled ? COLORS.blue : COLORS.dim} />
            <Text style={styles.detailLabel}>TWRP</Text>
            <Text style={[styles.detailValue, { color: twrpInstalled ? COLORS.blue : COLORS.dim }]}>
              {twrpInstalled ? 'Detected' : 'Not Detected'}
            </Text>
          </View>
        </View>

        {!shizukuReady && (
          <Text style={styles.hintText}>Enable Shizuku for full root detection</Text>
        )}
      </View>

      {/* Power Menu */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          <Ionicons name="power" size={14} color={COLORS.red} />  Power
        </Text>
        <View style={styles.powerGrid}>
          <TouchableOpacity style={[styles.powerBtn, { borderColor: COLORS.red }]}
            onPress={() => powerAction('reboot', 'Reboot')}>
            <Ionicons name="refresh-circle" size={28} color={COLORS.red} />
            <Text style={[styles.powerLabel, { color: COLORS.red }]}>Reboot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.powerBtn, { borderColor: COLORS.orange }]}
            onPress={() => powerAction('reboot recovery', 'Reboot to Recovery')}>
            <Ionicons name="medkit" size={28} color={COLORS.orange} />
            <Text style={[styles.powerLabel, { color: COLORS.orange }]}>Recovery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.powerBtn, { borderColor: COLORS.blue }]}
            onPress={() => powerAction('reboot bootloader', 'Reboot to Bootloader')}>
            <Ionicons name="hardware-chip" size={28} color={COLORS.blue} />
            <Text style={[styles.powerLabel, { color: COLORS.blue }]}>Bootloader</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.powerBtn, { borderColor: COLORS.purple }]}
            onPress={() => powerAction('svc power shutdown', 'Power Off')}>
            <Ionicons name="power" size={28} color={COLORS.purple} />
            <Text style={[styles.powerLabel, { color: COLORS.purple }]}>Power Off</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderTerminal = () => (
    <View style={styles.termContainer}>
      {/* Mode tabs */}
      <View style={styles.termModeTabs}>
        <TouchableOpacity
          style={[styles.termModeTab, termMode === 'shell' && styles.termModeTabActive]}
          onPress={() => setTermMode('shell')}>
          <Text style={[styles.termModeLabel, termMode === 'shell' && styles.termModeLabelActive]}>
            ADB Shell
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.termModeTab, termMode === 'wireless' && styles.termModeTabActive]}
          onPress={() => { setTermMode('wireless'); checkWirelessDebugging(); }}>
          <Text style={[styles.termModeLabel, termMode === 'wireless' && styles.termModeLabelActive]}>
            Wireless Debug
          </Text>
        </TouchableOpacity>
      </View>

      {termMode === 'shell' ? (
        <>
          {/* Quick commands */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickBar}>
            {QUICK_CMDS.map(q => (
              <TouchableOpacity key={q.cmd} style={styles.quickChip}
                onPress={() => setCurrentCmd(q.cmd)}>
                <Text style={styles.quickChipText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Output area */}
          <ScrollView ref={scrollRef} style={styles.termOutput}>
            {history.length === 0 && (
              <Text style={styles.termHint}>
                {'▶ ADB Shell via Shizuku\n'
                  + '  Run any shell command directly on-device.\n'
                  + '  Shizuku grants root-equivalent access.\n'
                  + '  Use quick commands above or type below.'}
              </Text>
            )}
            {history.map(h => (
              <View key={h.id} style={styles.termEntry}>
                <Text style={styles.termPromptLine}>
                  <Text style={styles.termPromptSym}>$ </Text>
                  <Text style={styles.termInput}>{h.input}</Text>
                </Text>
                <Text style={[styles.termOutputText, h.isError && styles.termOutputErr]}>
                  {h.output}
                </Text>
              </View>
            ))}
            {cmdRunning && (
              <View style={styles.termRunning}>
                <ActivityIndicator size="small" color={COLORS.termText} />
                <Text style={styles.termRunningText}> Running…</Text>
              </View>
            )}
          </ScrollView>

          {/* Input row */}
          <View style={styles.termInputRow}>
            <Text style={styles.termInputPrompt}>$</Text>
            <TextInput
              style={styles.termTextInput}
              value={currentCmd}
              onChangeText={setCurrentCmd}
              onSubmitEditing={runCommand}
              placeholder="Enter command…"
              placeholderTextColor={COLORS.dim}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={runCommand} style={styles.termRunBtn} disabled={cmdRunning}>
              <Ionicons name="play" size={18} color={cmdRunning ? COLORS.dim : COLORS.green} />
            </TouchableOpacity>
            <TouchableOpacity onPress={clearTerminal} style={styles.termClearBtn}>
              <Ionicons name="trash" size={18} color={COLORS.dim} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* Wireless Debugging Info */
        <ScrollView style={styles.sectionScroll}
          refreshControl={<RefreshControl refreshing={checkingWifi} onRefresh={checkWirelessDebugging} tintColor={COLORS.green} />}>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Ionicons name="wifi" size={14} color={COLORS.blue} />  Wireless Debugging Status
            </Text>
            <View style={styles.row}>
              <View style={[styles.statusDot, { backgroundColor: wifiAdbEnabled ? COLORS.green : COLORS.red }]} />
              <Text style={styles.statusLabel}>
                {wifiAdbEnabled ? 'Wireless Debugging ON' : 'Wireless Debugging OFF'}
              </Text>
            </View>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: wifiAdbEnabled ? COLORS.red : COLORS.green }]}
              onPress={toggleWirelessDebugging}>
              <Ionicons name={wifiAdbEnabled ? 'wifi-outline' : 'wifi'} size={16} color={COLORS.bg} />
              <Text style={styles.actionBtnText}>
                {wifiAdbEnabled ? 'Disable Wireless Debug' : 'Enable Wireless Debug'}
              </Text>
            </TouchableOpacity>
          </View>

          {wifiAdbEnabled && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                <Ionicons name="link" size={14} color={COLORS.green} />  Connection Info
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Device IP</Text>
                <Text style={styles.infoVal}>{deviceIp}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>ADB Port</Text>
                <Text style={styles.infoVal}>{wifiAdbPort || '5555'}</Text>
              </View>
              <View style={styles.adbConnectBox}>
                <Text style={styles.adbConnectLabel}>Connect from PC:</Text>
                <Text style={styles.adbConnectCmd}>
                  {`adb connect ${deviceIp}:${wifiAdbPort || '5555'}`}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Ionicons name="qr-code" size={14} color={COLORS.orange} />  Pairing Code (Android 11+)
            </Text>
            <Text style={styles.hintText}>
              1. Go to Developer Options → Wireless Debugging{'\n'}
              2. Tap "Pair device with pairing code"{'\n'}
              3. A notification will show a 6-digit code + port{'\n'}
              4. On PC run: adb pair {'<IP>:<port>'}
            </Text>
            <View style={styles.pairingRow}>
              <TextInput
                style={styles.pairingInput}
                placeholder="Port (e.g. 37155)"
                placeholderTextColor={COLORS.dim}
                value={pairingPort}
                onChangeText={setPairingPort}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.pairingInput}
                placeholder="6-digit code"
                placeholderTextColor={COLORS.dim}
                value={pairingCode}
                onChangeText={setPairingCode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
            {pairingPort && pairingCode.length === 6 && (
              <View style={styles.adbConnectBox}>
                <Text style={styles.adbConnectLabel}>Run on PC:</Text>
                <Text style={styles.adbConnectCmd}>
                  {`adb pair ${deviceIp}:${pairingPort} ${pairingCode}`}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.actionBtn} onPress={triggerPairingNotification}>
              <Ionicons name="notifications" size={16} color={COLORS.bg} />
              <Text style={styles.actionBtnText}>Open Developer Options</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Ionicons name="flash" size={14} color={COLORS.yellow} />  Fastboot Commands
            </Text>
            <Text style={styles.hintText}>Fastboot requires bootloader mode (power off → hold Vol Down + Power).</Text>
            {[
              { cmd: 'fastboot devices', desc: 'List connected fastboot devices' },
              { cmd: 'fastboot oem unlock', desc: 'Unlock bootloader (WIPES DATA)' },
              { cmd: 'fastboot flash recovery twrp.img', desc: 'Flash TWRP recovery' },
              { cmd: 'fastboot reboot', desc: 'Reboot from fastboot mode' },
              { cmd: 'fastboot reboot-bootloader', desc: 'Return to fastboot' },
            ].map(item => (
              <View key={item.cmd} style={styles.fastbootItem}>
                <Text style={styles.fastbootCmd}>{item.cmd}</Text>
                <Text style={styles.fastbootDesc}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );

  const renderActivityLauncher = () => (
    <View style={styles.sectionFill}>
      <View style={styles.activityHeader}>
        <TextInput
          style={styles.activitySearch}
          placeholder="Search package or activity…"
          placeholderTextColor={COLORS.dim}
          value={activitySearch}
          onChangeText={setActivitySearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.loadBtn} onPress={loadActivities}>
          {loadingActivities
            ? <ActivityIndicator size="small" color={COLORS.bg} />
            : <Text style={styles.loadBtnText}>Load</Text>
          }
        </TouchableOpacity>
      </View>

      {activities.length === 0 && !loadingActivities && (
        <View style={styles.emptyState}>
          <Ionicons name="apps" size={48} color={COLORS.dim} />
          <Text style={styles.emptyLabel}>Activity Launcher</Text>
          <Text style={styles.emptyHint}>
            Browse and launch any app activity directly.{'\n'}
            Requires Shizuku permission.
          </Text>
          <TouchableOpacity style={styles.actionBtn} onPress={loadActivities}>
            <Ionicons name="refresh" size={16} color={COLORS.bg} />
            <Text style={styles.actionBtnText}>Load Activities</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredActivities}
        keyExtractor={(item) => `${item.packageName}/${item.activityName}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.activityItem}
            onPress={() => launchActivity(item)}
            disabled={launchingActivity === item.activityName}>
            <View style={styles.activityIcon}>
              <Ionicons name="rocket" size={20} color={COLORS.blue} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityName} numberOfLines={1}>{item.label}</Text>
              <Text style={styles.activityPkg} numberOfLines={1}>{item.packageName}</Text>
              <Text style={styles.activityClass} numberOfLines={1}>{item.activityName}</Text>
            </View>
            {launchingActivity === item.activityName
              ? <ActivityIndicator size="small" color={COLORS.green} />
              : <Ionicons name="play-circle" size={24} color={COLORS.green} />
            }
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        style={{ flex: 1 }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Root & Control</Text>
          <Text style={styles.headerSub}>DPHMS · Power Tools</Text>
        </View>
        <DonateButton />
      </View>

      {/* Section Nav */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navBar}>
        {([
          { key: 'root', icon: 'shield', label: 'Root' },
          { key: 'terminal', icon: 'terminal', label: 'Terminal' },
          { key: 'activity', icon: 'rocket', label: 'Launcher' },
          { key: 'power', icon: 'power', label: 'Power' },
        ] as { key: Section; icon: string; label: string }[]).map(nav => (
          <TouchableOpacity
            key={nav.key}
            style={[styles.navItem, section === nav.key && styles.navItemActive]}
            onPress={() => setSection(nav.key)}>
            <Ionicons name={nav.icon as any} size={16}
              color={section === nav.key ? COLORS.bg : COLORS.textDim} />
            <Text style={[styles.navLabel, section === nav.key && styles.navLabelActive]}>
              {nav.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {section === 'root' && renderRootStatus()}
      {section === 'terminal' && renderTerminal()}
      {section === 'activity' && renderActivityLauncher()}
      {section === 'power' && (
        <ScrollView style={styles.sectionScroll}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Ionicons name="power" size={14} color={COLORS.red} />  Power Management
            </Text>
            <Text style={styles.hintText}>All power actions require Shizuku permission.</Text>
            <View style={styles.powerGrid}>
              <TouchableOpacity style={[styles.powerBtnLg, { borderColor: COLORS.red }]}
                onPress={() => powerAction('reboot', 'Reboot')}>
                <Ionicons name="refresh-circle" size={36} color={COLORS.red} />
                <Text style={[styles.powerLabelLg, { color: COLORS.red }]}>Reboot</Text>
                <Text style={styles.powerHint}>Normal restart</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.powerBtnLg, { borderColor: COLORS.orange }]}
                onPress={() => powerAction('reboot recovery', 'Reboot to Recovery')}>
                <Ionicons name="medkit" size={36} color={COLORS.orange} />
                <Text style={[styles.powerLabelLg, { color: COLORS.orange }]}>Recovery</Text>
                <Text style={styles.powerHint}>TWRP / Stock recovery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.powerBtnLg, { borderColor: COLORS.blue }]}
                onPress={() => powerAction('reboot bootloader', 'Reboot to Bootloader')}>
                <Ionicons name="hardware-chip" size={36} color={COLORS.blue} />
                <Text style={[styles.powerLabelLg, { color: COLORS.blue }]}>Bootloader</Text>
                <Text style={styles.powerHint}>Fastboot / Odin mode</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.powerBtnLg, { borderColor: COLORS.purple }]}
                onPress={() => powerAction('svc power shutdown', 'Power Off')}>
                <Ionicons name="power" size={36} color={COLORS.purple} />
                <Text style={[styles.powerLabelLg, { color: COLORS.purple }]}>Shutdown</Text>
                <Text style={styles.powerHint}>Complete power off</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Ionicons name="battery-charging" size={14} color={COLORS.yellow} />  Battery
            </Text>
            {[
              { label: 'Battery level', cmd: 'dumpsys battery | grep level' },
              { label: 'Battery health', cmd: 'dumpsys battery | grep health' },
              { label: 'Charging status', cmd: 'dumpsys battery | grep status' },
              { label: 'Battery temp', cmd: 'dumpsys battery | grep temperature' },
            ].map(item => (
              <TouchableOpacity key={item.label} style={styles.fastbootItem}
                onPress={() => { setSection('terminal'); setCurrentCmd(item.cmd); }}>
                <Text style={styles.fastbootCmd}>{item.label}</Text>
                <Text style={styles.fastbootDesc}>{item.cmd}</Text>
              </TouchableOpacity>
            ))}
          </View>
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

  navBar: { flexGrow: 0, paddingHorizontal: 12, paddingVertical: 10, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: COLORS.card, borderRadius: 20, marginRight: 8,
  },
  navItemActive: { backgroundColor: COLORS.green },
  navLabel: { fontSize: 12, color: COLORS.textDim, fontWeight: '600' },
  navLabelActive: { color: COLORS.bg },

  sectionScroll: { flex: 1, padding: 12 },
  sectionFill: { flex: 1 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  refreshBtn: { padding: 4 },

  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 14, color: COLORS.text, fontWeight: '500' },

  rootBadge: { alignItems: 'center', paddingVertical: 16 },
  rootLabel: { fontSize: 20, fontWeight: '800', marginTop: 6, letterSpacing: 2 },

  detailGrid: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  detailItem: { alignItems: 'center', gap: 4 },
  detailLabel: { fontSize: 11, color: COLORS.textDim },
  detailValue: { fontSize: 12, fontWeight: '600' },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.green, borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 16, marginTop: 10,
  },
  actionBtnText: { color: COLORS.bg, fontWeight: '700', fontSize: 14 },

  powerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  powerBtn: {
    flex: 1, minWidth: '40%', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 10, borderWidth: 1.5,
    backgroundColor: '#050505', gap: 4,
  },
  powerLabel: { fontSize: 12, fontWeight: '700' },
  powerBtnLg: {
    flex: 1, minWidth: '42%', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, borderRadius: 12, borderWidth: 1.5,
    backgroundColor: '#050505', gap: 4, marginBottom: 4,
  },
  powerLabelLg: { fontSize: 14, fontWeight: '700' },
  powerHint: { fontSize: 11, color: COLORS.textDim, textAlign: 'center' },

  hintText: { fontSize: 12, color: COLORS.textDim, lineHeight: 18, marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoKey: { fontSize: 13, color: COLORS.textDim },
  infoVal: { fontSize: 13, color: COLORS.green, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  adbConnectBox: {
    backgroundColor: COLORS.termBg, borderRadius: 8, padding: 10, marginTop: 10,
  },
  adbConnectLabel: { fontSize: 11, color: COLORS.textDim, marginBottom: 4 },
  adbConnectCmd: {
    fontSize: 13, color: COLORS.termText, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  pairingRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pairingInput: {
    flex: 1, backgroundColor: COLORS.termBg, borderRadius: 8, padding: 10,
    color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fastbootItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  fastbootCmd: { fontSize: 13, color: COLORS.termText, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  fastbootDesc: { fontSize: 11, color: COLORS.textDim, marginTop: 2 },

  // Terminal
  termContainer: { flex: 1, backgroundColor: COLORS.termBg },
  termModeTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  termModeTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  termModeTabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.green },
  termModeLabel: { fontSize: 13, color: COLORS.textDim, fontWeight: '600' },
  termModeLabelActive: { color: COLORS.green },
  quickBar: { flexGrow: 0, paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  quickChip: {
    backgroundColor: '#1a1a1a', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5,
    marginRight: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  quickChipText: { fontSize: 11, color: COLORS.blue },
  termOutput: { flex: 1, padding: 10 },
  termHint: {
    fontSize: 13, color: COLORS.dim, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 20,
  },
  termEntry: { marginBottom: 10 },
  termPromptLine: { flexDirection: 'row' },
  termPromptSym: { color: COLORS.termPrompt, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 13 },
  termInput: { color: COLORS.text, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 13 },
  termOutputText: {
    color: COLORS.termText, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12, marginTop: 2, lineHeight: 18,
  },
  termOutputErr: { color: COLORS.termErr },
  termRunning: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  termRunningText: { color: COLORS.dim, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12 },
  termInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  termInputPrompt: { color: COLORS.termPrompt, fontSize: 16, fontWeight: '700', marginRight: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  termTextInput: {
    flex: 1, color: COLORS.text, fontSize: 13, paddingVertical: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  termRunBtn: { padding: 6, marginLeft: 4 },
  termClearBtn: { padding: 6 },

  // Activity Launcher
  activityHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 10,
    gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  activitySearch: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 8, color: COLORS.text, fontSize: 13,
    borderWidth: 1, borderColor: COLORS.border,
  },
  loadBtn: {
    backgroundColor: COLORS.green, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  loadBtnText: { color: COLORS.bg, fontWeight: '700', fontSize: 13 },
  activityItem: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: COLORS.card, gap: 10,
  },
  activityIcon: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#0a2a3a',
    alignItems: 'center', justifyContent: 'center',
  },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  activityPkg: { fontSize: 11, color: COLORS.textDim, marginTop: 1 },
  activityClass: { fontSize: 10, color: COLORS.dim, marginTop: 1 },
  separator: { height: 1, backgroundColor: COLORS.border },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyLabel: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptyHint: { fontSize: 13, color: COLORS.textDim, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
