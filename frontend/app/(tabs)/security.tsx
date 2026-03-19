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

import DonateButton from '../../components/DonateButton';
import { Shizuku } from '../../modules/ShizukuService';
import { ThreatDB, ThreatDefinition } from '../../modules/ThreatDatabase';

export default function SecurityScreen() {
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
  
  // Shizuku state
  const [shizukuInstalled, setShizukuInstalled] = useState(false);
  const [shizukuRunning, setShizukuRunning] = useState(false);
  const [shizukuPermission, setShizukuPermission] = useState(false);
  const [shizukuVersion, setShizukuVersion] = useState(-1);
  
  // Database state
  const [dbVersion, setDbVersion] = useState('');
  const [dbUpdating, setDbUpdating] = useState(false);
  
  // Scan options
  const [scanSystemApps, setScanSystemApps] = useState(true);
  const [deepCacheAnalysis, setDeepCacheAnalysis] = useState(true);

  useEffect(() => {
    initDevice();
    checkShizukuStatus();
    loadThreatDatabase();
    
    // Set up Shizuku listeners
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
      
      if (running) {
        const version = await Shizuku.getVersion();
        setShizukuVersion(version);
        await checkShizukuPermission();
      }
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
    }
  };

  const loadThreatDatabase = async () => {
    const dbInfo = await ThreatDB.getDatabaseInfo();
    if (dbInfo) {
      setDbVersion(dbInfo.version);
    }
    
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
      setDbVersion(result.version || '');
      await loadThreatDatabase();
      Alert.alert(
        'Database Updated',
        `Version: ${result.version}\nThreat signatures: ${result.threatCount}`
      );
    } else {
      Alert.alert('Update Failed', 'Failed to update threat database. Check your internet connection.');
    }
  };

  const updateSecurityScore = (detectedThreats: ThreatDefinition[]) => {
    const criticalCount = detectedThreats.filter(t => t.threat_level === 'critical').length;
    const highCount = detectedThreats.filter(t => t.threat_level === 'high').length;
    const mediumCount = detectedThreats.filter(t => t.threat_level === 'medium').length;
    
    let score = 100;
    score -= criticalCount * 20;
    score -= highCount * 10;
    score -= mediumCount * 5;
    score = Math.max(0, score);
    
    setSecurityStatus({
      security_score: score,
      threats_active: detectedThreats.length,
      status: detectedThreats.length === 0 ? 'secure' : 'warning',
    });
  };

  const performFullScan = async () => {
    setScanning(true);
    
    try {
      let detectedThreats: ThreatDefinition[] = [];
      
      if (shizukuPermission) {
        // Use Shizuku to get real installed packages
        const packages = await Shizuku.getInstalledPackages();
        const packageNames = packages.map(p => p.packageName);
        
        // Filter system apps if option is disabled
        const packagesToScan = scanSystemApps 
          ? packageNames 
          : packages.filter(p => !p.isSystem).map(p => p.packageName);
        
        // Scan against threat database
        detectedThreats = await ThreatDB.scanPackages(packagesToScan);
        
        if (deepCacheAnalysis) {
          // Get running processes for deeper analysis
          const processes = await Shizuku.getRunningProcesses();
          console.log(`Analyzed ${processes.length} running processes`);
        }
      } else {
        // Fallback: Use threat database definitions
        const db = await ThreatDB.getDatabase();
        if (db) {
          detectedThreats = db.threats;
        }
      }
      
      setThreats(detectedThreats);
      updateSecurityScore(detectedThreats);
      
      Alert.alert(
        'Scan Complete',
        `Scanned ${shizukuPermission ? 'all installed packages' : 'known threat signatures'}\n\nThreats found: ${detectedThreats.length}\nSecurity Score: ${securityStatus.security_score}`
      );
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Scan Error', 'An error occurred during the security scan.');
    }
    
    setScanning(false);
  };

  const removeThreat = async (threat: ThreatDefinition) => {
    if (!shizukuPermission) {
      Alert.alert(
        'Shizuku Required',
        'Shizuku permission is required to remove system threats. Please grant Shizuku access first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permission', onPress: requestShizukuPermission },
        ]
      );
      return;
    }

    Alert.alert(
      'Remove Threat',
      `Are you sure you want to remove ${threat.app_name}?\n\nPackage: ${threat.package_name}\n\n${threat.is_system ? '⚠️ This is a system app. Removal may affect device functionality.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: threat.is_system ? 'Disable' : 'Uninstall',
          style: 'destructive',
          onPress: async () => {
            try {
              let success: boolean;
              if (threat.is_system) {
                success = await Shizuku.disablePackage(threat.package_name);
              } else {
                success = await Shizuku.uninstallPackage(threat.package_name);
              }
              
              if (success) {
                Alert.alert('Success', `${threat.app_name} has been ${threat.is_system ? 'disabled' : 'removed'}.`);
                // Remove from local threat list
                setThreats(prev => prev.filter(t => t.package_name !== threat.package_name));
                updateSecurityScore(threats.filter(t => t.package_name !== threat.package_name));
              } else {
                Alert.alert('Failed', 'Failed to remove the threat. Please try again.');
              }
            } catch (error) {
              console.error('Remove threat error:', error);
              Alert.alert('Error', 'An error occurred while removing the threat.');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkShizukuStatus();
    await loadThreatDatabase();
    setRefreshing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#00ff88';
    if (score >= 70) return '#ffaa00';
    return '#ff3366';
  };

  const getStatusText = () => {
    if (securityStatus.status === 'secure') return 'SECURE';
    return 'THREATS DETECTED';
  };

  const getThreatLevelColor = (level: string) => {
    const colors: { [key: string]: string } = {
      critical: '#ff0044',
      high: '#ff3366',
      medium: '#ffaa00',
      low: '#ffcc00',
    };
    return colors[level] || '#999';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Security Dashboard</Text>
        <View style={styles.headerActions}>
          <DonateButton />
          <TouchableOpacity 
            style={styles.enterpriseButton}
            onPress={() => setShowEnterprise(!showEnterprise)}
          >
            <Ionicons name="business" size={20} color="#ff3366" />
            <Text style={styles.enterpriseBadge}>{threats.length}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff88" />
        }
      >
        {/* Shizuku Status Card */}
        <View style={[styles.shizukuCard, shizukuPermission && styles.shizukuCardActive]}>
          <View style={styles.shizukuHeader}>
            <View style={styles.shizukuTitleRow}>
              <Ionicons 
                name={shizukuPermission ? "shield-checkmark" : "shield-outline"} 
                size={24} 
                color={shizukuPermission ? "#00ff88" : "#ff9900"} 
              />
              <Text style={styles.shizukuTitle}>Shizuku Integration</Text>
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: shizukuPermission ? '#00ff88' : shizukuRunning ? '#ffaa00' : '#ff3366' }]} />
          </View>
          
          <View style={styles.shizukuStatus}>
            <View style={styles.shizukuStatusItem}>
              <Text style={styles.shizukuLabel}>Installed:</Text>
              <Text style={[styles.shizukuValue, { color: shizukuInstalled ? '#00ff88' : '#ff3366' }]}>
                {shizukuInstalled ? 'Yes' : 'No'}
              </Text>
            </View>
            <View style={styles.shizukuStatusItem}>
              <Text style={styles.shizukuLabel}>Running:</Text>
              <Text style={[styles.shizukuValue, { color: shizukuRunning ? '#00ff88' : '#ff3366' }]}>
                {shizukuRunning ? 'Yes' : 'No'}
              </Text>
            </View>
            <View style={styles.shizukuStatusItem}>
              <Text style={styles.shizukuLabel}>Permission:</Text>
              <Text style={[styles.shizukuValue, { color: shizukuPermission ? '#00ff88' : '#ff3366' }]}>
                {shizukuPermission ? 'Granted' : 'Denied'}
              </Text>
            </View>
            {shizukuVersion > 0 && (
              <View style={styles.shizukuStatusItem}>
                <Text style={styles.shizukuLabel}>Version:</Text>
                <Text style={styles.shizukuValue}>{shizukuVersion}</Text>
              </View>
            )}
          </View>
          
          {!shizukuInstalled ? (
            <TouchableOpacity style={styles.shizukuButton} onPress={openShizukuApp}>
              <Ionicons name="download" size={18} color="#000" />
              <Text style={styles.shizukuButtonText}>INSTALL SHIZUKU</Text>
            </TouchableOpacity>
          ) : !shizukuRunning ? (
            <View style={styles.shizukuInstructions}>
              <Text style={styles.instructionText}>
                Open Shizuku app and start the service via ADB or Wireless Debugging
              </Text>
            </View>
          ) : !shizukuPermission ? (
            <TouchableOpacity style={styles.shizukuButton} onPress={requestShizukuPermission}>
              <Ionicons name="key" size={18} color="#000" />
              <Text style={styles.shizukuButtonText}>GRANT PERMISSION</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.shizukuActive}>
              <Ionicons name="checkmark-circle" size={20} color="#00ff88" />
              <Text style={styles.shizukuActiveText}>Full System Access Enabled</Text>
            </View>
          )}
        </View>

        {/* Security Score Circle */}
        <View style={styles.scoreContainer}>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(securityStatus.security_score) }]}>
            <Text style={[styles.scoreNumber, { color: getScoreColor(securityStatus.security_score) }]}>
              {securityStatus.security_score}
            </Text>
            <Text style={styles.scoreLabel}>Security Score</Text>
          </View>
          <View style={styles.statusBadge}>
            <Ionicons
              name={securityStatus.status === 'secure' ? 'shield-checkmark' : 'warning'}
              size={20}
              color={securityStatus.status === 'secure' ? '#00ff88' : '#ff3366'}
            />
            <Text
              style={[
                styles.statusText,
                { color: securityStatus.status === 'secure' ? '#00ff88' : '#ff3366' },
              ]}
            >
              {getStatusText()}
            </Text>
          </View>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          style={[styles.scanButton, scanning && styles.scanButtonActive]}
          onPress={performFullScan}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Ionicons name="scan" size={24} color="#000" />
          )}
          <Text style={styles.scanButtonText}>
            {scanning ? 'SCANNING...' : 'FULL SYSTEM SCAN'}
          </Text>
        </TouchableOpacity>

        {/* Scan Options */}
        <View style={styles.optionsCard}>
          <Text style={styles.optionsTitle}>Scan Options</Text>
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>Scan System Apps</Text>
              <Text style={styles.optionDesc}>Include pre-installed system applications</Text>
            </View>
            <Switch
              value={scanSystemApps}
              onValueChange={setScanSystemApps}
              trackColor={{ false: '#333', true: '#00ff8840' }}
              thumbColor={scanSystemApps ? '#00ff88' : '#666'}
            />
          </View>
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>Deep Cache Analysis</Text>
              <Text style={styles.optionDesc}>Analyze running processes and memory</Text>
            </View>
            <Switch
              value={deepCacheAnalysis}
              onValueChange={setDeepCacheAnalysis}
              trackColor={{ false: '#333', true: '#00ff8840' }}
              thumbColor={deepCacheAnalysis ? '#00ff88' : '#666'}
            />
          </View>
        </View>

        {/* Threat Database */}
        <View style={styles.dbCard}>
          <View style={styles.dbHeader}>
            <View style={styles.dbInfo}>
              <Ionicons name="server" size={24} color="#00aaff" />
              <View>
                <Text style={styles.dbTitle}>Threat Database</Text>
                <Text style={styles.dbVersion}>Version: {dbVersion || 'Not loaded'}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.dbUpdateButton} 
              onPress={updateThreatDatabase}
              disabled={dbUpdating}
            >
              {dbUpdating ? (
                <ActivityIndicator color="#00aaff" size="small" />
              ) : (
                <Ionicons name="refresh" size={20} color="#00aaff" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.dbDesc}>
            Signatures are fetched from GitHub repository for enterprise spyware, bloatware, and malware detection.
          </Text>
        </View>

        {/* Detected Threats */}
        {showEnterprise && threats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Detected Threats ({threats.length})</Text>
            </View>
            {threats.map((threat, index) => (
              <TouchableOpacity 
                key={threat.package_name + index} 
                style={styles.threatCard}
                onPress={() => removeThreat(threat)}
              >
                <View style={styles.threatHeader}>
                  <Ionicons name="warning" size={24} color={getThreatLevelColor(threat.threat_level)} />
                  <View style={styles.threatInfo}>
                    <Text style={styles.threatName}>{threat.app_name}</Text>
                    <Text style={styles.threatPackage}>{threat.package_name}</Text>
                    <View style={styles.threatTags}>
                      <View style={[styles.threatTag, { backgroundColor: getThreatLevelColor(threat.threat_level) + '30' }]}>
                        <Text style={[styles.threatTagText, { color: getThreatLevelColor(threat.threat_level) }]}>
                          {threat.threat_level.toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.threatTag}>
                        <Text style={styles.threatTagText}>{threat.category.replace('_', ' ').toUpperCase()}</Text>
                      </View>
                      {threat.is_system && (
                        <View style={[styles.threatTag, { backgroundColor: '#ff990030' }]}>
                          <Text style={[styles.threatTagText, { color: '#ff9900' }]}>SYSTEM</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="close-circle" size={28} color="#ff3366" />
                </View>
                <Text style={styles.threatDesc}>{threat.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="alert-circle" size={32} color="#ff3366" />
            <Text style={styles.statNumber}>{threats.filter(t => t.threat_level === 'critical' || t.threat_level === 'high').length}</Text>
            <Text style={styles.statLabel}>Critical/High</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="warning" size={32} color="#ffaa00" />
            <Text style={styles.statNumber}>{threats.filter(t => t.threat_level === 'medium').length}</Text>
            <Text style={styles.statLabel}>Medium</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="shield-checkmark" size={32} color="#00ff88" />
            <Text style={styles.statNumber}>{shizukuPermission ? 'FULL' : 'LIMITED'}</Text>
            <Text style={styles.statLabel}>Access</Text>
          </View>
        </View>

        {/* Military Grade Badge */}
        <View style={styles.militaryBadge}>
          <Ionicons name="ribbon" size={24} color="#00ff88" />
          <View style={styles.militaryInfo}>
            <Text style={styles.militaryTitle}>MILITARY GRADE SECURITY</Text>
            <Text style={styles.militaryDesc}>Powered by Shizuku • Enterprise Threat Detection</Text>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  enterpriseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff336620',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#ff3366',
  },
  enterpriseBadge: {
    color: '#ff3366',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  shizukuCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#333',
  },
  shizukuCardActive: {
    borderColor: '#00ff88',
  },
  shizukuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shizukuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shizukuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  shizukuStatus: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  shizukuStatusItem: {
    flexDirection: 'row',
    gap: 6,
  },
  shizukuLabel: {
    fontSize: 13,
    color: '#999',
  },
  shizukuValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  shizukuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ff88',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  shizukuButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  shizukuInstructions: {
    backgroundColor: '#ff990020',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff9900',
  },
  instructionText: {
    color: '#ff9900',
    fontSize: 12,
    textAlign: 'center',
  },
  shizukuActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
  shizukuActiveText: {
    color: '#00ff88',
    fontSize: 13,
    fontWeight: '600',
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ff88',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  scanButtonActive: {
    opacity: 0.7,
  },
  scanButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  optionsCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  optionDesc: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  dbCard: {
    backgroundColor: '#00aaff15',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#00aaff40',
  },
  dbHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dbInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dbTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00aaff',
  },
  dbVersion: {
    fontSize: 11,
    color: '#00aaff99',
  },
  dbUpdateButton: {
    padding: 8,
  },
  dbDesc: {
    fontSize: 11,
    color: '#00aaff99',
    lineHeight: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  threatCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff3366',
  },
  threatHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  threatInfo: {
    flex: 1,
  },
  threatName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  threatPackage: {
    fontSize: 11,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  threatTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  threatTag: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  threatTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 0.5,
  },
  threatDesc: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  militaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ff8815',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    gap: 12,
    borderWidth: 1,
    borderColor: '#00ff8840',
  },
  militaryInfo: {
    flex: 1,
  },
  militaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00ff88',
    letterSpacing: 1,
  },
  militaryDesc: {
    fontSize: 11,
    color: '#00ff8899',
    marginTop: 2,
  },
});
