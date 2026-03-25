import { NativeModules, NativeEventEmitter, Platform, Linking, Alert } from 'react-native';

const ShizukuModule = Platform.OS === 'android' ? NativeModules?.ShizukuModule : null;

let shizukuEmitter: NativeEventEmitter | null = null;
try {
  if (ShizukuModule) {
    shizukuEmitter = new NativeEventEmitter(ShizukuModule);
  }
} catch (e) {
  console.log('Shizuku native module not available - using fallback mode');
}

export interface PackageInfo {
  packageName: string;
  versionName: string;
  versionCode: number;
  isSystem: boolean;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  memory: number;
}

export interface CommandResult {
  output: string;
  error: string;
  exitCode: number;
}

const isNativeMode = (): boolean => {
  return ShizukuModule !== null;
};

class ShizukuService {
  private listeners: Map<string, any> = new Map();
  private _isNativeAvailable: boolean = false;

  constructor() {
    this._isNativeAvailable = isNativeMode();
  }

  get isNativeAvailable(): boolean {
    return this._isNativeAvailable;
  }

  async openShizukuPlayStore(): Promise<void> {
    const playStoreUrl = 'market://details?id=moe.shizuku.privileged.api';
    const webUrl = 'https://play.google.com/store/apps/details?id=moe.shizuku.privileged.api';
    try {
      const canOpen = await Linking.canOpenURL(playStoreUrl);
      if (canOpen) {
        await Linking.openURL(playStoreUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      await Linking.openURL(webUrl);
    }
  }

  async openShizukuApp(): Promise<boolean> {
    try {
      const shizukuUrl = 'shizuku://authorize';
      const canOpen = await Linking.canOpenURL(shizukuUrl);
      if (canOpen) {
        await Linking.openURL(shizukuUrl);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  showShizukuInstructions(): void {
    Alert.alert(
      'Shizuku Setup Required',
      'To use advanced security features:\n\n' +
      '1. Install Shizuku from Play Store\n' +
      '2. Open Shizuku app\n' +
      '3. Enable Wireless Debugging in Developer Options\n' +
      '4. In Shizuku, tap "Start" and pair via Wireless Debugging\n' +
      '5. Return to Secure Guard and grant permission\n\n' +
      'Note: Shizuku provides ADB-level access without root.',
      [
        { text: 'Install Shizuku', onPress: () => this.openShizukuPlayStore() },
        { text: 'Open Shizuku', onPress: () => this.openShizukuApp() },
        { text: 'Later', style: 'cancel' },
      ]
    );
  }

  async isInstalled(): Promise<boolean> {
    if (!this._isNativeAvailable) return false;
    try {
      return await ShizukuModule.isShizukuInstalled();
    } catch {
      return false;
    }
  }

  async isRunning(): Promise<boolean> {
    if (!this._isNativeAvailable) return false;
    try {
      return await ShizukuModule.isShizukuRunning();
    } catch {
      return false;
    }
  }

  async getVersion(): Promise<number> {
    if (!this._isNativeAvailable) return -1;
    try {
      return await ShizukuModule.getShizukuVersion();
    } catch {
      return -1;
    }
  }

  async checkPermission(): Promise<boolean> {
    if (!this._isNativeAvailable) return false;
    try {
      return await ShizukuModule.checkShizukuPermission();
    } catch {
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this._isNativeAvailable) return false;
    try {
      return await ShizukuModule.requestShizukuPermission();
    } catch {
      return false;
    }
  }

  async getInstalledPackages(): Promise<PackageInfo[]> {
    if (!this._isNativeAvailable) return [];
    try {
      return await ShizukuModule.getInstalledPackages();
    } catch {
      return [];
    }
  }

  async getRunningProcesses(): Promise<ProcessInfo[]> {
    if (!this._isNativeAvailable) return [];
    try {
      return await ShizukuModule.getRunningProcesses();
    } catch {
      return [];
    }
  }

  async executeCommand(command: string): Promise<CommandResult> {
    if (!this._isNativeAvailable) {
      return { output: '', error: 'Shizuku not available', exitCode: -1 };
    }
    try {
      return await ShizukuModule.executeCommand(command);
    } catch {
      return { output: '', error: 'Command failed', exitCode: -1 };
    }
  }

  async uninstallPackage(packageName: string): Promise<boolean> {
    if (!this._isNativeAvailable) return false;
    try {
      return await ShizukuModule.uninstallPackage(packageName);
    } catch {
      return false;
    }
  }

  async disablePackage(packageName: string): Promise<boolean> {
    if (!this._isNativeAvailable) return false;
    try {
      return await ShizukuModule.disablePackage(packageName);
    } catch {
      return false;
    }
  }

  async clearPackageData(packageName: string): Promise<boolean> {
    if (!this._isNativeAvailable) return false;
    try {
      return await ShizukuModule.clearPackageData(packageName);
    } catch {
      return false;
    }
  }

  onConnected(callback: () => void) {
    if (!shizukuEmitter) return { remove: () => {} };
    try {
      const subscription = shizukuEmitter.addListener('onShizukuConnected', callback);
      this.listeners.set('connected', subscription);
      return subscription;
    } catch {
      return { remove: () => {} };
    }
  }

  onDisconnected(callback: () => void) {
    if (!shizukuEmitter) return { remove: () => {} };
    try {
      const subscription = shizukuEmitter.addListener('onShizukuDisconnected', callback);
      this.listeners.set('disconnected', subscription);
      return subscription;
    } catch {
      return { remove: () => {} };
    }
  }

  onPermissionResult(callback: (granted: boolean) => void) {
    if (!shizukuEmitter) return { remove: () => {} };
    try {
      const subscription = shizukuEmitter.addListener('onShizukuPermissionResult', (data) => {
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
      try { subscription.remove(); } catch {}
    });
    this.listeners.clear();
  }
}

export const Shizuku = new ShizukuService();
export default Shizuku;
