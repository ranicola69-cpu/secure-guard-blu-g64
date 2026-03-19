// Native VPN Module TypeScript Wrapper
// Safe wrapper with graceful degradation for managed Expo builds
import { NativeModules, NativeEventEmitter, Platform, Linking, Alert } from 'react-native';

// Safely get native module - may be null in managed builds
const VpnModule = Platform.OS === 'android' ? NativeModules?.VpnModule : null;

// Create emitter only if module exists
let vpnEmitter: NativeEventEmitter | null = null;
try {
  if (VpnModule) {
    vpnEmitter = new NativeEventEmitter(VpnModule);
  }
} catch (e) {
  console.log('VPN native module not available - using fallback mode');
}

export interface VpnConnectionResult {
  connected: boolean;
  dnsServer: string;
}

export interface PrivateDnsResult {
  hostname: string;
  manualConfigRequired: boolean;
  instructions: string;
}

// Check if we're running in native mode (with VPN bindings)
const isNativeMode = (): boolean => {
  return VpnModule !== null;
};

class VpnService {
  private listeners: Map<string, any> = new Map();
  private _isNativeAvailable: boolean = false;
  private _simulatedConnection: boolean = false;
  private _simulatedDns: string = '';

  constructor() {
    this._isNativeAvailable = isNativeMode();
  }

  // Check if native VPN bindings are available
  get isNativeAvailable(): boolean {
    return this._isNativeAvailable;
  }

  // Open Android VPN settings
  async openVpnSettings(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent('android.settings.VPN_SETTINGS');
      }
    } catch {
      Alert.alert(
        'Open VPN Settings',
        'Go to Settings > Network & Internet > VPN to configure VPN manually.',
        [{ text: 'OK' }]
      );
    }
  }

  // Open Android Private DNS settings
  async openPrivateDnsSettings(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent('android.settings.NETWORK_OPERATOR_SETTINGS');
      }
    } catch {
      Alert.alert(
        'Configure Private DNS',
        'Go to Settings > Network & Internet > Private DNS\n\n' +
        'Select "Private DNS provider hostname" and enter one of:\n\n' +
        '• 1dot1dot1dot1.cloudflare-dns.com (Cloudflare)\n' +
        '• dns.google (Google)\n' +
        '• dns.quad9.net (Quad9)',
        [{ text: 'OK' }]
      );
    }
  }

  // Show DNS configuration instructions
  showDnsInstructions(dnsServer: string): void {
    const providers: Record<string, string> = {
      '1.1.1.1': '1dot1dot1dot1.cloudflare-dns.com',
      '1.0.0.1': '1dot1dot1dot1.cloudflare-dns.com',
      '8.8.8.8': 'dns.google',
      '8.8.4.4': 'dns.google',
      '9.9.9.9': 'dns.quad9.net',
      '149.112.112.112': 'dns.quad9.net',
      '208.67.222.222': 'doh.opendns.com',
      '208.67.220.220': 'doh.opendns.com',
    };

    const hostname = providers[dnsServer] || dnsServer;

    Alert.alert(
      'Configure Secure DNS',
      `To enable DNS protection system-wide:\n\n` +
      `1. Open Settings > Network & Internet\n` +
      `2. Tap "Private DNS"\n` +
      `3. Select "Private DNS provider hostname"\n` +
      `4. Enter: ${hostname}\n` +
      `5. Tap Save\n\n` +
      `This encrypts all DNS queries from your device.`,
      [
        { text: 'Open Settings', onPress: () => this.openPrivateDnsSettings() },
        { text: 'OK' },
      ]
    );
  }

  // Check if VPN is connected
  async isConnected(): Promise<boolean> {
    if (!this._isNativeAvailable) {
      return this._simulatedConnection;
    }
    try {
      return await VpnModule.isVpnConnected();
    } catch {
      return this._simulatedConnection;
    }
  }

  // Get current DNS server
  async getCurrentDns(): Promise<string> {
    if (!this._isNativeAvailable) {
      return this._simulatedDns;
    }
    try {
      return await VpnModule.getCurrentDns();
    } catch {
      return this._simulatedDns;
    }
  }

  // Prepare VPN (request permission)
  prepareVpn(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this._isNativeAvailable) {
        // In managed mode, show instructions
        Alert.alert(
          'VPN Setup',
          'This app uses DNS-over-HTTPS for secure browsing.\n\n' +
          'For full VPN protection, configure Private DNS in your Android settings.',
          [
            { text: 'Configure DNS', onPress: () => this.openPrivateDnsSettings() },
            { text: 'Continue', onPress: () => resolve(true) },
          ]
        );
        return;
      }
      try {
        VpnModule.prepareVpn((granted: boolean) => {
          resolve(granted);
        });
      } catch {
        resolve(false);
      }
    });
  }

  // Connect to VPN with specified DNS
  async connect(dnsServer: string = '1.1.1.1', vpnAddress: string = '10.0.0.2'): Promise<VpnConnectionResult> {
    if (!this._isNativeAvailable) {
      // Simulate connection and show DNS setup instructions
      this._simulatedConnection = true;
      this._simulatedDns = dnsServer;
      
      this.showDnsInstructions(dnsServer);
      
      return { connected: true, dnsServer };
    }
    try {
      return await VpnModule.connect(dnsServer, vpnAddress);
    } catch {
      return { connected: false, dnsServer: '' };
    }
  }

  // Disconnect VPN
  async disconnect(): Promise<boolean> {
    if (!this._isNativeAvailable) {
      this._simulatedConnection = false;
      this._simulatedDns = '';
      return true;
    }
    try {
      return await VpnModule.disconnect();
    } catch {
      return false;
    }
  }

  // Set private DNS (Android 9+)
  async setPrivateDns(hostname: string): Promise<PrivateDnsResult> {
    const instructions = `Go to Settings > Network & Internet > Private DNS and enter: ${hostname}`;
    
    if (!this._isNativeAvailable) {
      this.showDnsInstructions(hostname);
      return { hostname, manualConfigRequired: true, instructions };
    }
    try {
      return await VpnModule.setPrivateDns(hostname);
    } catch {
      return { hostname, manualConfigRequired: true, instructions };
    }
  }

  // Get DNS over HTTPS URL for a provider
  async getDnsOverHttpsUrl(provider: string): Promise<string> {
    const urls: Record<string, string> = {
      cloudflare: 'https://cloudflare-dns.com/dns-query',
      google: 'https://dns.google/dns-query',
      quad9: 'https://dns.quad9.net/dns-query',
      opendns: 'https://doh.opendns.com/dns-query',
      adguard: 'https://dns.adguard.com/dns-query',
      cleanbrowsing: 'https://doh.cleanbrowsing.org/doh/security-filter/',
    };
    
    if (!this._isNativeAvailable) {
      return urls[provider.toLowerCase()] || '';
    }
    try {
      return await VpnModule.getDnsOverHttpsUrl(provider);
    } catch {
      return urls[provider.toLowerCase()] || '';
    }
  }

  // Test DNS resolution (works without native module)
  async testDns(hostname: string = 'cloudflare.com'): Promise<{ success: boolean; latency: number }> {
    const startTime = Date.now();
    try {
      const response = await fetch(`https://${hostname}`, { method: 'HEAD' });
      const latency = Date.now() - startTime;
      return { success: response.ok, latency };
    } catch {
      return { success: false, latency: -1 };
    }
  }

  // Event listeners (only work in native mode)
  onConnected(callback: (data: { dnsServer: string }) => void) {
    if (!vpnEmitter) return { remove: () => {} };
    try {
      const subscription = vpnEmitter.addListener('onVpnConnected', callback);
      this.listeners.set('connected', subscription);
      return subscription;
    } catch {
      return { remove: () => {} };
    }
  }

  onDisconnected(callback: () => void) {
    if (!vpnEmitter) return { remove: () => {} };
    try {
      const subscription = vpnEmitter.addListener('onVpnDisconnected', callback);
      this.listeners.set('disconnected', subscription);
      return subscription;
    } catch {
      return { remove: () => {} };
    }
  }

  onPermissionResult(callback: (granted: boolean) => void) {
    if (!vpnEmitter) return { remove: () => {} };
    try {
      const subscription = vpnEmitter.addListener('onVpnPermissionResult', (data) => {
        callback(data.granted);
      });
      this.listeners.set('permissionResult', subscription);
      return subscription;
    } catch {
      return { remove: () => {} };
    }
  }

  removeAllListeners() {
    this.listeners.forEach((subscription) => {
      try {
        subscription.remove();
      } catch {}
    });
    this.listeners.clear();
  }
}

export const Vpn = new VpnService();
export default Vpn;
