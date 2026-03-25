import { NativeModules, NativeEventEmitter, Platform, Linking, Alert } from 'react-native';

const VpnModule = Platform.OS === 'android' ? NativeModules?.VpnModule : null;

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

  get isNativeAvailable(): boolean {
    return this._isNativeAvailable;
  }

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

  async prepareVpn(): Promise<boolean> {
    if (!this._isNativeAvailable) {
      Alert.alert(
        'VPN Not Available',
        'VPN requires a native Android build. On this device, configure Private DNS in Android settings for DNS protection.\n\nGo to: Settings > Network & Internet > Private DNS',
        [
          { text: 'Open DNS Settings', onPress: () => this.openPrivateDnsSettings() },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return false;
    }
    try {
      return await VpnModule.prepareVpn();
    } catch {
      return false;
    }
  }

  async connect(dnsServer: string, vpnAddress: string): Promise<VpnConnectionResult> {
    if (!this._isNativeAvailable) {
      return { connected: false, dnsServer: '' };
    }
    try {
      return await VpnModule.connectVpn(dnsServer, vpnAddress);
    } catch {
      return { connected: false, dnsServer: '' };
    }
  }

  async disconnect(): Promise<boolean> {
    if (!this._isNativeAvailable) return false;
    try {
      return await VpnModule.disconnectVpn();
    } catch {
      return false;
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this._isNativeAvailable) return false;
    try {
      return await VpnModule.isVpnConnected();
    } catch {
      return false;
    }
  }

  async getCurrentDns(): Promise<string> {
    if (!this._isNativeAvailable) return '';
    try {
      return await VpnModule.getCurrentDns();
    } catch {
      return '';
    }
  }

  async setPrivateDns(hostname: string): Promise<PrivateDnsResult> {
    if (!this._isNativeAvailable) {
      return {
        hostname,
        manualConfigRequired: true,
        instructions: `Go to Settings > Network & Internet > Private DNS > Private DNS provider hostname and enter: ${hostname}`,
      };
    }
    try {
      return await VpnModule.setPrivateDns(hostname);
    } catch {
      return { hostname, manualConfigRequired: true, instructions: 'Manual configuration required' };
    }
  }

  onConnected(callback: (data: VpnConnectionResult) => void) {
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

  removeAllListeners() {
    this.listeners.forEach((subscription) => {
      try { subscription.remove(); } catch {}
    });
    this.listeners.clear();
  }
}

export const Vpn = new VpnService();
export default Vpn;
