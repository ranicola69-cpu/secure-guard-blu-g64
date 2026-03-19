import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Shizuku, PackageInfo } from '../../modules/ShizukuService';
import { ThreatDB, ThreatDefinition } from '../../modules/ThreatDatabase';

type AppFilter = 'all' | 'system' | 'user' | 'threats';

interface EnhancedApp extends PackageInfo {
  threat?: ThreatDefinition;
}

export default function AppsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<EnhancedApp[]>([]);
  const [filteredApps, setFilteredApps] = useState<EnhancedApp[]>([]);
  const [filter, setFilter] = useState<AppFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Shizuku state
  const [shizukuReady, setShizukuReady] = useState(false);
  const [processingApp, setProcessingApp] = useState<string | null>(null);

  useEffect(() => {
    checkShizukuAndLoadApps();
  }, []);

  useEffect(() => {
    filterApps();
  }, [apps, filter, searchQuery]);

  const checkShizukuAndLoadApps = async () => {
    setLoading(true);
    
    const hasPermission = await Shizuku.checkPermission();
    setShizukuReady(hasPermission);
    
    if (hasPermission) {
      await loadRealApps();
    } else {
      await loadDefaultThreats();
    }
    
    setLoading(false);
  };

  const loadRealApps = async () => {
    try {
      const packages = await Shizuku.getInstalledPackages();
      const threats = await ThreatDB.getDatabase();
      
      const enhancedApps: EnhancedApp[] = packages.map(pkg => ({
        ...pkg,
        threat: threats?.threats.find(t => t.package_name === pkg.packageName),
      }));
      
      // Sort: threats first, then alphabetically
      enhancedApps.sort((a, b) => {
        if (a.threat && !b.threat) return -1;
        if (!a.threat && b.threat) return 1;
        return a.packageName.localeCompare(b.packageName);
      });
      
      setApps(enhancedApps);
    } catch (error) {
      console.error('Error loading apps:', error);
      await loadDefaultThreats();
    }
  };

  const loadDefaultThreats = async () => {
    // If Shizuku is not available, show known threats from database
    const threats = await ThreatDB.getDatabase();
    if (threats) {
      const threatApps: EnhancedApp[] = threats.threats.map(threat => ({
        packageName: threat.package_name,
        versionName: 'Unknown',
        versionCode: 0,
        isSystem: threat.is_system,
        threat,
      }));
      setApps(threatApps);
    }
  };

  const filterApps = () => {
    let filtered = apps;
    
    // Apply category filter
    switch (filter) {
      case 'system':
        filtered = filtered.filter(app => app.isSystem);
        break;
      case 'user':
        filtered = filtered.filter(app => !app.isSystem);
        break;
      case 'threats':
        filtered = filtered.filter(app => app.threat);
        break;
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        app.packageName.toLowerCase().includes(query) ||
        (app.threat?.app_name || '').toLowerCase().includes(query)
      );
    }
    
    setFilteredApps(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkShizukuAndLoadApps();
    setRefreshing(false);
  };

  const requestShizukuPermission = async () => {
    const granted = await Shizuku.requestPermission();
    if (granted) {
      setShizukuReady(true);
      await loadRealApps();
    } else {
      Alert.alert('Permission Required', 'Shizuku permission is required to manage apps.');
    }
  };

  const handleAppAction = async (app: EnhancedApp, action: 'stop' | 'disable' | 'uninstall' | 'clear') => {
    if (!shizukuReady) {
      Alert.alert('Shizuku Required', 'Please grant Shizuku permission first.');
      return;
    }

    const actionLabels = {
      stop: 'Force Stop',
      disable: 'Disable',
      uninstall: 'Uninstall',
      clear: 'Clear Cache',
    };

    Alert.alert(
      `${actionLabels[action]} ${app.threat?.app_name || app.packageName}?`,
      action === 'uninstall' 
        ? 'This will completely remove the app from your device.' 
        : action === 'disable'
        ? 'This will disable the app. It will no longer run or appear in your app list.'
        : action === 'stop'
        ? 'This will force stop the app. It may restart automatically.'
        : 'This will clear the app\'s cache data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabels[action],
          style: 'destructive',
          onPress: async () => {
            setProcessingApp(app.packageName);
            
            try {
              let success = false;
              
              switch (action) {
                case 'stop':
                  success = await Shizuku.forceStopPackage(app.packageName);
                  break;
                case 'disable':
                  success = await Shizuku.disablePackage(app.packageName);
                  break;
                case 'uninstall':
                  success = await Shizuku.uninstallPackage(app.packageName);
                  break;
                case 'clear':
                  success = await Shizuku.clearAppCache(app.packageName);
                  break;
              }
              
              if (success) {
                Alert.alert('Success', `${actionLabels[action]} completed successfully.`);
                
                // Refresh app list for uninstall/disable
                if (action === 'uninstall' || action === 'disable') {
                  await loadRealApps();
                }
              } else {
                Alert.alert('Failed', `${actionLabels[action]} failed. Please try again.`);
              }
            } catch (error) {
              console.error(`${action} error:`, error);
              Alert.alert('Error', `An error occurred during ${actionLabels[action].toLowerCase()}.`);
            }
            
            setProcessingApp(null);
          },
        },
      ]
    );
  };

  const executeCommand = async (command: string) => {
    if (!shizukuReady) {
      Alert.alert('Shizuku Required', 'Please grant Shizuku permission first.');
      return;
    }
    
    const result = await Shizuku.executeCommand(command);
    Alert.alert(
      'Command Result',
      `Exit Code: ${result.exitCode}\n\nOutput:\n${result.output || 'No output'}\n\nErrors:\n${result.error || 'None'}`,
      [{ text: 'OK' }]
    );
  };

  const getThreatLevelColor = (level?: string) => {
    const colors: Record<string, string> = {
      critical: '#ff0044',
      high: '#ff3366',
      medium: '#ffaa00',
      low: '#ffcc00',
    };
    return colors[level || ''] || '#999';
  };

  const getCategoryLabel = () => {
    switch (filter) {
      case 'system': return 'System Apps';
      case 'user': return 'User Apps';
      case 'threats': return 'Detected Threats';
      default: return 'All Apps';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>App Manager</Text>
        <View style={[styles.shizukuBadge, shizukuReady && styles.shizukuBadgeActive]}>
          <Ionicons 
            name={shizukuReady ? "shield-checkmark" : "shield-outline"} 
            size={16} 
            color={shizukuReady ? "#00ff88" : "#ff9900"} 
          />
          <Text style={[styles.shizukuText, shizukuReady && { color: '#00ff88' }]}>
            {shizukuReady ? 'SHIZUKU' : 'LIMITED'}
          </Text>
        </View>
      </View>

      {!shizukuReady && (
        <TouchableOpacity style={styles.shizukuPrompt} onPress={requestShizukuPermission}>
          <Ionicons name="warning" size={24} color="#ff9900" />
          <View style={styles.shizukuPromptContent}>
            <Text style={styles.shizukuPromptTitle}>Shizuku Required</Text>
            <Text style={styles.shizukuPromptDesc}>
              Tap to grant Shizuku permission for full app management capabilities.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ff9900" />
        </TouchableOpacity>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search apps..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'threats', 'system', 'user'] as AppFilter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f === 'all' ? 'All' : f === 'threats' ? 'Threats' : f === 'system' ? 'System' : 'User'}
            </Text>
            {f === 'threats' && (
              <View style={styles.threatCountBadge}>
                <Text style={styles.threatCountText}>
                  {apps.filter(a => a.threat).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff88" />
        }
      >
        {/* Apps Count */}
        <View style={styles.countRow}>
          <Text style={styles.countLabel}>{getCategoryLabel()}</Text>
          <Text style={styles.countValue}>{filteredApps.length} apps</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00ff88" />
            <Text style={styles.loadingText}>Scanning apps...</Text>
          </View>
        ) : filteredApps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="apps" size={48} color="#333" />
            <Text style={styles.emptyText}>No apps found</Text>
          </View>
        ) : (
          filteredApps.map(app => (
            <View 
              key={app.packageName} 
              style={[styles.appCard, app.threat && styles.appCardThreat]}
            >
              <View style={styles.appHeader}>
                <View style={styles.appIcon}>
                  <Ionicons 
                    name={app.threat ? "warning" : app.isSystem ? "cube" : "apps"} 
                    size={24} 
                    color={app.threat ? getThreatLevelColor(app.threat.threat_level) : app.isSystem ? "#666" : "#00ff88"} 
                  />
                </View>
                <View style={styles.appInfo}>
                  <Text style={styles.appName}>
                    {app.threat?.app_name || app.packageName.split('.').pop()}
                  </Text>
                  <Text style={styles.appPackage}>{app.packageName}</Text>
                  
                  <View style={styles.appTags}>
                    {app.isSystem && (
                      <View style={styles.appTag}>
                        <Text style={styles.appTagText}>SYSTEM</Text>
                      </View>
                    )}
                    {app.threat && (
                      <View style={[styles.appTag, { backgroundColor: getThreatLevelColor(app.threat.threat_level) + '30' }]}>
                        <Text style={[styles.appTagText, { color: getThreatLevelColor(app.threat.threat_level) }]}>
                          {app.threat.threat_level.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {app.threat && (
                      <View style={styles.appTag}>
                        <Text style={styles.appTagText}>
                          {app.threat.category.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              
              {app.threat && (
                <Text style={styles.appThreatDesc}>{app.threat.description}</Text>
              )}
              
              {/* Action Buttons */}
              <View style={styles.appActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleAppAction(app, 'stop')}
                  disabled={processingApp === app.packageName}
                >
                  {processingApp === app.packageName ? (
                    <ActivityIndicator size="small" color="#ffaa00" />
                  ) : (
                    <>
                      <Ionicons name="stop-circle" size={18} color="#ffaa00" />
                      <Text style={[styles.actionButtonText, { color: '#ffaa00' }]}>Stop</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleAppAction(app, 'clear')}
                  disabled={processingApp === app.packageName}
                >
                  <Ionicons name="trash-bin" size={18} color="#00aaff" />
                  <Text style={[styles.actionButtonText, { color: '#00aaff' }]}>Cache</Text>
                </TouchableOpacity>
                
                {app.isSystem ? (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleAppAction(app, 'disable')}
                    disabled={processingApp === app.packageName}
                  >
                    <Ionicons name="eye-off" size={18} color="#ff9900" />
                    <Text style={[styles.actionButtonText, { color: '#ff9900' }]}>Disable</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleAppAction(app, 'uninstall')}
                    disabled={processingApp === app.packageName}
                  >
                    <Ionicons name="close-circle" size={18} color="#ff3366" />
                    <Text style={[styles.actionButtonText, { color: '#ff3366' }]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}

        {/* Advanced Commands */}
        {shizukuReady && (
          <View style={styles.advancedSection}>
            <Text style={styles.advancedTitle}>Advanced Commands</Text>
            <Text style={styles.advancedDesc}>
              Execute shell commands with system-level privileges via Shizuku
            </Text>
            
            <View style={styles.commandButtons}>
              <TouchableOpacity 
                style={styles.commandButton}
                onPress={() => executeCommand('pm list packages -s')}
              >
                <Ionicons name="terminal" size={20} color="#00ff88" />
                <Text style={styles.commandButtonText}>List System Apps</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.commandButton}
                onPress={() => executeCommand('dumpsys battery')}
              >
                <Ionicons name="battery-charging" size={20} color="#00ff88" />
                <Text style={styles.commandButtonText}>Battery Info</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.commandButton}
                onPress={() => executeCommand('getprop ro.build.version.release')}
              >
                <Ionicons name="phone-portrait" size={20} color="#00ff88" />
                <Text style={styles.commandButtonText}>Android Version</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Shizuku Power Badge */}
        <View style={styles.powerBadge}>
          <Ionicons name="flash" size={24} color="#00ff88" />
          <View style={styles.powerInfo}>
            <Text style={styles.powerTitle}>POWERED BY SHIZUKU</Text>
            <Text style={styles.powerDesc}>System-level app management without root</Text>
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
  shizukuBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff990020',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#ff9900',
  },
  shizukuBadgeActive: {
    backgroundColor: '#00ff8820',
    borderColor: '#00ff88',
  },
  shizukuText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ff9900',
    letterSpacing: 1,
  },
  shizukuPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff990020',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ff9900',
  },
  shizukuPromptContent: {
    flex: 1,
  },
  shizukuPromptTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff9900',
  },
  shizukuPromptDesc: {
    fontSize: 12,
    color: '#ff990099',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#00ff8830',
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  filterTabTextActive: {
    color: '#00ff88',
  },
  threatCountBadge: {
    backgroundColor: '#ff3366',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  threatCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  countLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  countValue: {
    fontSize: 14,
    color: '#999',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  appCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#333',
  },
  appCardThreat: {
    borderLeftColor: '#ff3366',
  },
  appHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  appTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  appTag: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  appTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 0.5,
  },
  appThreatDesc: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
    marginBottom: 12,
  },
  appActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  advancedSection: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  advancedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  advancedDesc: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  commandButtons: {
    gap: 8,
  },
  commandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#00ff8840',
  },
  commandButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#00ff88',
  },
  powerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ff8815',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    gap: 12,
    borderWidth: 1,
    borderColor: '#00ff8840',
  },
  powerInfo: {
    flex: 1,
  },
  powerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00ff88',
    letterSpacing: 1,
  },
  powerDesc: {
    fontSize: 11,
    color: '#00ff8899',
    marginTop: 2,
  },
});
