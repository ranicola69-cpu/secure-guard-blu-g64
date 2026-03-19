// Threat Database Service - Fetches from GitHub repository
import AsyncStorage from '@react-native-async-storage/async-storage';

const THREAT_DB_URL = 'https://raw.githubusercontent.com/ranicola69-cpu/secureguard-threat-db/main/threats.json';
const CACHE_KEY = 'threat_database';
const CACHE_TIMESTAMP_KEY = 'threat_database_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

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

class ThreatDatabaseService {
  private database: ThreatDatabase | null = null;
  private lastFetch: number = 0;

  // Fetch threat database from GitHub
  async fetchFromRemote(): Promise<ThreatDatabase | null> {
    try {
      const response = await fetch(THREAT_DB_URL, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ThreatDatabase = await response.json();
      
      // Cache the database
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      this.database = data;
      this.lastFetch = Date.now();
      
      return data;
    } catch (error) {
      console.error('Failed to fetch threat database:', error);
      return null;
    }
  }

  // Load from cache
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
      console.error('Failed to load threat database from cache:', error);
      return null;
    }
  }

  // Get the database (from cache or fetch)
  async getDatabase(): Promise<ThreatDatabase | null> {
    // Try cache first
    const cached = await this.loadFromCache();
    if (cached) {
      return cached;
    }
    
    // Fetch from remote
    return await this.fetchFromRemote();
  }

  // Force update the database
  async updateDatabase(): Promise<{ success: boolean; version?: string; threatCount?: number }> {
    const db = await this.fetchFromRemote();
    if (db) {
      return {
        success: true,
        version: db.version,
        threatCount: db.threats.length,
      };
    }
    return { success: false };
  }

  // Check if a package is a known threat
  async checkPackage(packageName: string): Promise<ThreatDefinition | null> {
    const db = await this.getDatabase();
    if (!db) return null;
    
    return db.threats.find(t => t.package_name === packageName) || null;
  }

  // Scan multiple packages
  async scanPackages(packageNames: string[]): Promise<ThreatDefinition[]> {
    const db = await this.getDatabase();
    if (!db) return [];
    
    return db.threats.filter(t => packageNames.includes(t.package_name));
  }

  // Get all threats by category
  async getThreatsByCategory(category: string): Promise<ThreatDefinition[]> {
    const db = await this.getDatabase();
    if (!db) return [];
    
    return db.threats.filter(t => t.category === category);
  }

  // Get all threats by level
  async getThreatsByLevel(level: 'critical' | 'high' | 'medium' | 'low'): Promise<ThreatDefinition[]> {
    const db = await this.getDatabase();
    if (!db) return [];
    
    return db.threats.filter(t => t.threat_level === level);
  }

  // Get DNS blocklist
  async getDnsBlocklist(): Promise<string[]> {
    const db = await this.getDatabase();
    if (!db) return [];
    
    return db.dns_blocklists;
  }

  // Get database info
  async getDatabaseInfo(): Promise<{
    version: string;
    lastUpdated: string;
    signatureCount: number;
    categories: string[];
  } | null> {
    const db = await this.getDatabase();
    if (!db) return null;
    
    return {
      version: db.version,
      lastUpdated: db.last_updated,
      signatureCount: db.signature_count,
      categories: Object.keys(db.categories),
    };
  }

  // Clear cache
  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(CACHE_KEY);
    await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
    this.database = null;
    this.lastFetch = 0;
  }
}

export const ThreatDB = new ThreatDatabaseService();
export default ThreatDB;
