import AsyncStorage from '@react-native-async-storage/async-storage';

const THREAT_DB_URL = 'https://raw.githubusercontent.com/ranicola69-cpu/secureguard-threat-db/main/threats.json';
const CACHE_KEY = 'threat_database';
const CACHE_TIMESTAMP_KEY = 'threat_database_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export interface ThreatDefinition {
  package_name: string;
  app_name: string;
  threat_level: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  is_system: boolean;
  can_remove: boolean;
  permissions_of_concern?: string[];
}

export interface ThreatCategory {
  description: string;
  risk_level: string;
}

export interface ThreatDatabase {
  version: string;
  last_updated: string;
  signature_count: number;
  categories: Record<string, ThreatCategory>;
  threats: ThreatDefinition[];
  dns_blocklists: string[];
}

const BUILTIN_THREATS: ThreatDefinition[] = [
  { package_name: 'com.android.enterprise', app_name: 'Enterprise Suite', threat_level: 'high', category: 'enterprise_spyware', description: 'MDM enterprise management software that monitors and controls device', is_system: true, can_remove: false },
  { package_name: 'com.google.android.gms.policy', app_name: 'Enterprise Policy', threat_level: 'high', category: 'enterprise_spyware', description: 'Google Enterprise Policy enforcer', is_system: true, can_remove: false },
  { package_name: 'com.tracfone', app_name: 'TracFone Services', threat_level: 'medium', category: 'bloatware', description: 'Carrier bloatware from TracFone', is_system: true, can_remove: false },
  { package_name: 'com.facebook.system', app_name: 'Facebook System', threat_level: 'medium', category: 'bloatware', description: 'Facebook system-level app with deep OS integration', is_system: true, can_remove: false },
  { package_name: 'com.facebook.services', app_name: 'Facebook Services', threat_level: 'medium', category: 'bloatware', description: 'Facebook background services tracking activity', is_system: true, can_remove: false },
  { package_name: 'com.facebook.appmanager', app_name: 'Facebook App Manager', threat_level: 'high', category: 'tracker', description: 'Facebook tracker that phones home with device data', is_system: true, can_remove: false },
  { package_name: 'com.android.managedprovisioning', app_name: 'Managed Provisioning', threat_level: 'high', category: 'enterprise_spyware', description: 'Device enrollment and management provisioning', is_system: true, can_remove: false },
  { package_name: 'com.qualcomm.qti.telephonyservice', app_name: 'Qualcomm Telemetry', threat_level: 'medium', category: 'tracker', description: 'Qualcomm chipset telemetry collector', is_system: true, can_remove: false },
  { package_name: 'com.amazon.appmanager', app_name: 'Amazon App Manager', threat_level: 'medium', category: 'bloatware', description: 'Amazon preloaded app manager', is_system: true, can_remove: false },
];

const BUILTIN_DB: ThreatDatabase = {
  version: '1.0.0-builtin',
  last_updated: new Date().toISOString(),
  signature_count: BUILTIN_THREATS.length,
  categories: {
    enterprise_spyware: { description: 'MDM and enterprise monitoring software', risk_level: 'high' },
    bloatware: { description: 'Preloaded unwanted software', risk_level: 'medium' },
    tracker: { description: 'Data collection and tracking software', risk_level: 'high' },
    adware: { description: 'Advertising software', risk_level: 'low' },
  },
  threats: BUILTIN_THREATS,
  dns_blocklists: ['0.0.0.0 ads.facebook.com', '0.0.0.0 graph.facebook.com'],
};

class ThreatDatabaseService {
  private database: ThreatDatabase | null = null;
  private lastFetch: number = 0;

  async fetchFromRemote(): Promise<ThreatDatabase | null> {
    try {
      const response = await fetch(THREAT_DB_URL, { headers: { 'Cache-Control': 'no-cache' } });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: ThreatDatabase = await response.json();
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      this.database = data;
      this.lastFetch = Date.now();
      return data;
    } catch (error) {
      console.log('Failed to fetch threat database, using built-in:', error);
      return null;
    }
  }

  async loadFromCache(): Promise<ThreatDatabase | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      const timestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cached && timestamp) {
        const cacheAge = Date.now() - parseInt(timestamp, 10);
        if (cacheAge < CACHE_DURATION) {
          this.database = JSON.parse(cached);
          this.lastFetch = parseInt(timestamp, 10);
          return this.database;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getDatabase(): Promise<ThreatDatabase> {
    const cached = await this.loadFromCache();
    if (cached) return cached;
    const remote = await this.fetchFromRemote();
    if (remote) return remote;
    return BUILTIN_DB;
  }

  async updateDatabase(): Promise<{ success: boolean; version?: string; threatCount?: number }> {
    const db = await this.fetchFromRemote();
    if (db) {
      return { success: true, version: db.version, threatCount: db.threats.length };
    }
    return { success: false };
  }

  async checkPackage(packageName: string): Promise<ThreatDefinition | null> {
    const db = await this.getDatabase();
    return db.threats.find(t => t.package_name === packageName) || null;
  }

  async scanPackages(packageNames: string[]): Promise<ThreatDefinition[]> {
    const db = await this.getDatabase();
    return db.threats.filter(t => packageNames.includes(t.package_name));
  }

  async getThreatsByCategory(category: string): Promise<ThreatDefinition[]> {
    const db = await this.getDatabase();
    return db.threats.filter(t => t.category === category);
  }

  async getThreatsByLevel(level: 'critical' | 'high' | 'medium' | 'low'): Promise<ThreatDefinition[]> {
    const db = await this.getDatabase();
    return db.threats.filter(t => t.threat_level === level);
  }

  async getDnsBlocklist(): Promise<string[]> {
    const db = await this.getDatabase();
    return db.dns_blocklists;
  }

  async getDatabaseInfo(): Promise<{ version: string; lastUpdated: string; signatureCount: number; categories: string[] } | null> {
    const db = await this.getDatabase();
    return {
      version: db.version,
      lastUpdated: db.last_updated,
      signatureCount: db.signature_count,
      categories: Object.keys(db.categories),
    };
  }

  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(CACHE_KEY);
    await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
    this.database = null;
    this.lastFetch = 0;
  }
}

export const ThreatDB = new ThreatDatabaseService();
export default ThreatDB;
