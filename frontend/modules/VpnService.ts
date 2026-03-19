// Native VPN Module TypeScript Wrapper
// Safe wrapper that handles missing native modules gracefully
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const VpnModule = NativeModules?.VpnModule || null;

interface VpnEventEmitter {
  addListener: (eventType: string, listener: (...args: any[]) => void) => { remove: () => void };
}

const vpnEmitter: VpnEventEmitter | null = Platform.OS === 'android' && VpnModule 
  ? new NativeEventEmitter(VpnModule) 
  : null;

export interface VpnConnectionResult {
  connected: boolean;
  dnsServer: string;
}

export interface PrivateDnsResult {
  hostname: string;
  manualConfigRequired: boolean;
  instructions: string;
}

class VpnService {
  private listeners: Map<string, any> = new Map();

  // Check if VPN is connected
  async isConnected(): Promise<boolean> {
    if (Platform.OS !== 'android' || !VpnModule) return false;
    try {
      return await VpnModule.isVpnConnected();
    } catch {
      return false;
    }
  }

  // Get current DNS server
  async getCurrentDns(): Promise<string> {
    if (Platform.OS !== 'android' || !VpnModule) return '';
    try {
      return await VpnModule.getCurrentDns();
    } catch {
      return '';
    }
  }

  // Prepare VPN (request permission)
  prepareVpn(): Promise<boolean> {
    return new Promise((resolve) => {
      if (Platform.OS !== 'android' || !VpnModule) {
        resolve(false);
        return;
      }
      VpnModule.prepareVpn((granted: boolean) => {
        resolve(granted);
      });
    });
  }

  // Connect to VPN with specified DNS
  async connect(dnsServer: string = '1.1.1.1', vpnAddress: string = '10.0.0.2'): Promise<VpnConnectionResult> {
    if (Platform.OS !== 'android' || !VpnModule) {
      return { connected: false, dnsServer: '' };
    }
    try {
      return await VpnModule.connect(dnsServer, vpnAddress);
    } catch {
      return { connected: false, dnsServer: '' };
    }
  }

  // Disconnect VPN
  async disconnect(): Promise<boolean> {
    if (Platform.OS !== 'android' || !VpnModule) return false;
    try {
      return await VpnModule.disconnect();
    } catch {
      return false;
    }
  }

  // Set private DNS (Android 9+)
  async setPrivateDns(hostname: string): Promise<PrivateDnsResult> {
    if (Platform.OS !== 'android' || !VpnModule) {
      return { hostname: '', manualConfigRequired: true, instructions: 'Not supported on this platform' };
    }
    try {
      return await VpnModule.setPrivateDns(hostname);
    } catch {
      return { hostname: '', manualConfigRequired: true, instructions: 'Failed to configure DNS' };
    }
  }

  // Get DNS over HTTPS URL for a provider
  async getDnsOverHttpsUrl(provider: string): Promise<string> {
    if (Platform.OS !== 'android' || !VpnModule) {
      const urls: Record<string, string> = {
        cloudflare: 'https://cloudflare-dns.com/dns-query',
        google: 'https://dns.google/dns-query',
        quad9: 'https://dns.quad9.net/dns-query',
        opendns: 'https://doh.opendns.com/dns-query',
      };
      return urls[provider.toLowerCase()] || '';
    }
    try {
      return await VpnModule.getDnsOverHttpsUrl(provider);
    } catch {
      return '';
    }
  }

  // Event listeners
  onConnected(callback: (data: { dnsServer: string }) => void) {
    if (!vpnEmitter) return { remove: () => {} };
    const subscription = vpnEmitter.addListener('onVpnConnected', callback);
    this.listeners.set('connected', subscription);
    return subscription;
  }

  onDisconnected(callback: () => void) {
    if (!vpnEmitter) return { remove: () => {} };
    const subscription = vpnEmitter.addListener('onVpnDisconnected', callback);
    this.listeners.set('disconnected', subscription);
    return subscription;
  }

  onPermissionResult(callback: (granted: boolean) => void) {
    if (!vpnEmitter) return { remove: () => {} };
    const subscription = vpnEmitter.addListener('onVpnPermissionResult', (data) => {
      callback(data.granted);
    });
    this.listeners.set('permissionResult', subscription);
    return subscription;
  }

  removeAllListeners() {
    this.listeners.forEach((subscription) => subscription.remove());
    this.listeners.clear();
  }
}

export const Vpn = new VpnService();
export default Vpn;
