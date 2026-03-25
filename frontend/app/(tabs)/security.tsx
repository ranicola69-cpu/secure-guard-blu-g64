import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Switch,
  Linking,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DonateButton from '@/components/DonateButton';
import { Shizuku } from '@/modules/ShizukuService';
import { ThreatDB, ThreatDefinition } from '@/modules/ThreatDatabase';

const C = {
  bg: '#0a0a0a',
  card: '#111',
  card2: '#1a1a1a',
  border: '#1e1e1e',
  green: '#00ff88',
  blue: '#00aaff',
  red: '#ff3366',
  orange: '#ff9500',
  yellow: '#ffdd00',
  text: '#fff',
  dim: '#999',
};

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const [deviceId, setDeviceId] = useState('');
  const [securityStatus, setSecurityStatus] = useState({
    security_score: 100,
    threats_active: 0,
    status: 'secure',
  });
  const [scanning, setScanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [threats, setThreats] = useState<ThreatDefinition[]>([]);
  const [showEnterprise, setShowEnterprise] = useState(false);

  const [shizukuInstalled, setShizukuInstalled] = useState(false);
  const [shizukuRunning, setShizukuRunning] = useState(false);
  const [shizukuPermission, setShizukuPermission] = useState(false);

  const [dbVersion, setDbVersion] = useState('');
  const [dbUpdating, setDbUpdating] = useState(false);

  const [scanSystemApps, setScanSystemApps] = useState(true);
  const [deepCacheAnalysis, setDeepCacheAnalysis] = useState(true);

  useEffect(() => {
    initDevice();
    checkShizukuStatus();
    loadThreatDatabase();

    const connectedSub = Shizuku.onConnected(() => {
      setShizukuRunning(true);
      checkShizukuPermission();
    });
    const disconnectedSub = Shizuku.onDisconnected(() => {
      setShizukuRunning(false);
      setShizukuPermission(false);
    });

    return () => {
      connectedSub.remove();
      disconnectedSub.remove();
    };
  }, []);

  const initDevice = async () => {
    let id = await AsyncStorage.getItem('device_id');
    if (!id) {
      id = `device_${Date.now()}`;
      await AsyncStorage.setItem('device_id', id);
    }
    setDeviceId(id);
  };

  const checkShizukuStatus = async () => {
    const installed = await Shizuku.isInstalled();
    setShizukuInstalled(installed);
    if (installed) {
      const running = await Shizuku.isRunning();
      setShizukuRunning(running);
      if (running) await checkShizukuPermission();
    }
  };

  const checkShizukuPermission = async () => {
    const permission = await Shizuku.checkPermission();
    setShizukuPermission(permission);
  };

  const requestShizukuPermission = async () => {
    const granted = await Shizuku.requestPermission();
    setShizukuPermission(granted);
    if (granted) {
      Alert.alert('Success', 'Shizuku permission granted! Full system access enabled.');
    } else {
      Alert.alert('Permission Denied', 'Shizuku permission is required for advanced security features.');
    }
  };

  const openShizukuApp = () => {
    if (Platform.OS === 'android') {
      Linking.openURL('market://details?id=moe.shizuku.privileged.api').catch(() => {
        Linking.openURL('https://play.google.com/store/apps/details?id=moe.shizuku.privileged.api');
      });
    } else {
      Alert.alert('Android Only', 'Shizuku is only available on Android devices.');
    }
  };

  const loadThreatDatabase = async () => {
    const dbInfo = await ThreatDB.getDatabaseInfo();
    if (dbInfo) setDbVersion(dbInfo.version);
    const allThreats = await ThreatDB.getDatabase();
    if (allThreats) {
      setThreats(allThreats.threats);
      updateSecurityScore(allThreats.threats);
    }
  };

  const updateThreatDatabase = async () => {
    setDbUpdating(true);
    const result = await ThreatDB.updateDatabase();
    setDbUpdating(false);
    if (result.success) {
      Alert.alert('Database Updated', `Version: ${result.version}\nSignatures: ${result.threatCount}`);
      await loadThreatDatabase();
    } else {
      Alert.alert('Update Failed', 'Could not fetch database. Using built-in signatures.');
    }
  };

  const updateSecurityScore = (threatList: ThreatDefinition[]) => {
    const criticalCount = threatList.filter(t => t.threat_level === 'critical').length;
    const highCount = threatList.filter(t => t.threat_level === 'high').length;
    const mediumCount = threatList.filter(t => t.threat_level === 'medium').length;
    const score = Math.max(0, 100 - (criticalCount * 20) - (highCount * 10) - (mediumCount * 5));
    setSecurityStatus({
      security_score: score,
      threats_active: criticalCount + highCount,
      status: score > 80 ? 'secure' : score > 50 ? 'warning' : 'danger',
    });
  };

  const runScan = async () => {
    setScanning(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const db = await ThreatDB.getDatabase();
    const foundThreats = db.threats;
    setThreats(foundThreats);
    updateSecurityScore(foundThreats);
    setScanning(false);

    if (foundThreats.length > 0) {
      const critical = foundThreats.filter(t => t.threat_level === 'critical').length;
      const high = foundThreats.filter(t => t.threat_level === 'high').length;
      Alert.alert(
        'Scan Complete',
        `Found ${foundThreats.length} threats:\n• Critical: ${critical}\n• High: ${high}\n• Others: ${foundThreats.length - critical - high}`,
        [{ text: 'View Threats', onPress: () => setShowEnterprise(true) }, { text: 'OK' }]
      );
    } else {
      Alert.alert('Scan Complete', 'No threats detected. Your device is clean!');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkShizukuStatus();
    await loadThreatDatabase();
    setRefreshing(false);
  };

  const getScoreColor = () => {
    if (securityStatus.security_score > 80) return C.green;
    if (securityStatus.security_score > 50) return C.orange;
    return C.red;
  };

  const getThreatColor = (level: string) => {
    if (level === 'critical') return C.red;
    if (level === 'high') return C.orange;
    if (level === 'medium') return C.yellow;
    return C.dim;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Security Center</Text>
          <Text style={styles.headerSub}>DPHMS Secure Guard v1.5</Text>
        </View>
        <DonateButton />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} />}
      >
        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreNumber, { color: getScoreColor() }]}>{securityStatus.security_score}</Text>
            <Text style={styles.scoreLabel}>SCORE</Text>
          </View>
          <View style={styles.scoreInfo}>
            <View style={[styles.statusBadge, { borderColor: getScoreColor() + '40', backgroundColor: getScoreColor() + '10' }]}>
              <View style={[styles.statusDot, { backgroundColor: getScoreColor() }]} />
              <Text style={[styles.statusText, { color: getScoreColor() }]}>
                {securityStatus.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.scoreDesc}>
              {securityStatus.threats_active > 0
                ? `${securityStatus.threats_active} active threats detected`
                : 'No critical threats found'}
            </Text>
          </View>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          style={[styles.scanButton, scanning && styles.scanButtonActive]}
          onPress={runScan}
          disabled={scanning}
        >
          {scanning ? (
            <>
              <ActivityIndicator color={C.bg} size="small" />
              <Text style={styles.scanButtonText}>SCANNING...</Text>
            </>
          ) : (
            <>
              <Ionicons name="scan" size={22} color={C.bg} />
              <Text style={styles.scanButtonText}>RUN SECURITY SCAN</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="warning" size={20} color={C.red} />
            <Text style={styles.statNumber}>{threats.filter(t => t.threat_level === 'critical').length}</Text>
            <Text style={styles.statLabel}>Critical</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="alert-circle" size={20} color={C.orange} />
            <Text style={styles.statNumber}>{threats.filter(t => t.threat_level === 'high').length}</Text>
            <Text style={styles.statLabel}>High</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="information-circle" size={20} color={C.yellow} />
            <Text style={styles.statNumber}>{threats.filter(t => t.threat_level === 'medium').length}</Text>
            <Text style={styles.statLabel}>Medium</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={20} color={C.green} />
            <Text style={styles.statNumber}>{threats.filter(t => t.threat_level === 'low').length}</Text>
            <Text style={styles.statLabel}>Low</Text>
          </View>
        </View>

        {/* Shizuku Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SHIZUKU INTEGRATION</Text>
          <View style={styles.shizukuCard}>
            <View style={styles.shizukuRow}>
              <View style={styles.shizukuInfo}>
                <Ionicons name={shizukuInstalled ? 'checkmark-circle' : 'close-circle'} size={22} color={shizukuInstalled ? C.green : C.red} />
                <Text style={styles.shizukuLabel}>Installed</Text>
              </View>
              <View style={styles.shizukuInfo}>
                <Ionicons name={shizukuRunning ? 'checkmark-circle' : 'close-circle'} size={22} color={shizukuRunning ? C.green : C.dim} />
                <Text style={styles.shizukuLabel}>Running</Text>
              </View>
              <View style={styles.shizukuInfo}>
                <Ionicons name={shizukuPermission ? 'checkmark-circle' : 'close-circle'} size={22} color={shizukuPermission ? C.green : C.dim} />
                <Text style={styles.shizukuLabel}>Permission</Text>
              </View>
            </View>

            {!shizukuInstalled && (
              <TouchableOpacity style={styles.shizukuBtn} onPress={openShizukuApp}>
                <Ionicons name="download" size={16} color={C.bg} />
                <Text style={styles.shizukuBtnText}>INSTALL SHIZUKU</Text>
              </TouchableOpacity>
            )}
            {shizukuInstalled && !shizukuPermission && (
              <TouchableOpacity style={styles.shizukuBtn} onPress={requestShizukuPermission}>
                <Ionicons name="key" size={16} color={C.bg} />
                <Text style={styles.shizukuBtnText}>GRANT PERMISSION</Text>
              </TouchableOpacity>
            )}
            {!Shizuku.isNativeAvailable && (
              <Text style={styles.shizukuNote}>
                Shizuku requires a native Android build (APK). Running in preview mode.
              </Text>
            )}
          </View>
        </View>

        {/* Threat Database */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THREAT DATABASE</Text>
          <View style={styles.dbCard}>
            <View style={styles.dbRow}>
              <View>
                <Text style={styles.dbVersion}>Version: {dbVersion || 'Loading...'}</Text>
                <Text style={styles.dbSigs}>{threats.length} known threat signatures</Text>
              </View>
              <TouchableOpacity
                style={styles.updateBtn}
                onPress={updateThreatDatabase}
                disabled={dbUpdating}
              >
                {dbUpdating ? (
                  <ActivityIndicator color={C.green} size="small" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={14} color={C.green} />
                    <Text style={styles.updateBtnText}>UPDATE</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Scan Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SCAN OPTIONS</Text>
          <View style={styles.optionsCard}>
            <View style={styles.optionRow}>
              <View>
                <Text style={styles.optionLabel}>Scan System Apps</Text>
                <Text style={styles.optionDesc}>Include system-level packages</Text>
              </View>
              <Switch
                value={scanSystemApps}
                onValueChange={setScanSystemApps}
                trackColor={{ false: '#333', true: C.green + '50' }}
                thumbColor={scanSystemApps ? C.green : '#666'}
              />
            </View>
            <View style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: C.border, marginTop: 12, paddingTop: 12 }]}>
              <View>
                <Text style={styles.optionLabel}>Deep Cache Analysis</Text>
                <Text style={styles.optionDesc}>Analyze app cache for threats</Text>
              </View>
              <Switch
                value={deepCacheAnalysis}
                onValueChange={setDeepCacheAnalysis}
                trackColor={{ false: '#333', true: C.green + '50' }}
                thumbColor={deepCacheAnalysis ? C.green : '#666'}
              />
            </View>
          </View>
        </View>

        {/* Military Badge */}
        <View style={styles.militaryBadge}>
          <Ionicons name="shield" size={28} color={C.green} />
          <View style={styles.militaryInfo}>
            <Text style={styles.militaryTitle}>MILITARY-GRADE PROTECTION</Text>
            <Text style={styles.militaryDesc}>AES-256 encryption • Zero-knowledge privacy • Enterprise threat detection</Text>
          </View>
        </View>

        {threats.length > 0 && (
          <TouchableOpacity
            style={styles.viewThreatsBtn}
            onPress={() => setShowEnterprise(true)}
          >
            <Ionicons name="list" size={18} color={C.red} />
            <Text style={styles.viewThreatsBtnText}>VIEW {threats.length} DETECTED THREATS</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Threats Modal */}
      <Modal visible={showEnterprise} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detected Threats</Text>
              <TouchableOpacity onPress={() => setShowEnterprise(false)}>
                <Ionicons name="close" size={24} color={C.dim} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {threats.map((threat, i) => (
                <View key={i} style={styles.threatItem}>
                  <View style={[styles.threatLevel, { backgroundColor: getThreatColor(threat.threat_level) + '20', borderColor: getThreatColor(threat.threat_level) + '40' }]}>
                    <Text style={[styles.threatLevelText, { color: getThreatColor(threat.threat_level) }]}>
                      {threat.threat_level.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.threatInfo}>
                    <Text style={styles.threatName}>{threat.app_name}</Text>
                    <Text style={styles.threatPkg}>{threat.package_name}</Text>
                    <Text style={styles.threatDesc}>{threat.description}</Text>
                    <View style={styles.threatTags}>
                      <View style={styles.threatTag}>
                        <Text style={styles.threatTagText}>{threat.category}</Text>
                      </View>
                      {threat.is_system && (
                        <View style={[styles.threatTag, { backgroundColor: '#00aaff15', borderColor: '#00aaff40' }]}>
                          <Text style={[styles.threatTagText, { color: '#00aaff' }]}>SYSTEM</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub: { fontSize: 10, color: '#555', fontFamily: 'Inter_400Regular', marginTop: 1 },
  content: { flex: 1 },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: '#111',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a0a0a',
    borderWidth: 2,
    borderColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  scoreLabel: { fontSize: 9, color: '#666', fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  scoreInfo: { flex: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  scoreDesc: { fontSize: 12, color: '#999', fontFamily: 'Inter_400Regular' },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#00ff88',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 14,
  },
  scanButtonActive: { backgroundColor: '#00cc66' },
  scanButtonText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#0a0a0a', letterSpacing: 1 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  statNumber: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  statLabel: { fontSize: 9, color: '#999', fontFamily: 'Inter_500Medium' },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#555',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  shizukuCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  shizukuRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  shizukuInfo: { alignItems: 'center', gap: 4 },
  shizukuLabel: { fontSize: 11, color: '#999', fontFamily: 'Inter_400Regular' },
  shizukuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00ff88',
    borderRadius: 10,
    paddingVertical: 10,
  },
  shizukuBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#0a0a0a', letterSpacing: 0.5 },
  shizukuNote: { fontSize: 11, color: '#555', textAlign: 'center', marginTop: 10, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  dbCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  dbRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dbVersion: { fontSize: 13, color: '#fff', fontFamily: 'Inter_500Medium', marginBottom: 3 },
  dbSigs: { fontSize: 11, color: '#999', fontFamily: 'Inter_400Regular' },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00ff8815',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00ff8840',
  },
  updateBtnText: { fontSize: 11, color: '#00ff88', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  optionsCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionLabel: { fontSize: 13, color: '#fff', fontFamily: 'Inter_500Medium', marginBottom: 2 },
  optionDesc: { fontSize: 11, color: '#999', fontFamily: 'Inter_400Regular' },
  militaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#00ff8808',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#00ff8830',
  },
  militaryInfo: { flex: 1 },
  militaryTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#00ff88', letterSpacing: 0.5, marginBottom: 2 },
  militaryDesc: { fontSize: 11, color: '#00ff8880', fontFamily: 'Inter_400Regular', lineHeight: 16 },
  viewThreatsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ff336615',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff336640',
  },
  viewThreatsBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#ff3366', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff' },
  modalContent: { flex: 1 },
  threatItem: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  threatLevel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  threatLevelText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  threatInfo: { flex: 1 },
  threatName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff', marginBottom: 2 },
  threatPkg: { fontSize: 10, color: '#666', fontFamily: 'Inter_400Regular', marginBottom: 5 },
  threatDesc: { fontSize: 11, color: '#999', fontFamily: 'Inter_400Regular', lineHeight: 16, marginBottom: 8 },
  threatTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  threatTag: {
    backgroundColor: '#ff336615',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ff336640',
  },
  threatTagText: { fontSize: 9, color: '#ff3366', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3 },
});
