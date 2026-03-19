// Native Shizuku Module TypeScript Wrapper
// Safe wrapper with graceful degradation for managed Expo builds
import { NativeModules, NativeEventEmitter, Platform, Linking, Alert } from 'react-native';

// Safely get native module - may be null in managed builds
const ShizukuModule = Platform.OS === 'android' ? NativeModules?.ShizukuModule : null;

// Create emitter only if module exists
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

// Check if we're running in native mode (with Shizuku bindings)
const isNativeMode = (): boolean => {
  return ShizukuModule !== null;
};

class ShizukuService {
  private listeners: Map<string, any> = new Map();
  private _isNativeAvailable: boolean = false;

  constructor() {
    this._isNativeAvailable = isNativeMode();
  }

  // Check if native Shizuku bindings are available
  get isNativeAvailable(): boolean {
    return this._isNativeAvailable;
  }

  // Open Shizuku app in Play Store
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

  // Open Shizuku app directly
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

  // Show instructions for using Shizuku
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

  // Check if Shizuku app is installed
  async isInstalled(): Promise<boolean> {
    if (!this._isNativeAvailable) {
      // In managed mode, we can't directly check - assume not available
      // User should check manually
      return false;
    }
    try {
      return await ShizukuModule.isShizukuInstalled();
    } catch {
      return false;
    }
  }

  // Check if Shizuku service is running
  async isRunning(): Promise<boolean> {
    if (!this._isNativeAvailable) {
      return false;
    }
    try {
      return await ShizukuModule.isShizukuRunning();
    } catch {
      return false;
    }
  }

  // Get Shizuku version
  async getVersion(): Promise<number> {
    if (!this._isNativeAvailable) {
      return -1;
    }
    try {
      return await ShizukuModule.getShizukuVersion();
    } catch {
      return -1;
    }
  }

  // Check if we have Shizuku permission
  async checkPermission(): Promise<boolean> {
    if (!this._isNativeAvailable) {
      return false;
    }
    try {
      return await ShizukuModule.checkPermission();
    } catch {
      return false;
    }
  }

  // Request Shizuku permission
  requestPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this._isNativeAvailable) {
        this.showShizukuInstructions();
        resolve(false);
        return;
      }
      try {
        ShizukuModule.requestPermission((granted: boolean) => {
          resolve(granted);
        });
      } catch {
        this.showShizukuInstructions();
        resolve(false);
      }
    });
  }

  // Get all installed packages
  async getInstalledPackages(): Promise<PackageInfo[]> {
    if (!this._isNativeAvailable) {
      return [];
    }
    try {
      return await ShizukuModule.getInstalledPackages();
    } catch {
      return [];
    }
  }

  // Force stop an app
  async forceStopPackage(packageName: string): Promise<boolean> {
    if (!this._isNativeAvailable) {
      Alert.alert(
        'Shizuku Required',
        `To force stop "${packageName}", please use the Shizuku app directly or run:\n\nadb shell am force-stop ${packageName}`,
        [{ text: 'OK' }]
      );
      return false;
    }
    try {
      return await ShizukuModule.forceStopPackage(packageName);
    } catch {
      return false;
    }
  }

  // Clear app cache
  async clearAppCache(packageName: string): Promise<boolean> {
    if (!this._isNativeAvailable) {
      Alert.alert(
        'Shizuku Required',
        `To clear cache for "${packageName}", go to:\n\nSettings > Apps > ${packageName} > Storage > Clear Cache`,
        [{ text: 'OK' }]
      );
      return false;
    }
    try {
      return await ShizukuModule.clearAppCache(packageName);
    } catch {
      return false;
    }
  }

  // Uninstall a package
  async uninstallPackage(packageName: string): Promise<boolean> {
    if (!this._isNativeAvailable) {
      Alert.alert(
        'Shizuku Required',
        `To uninstall "${packageName}", use Shizuku or run:\n\nadb shell pm uninstall -k --user 0 ${packageName}`,
        [{ text: 'OK' }]
      );
      return false;
    }
    try {
      return await ShizukuModule.uninstallPackage(packageName);
    } catch {
      return false;
    }
  }

  // Disable a package (for system apps)
  async disablePackage(packageName: string): Promise<boolean> {
    if (!this._isNativeAvailable) {
      Alert.alert(
        'Shizuku Required',
        `To disable "${packageName}", use Shizuku or run:\n\nadb shell pm disable-user --user 0 ${packageName}`,
        [{ text: 'OK' }]
      );
      return false;
    }
    try {
      return await ShizukuModule.disablePackage(packageName);
    } catch {
      return false;
    }
  }

  // Enable a package
  async enablePackage(packageName: string): Promise<boolean> {
    if (!this._isNativeAvailable) {
      Alert.alert(
        'Shizuku Required',
        `To enable "${packageName}", use Shizuku or run:\n\nadb shell pm enable --user 0 ${packageName}`,
        [{ text: 'OK' }]
      );
      return false;
    }
    try {
      return await ShizukuModule.enablePackage(packageName);
    } catch {
      return false;
    }
  }

  // Grant permission to an app
  async grantPermission(packageName: string, permission: string): Promise<boolean> {
    if (!this._isNativeAvailable) {
      Alert.alert(
        'Shizuku Required',
        `To grant permission, use Shizuku or run:\n\nadb shell pm grant ${packageName} ${permission}`,
        [{ text: 'OK' }]
      );
      return false;
    }
    try {
      return await ShizukuModule.grantPermission(packageName, permission);
    } catch {
      return false;
    }
  }

  // Revoke permission from an app
  async revokePermission(packageName: string, permission: string): Promise<boolean> {
    if (!this._isNativeAvailable) {
      Alert.alert(
        'Shizuku Required',
        `To revoke permission, use Shizuku or run:\n\nadb shell pm revoke ${packageName} ${permission}`,
        [{ text: 'OK' }]
      );
      return false;
    }
    try {
      return await ShizukuModule.revokePermission(packageName, permission);
    } catch {
      return false;
    }
  }

  // Execute a shell command
  async executeCommand(command: string): Promise<CommandResult> {
    if (!this._isNativeAvailable) {
      return {
        output: '',
        error: 'Native Shizuku bindings not available. Use Shizuku app directly or run via ADB:\n\nadb shell ' + command,
        exitCode: -1,
      };
    }
    try {
      return await ShizukuModule.executeCommand(command);
    } catch (e: any) {
      return { output: '', error: e.message || 'Unknown error', exitCode: -1 };
    }
  }

  // Get running processes
  async getRunningProcesses(): Promise<ProcessInfo[]> {
    if (!this._isNativeAvailable) {
      return [];
    }
    try {
      return await ShizukuModule.getRunningProcesses();
    } catch {
      return [];
    }
  }

  // Event listeners (only work in native mode)
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
      try {
        subscription.remove();
      } catch {}
    });
    this.listeners.clear();
  }
}

export const Shizuku = new ShizukuService();
export default Shizuku;
