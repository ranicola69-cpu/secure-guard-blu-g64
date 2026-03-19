// Native Shizuku Module TypeScript Wrapper
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { ShizukuModule } = NativeModules;

interface ShizukuEventEmitter {
  addListener: (eventType: string, listener: (...args: any[]) => void) => { remove: () => void };
}

const shizukuEmitter: ShizukuEventEmitter | null = Platform.OS === 'android' && ShizukuModule 
  ? new NativeEventEmitter(ShizukuModule) 
  : null;

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

class ShizukuService {
  private listeners: Map<string, any> = new Map();

  // Check if Shizuku app is installed
  async isInstalled(): Promise<boolean> {
    if (Platform.OS !== 'android' || !ShizukuModule) return false;
    try {
      return await ShizukuModule.isShizukuInstalled();
    } catch {
      return false;
    }
  }

  // Check if Shizuku service is running
  async isRunning(): Promise<boolean> {
    if (Platform.OS !== 'android' || !ShizukuModule) return false;
    try {
      return await ShizukuModule.isShizukuRunning();
    } catch {
      return false;
    }
  }

  // Get Shizuku version
  async getVersion(): Promise<number> {
    if (Platform.OS !== 'android' || !ShizukuModule) return -1;
    try {
      return await ShizukuModule.getShizukuVersion();
    } catch {
      return -1;
    }
  }

  // Check if we have Shizuku permission
  async checkPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !ShizukuModule) return false;
    try {
      return await ShizukuModule.checkPermission();
    } catch {
      return false;
    }
  }

  // Request Shizuku permission
  requestPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      if (Platform.OS !== 'android' || !ShizukuModule) {
        resolve(false);
        return;
      }
      ShizukuModule.requestPermission((granted: boolean) => {
        resolve(granted);
      });
    });
  }

  // Get all installed packages
  async getInstalledPackages(): Promise<PackageInfo[]> {
    if (Platform.OS !== 'android' || !ShizukuModule) return [];
    try {
      return await ShizukuModule.getInstalledPackages();
    } catch {
      return [];
    }
  }

  // Force stop an app
  async forceStopPackage(packageName: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !ShizukuModule) return false;
    try {
      return await ShizukuModule.forceStopPackage(packageName);
    } catch {
      return false;
    }
  }

  // Clear app cache
  async clearAppCache(packageName: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !ShizukuModule) return false;
    try {
      return await ShizukuModule.clearAppCache(packageName);
    } catch {
      return false;
    }
  }

  // Uninstall a package
  async uninstallPackage(packageName: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !ShizukuModule) return false;
    try {
      return await ShizukuModule.uninstallPackage(packageName);
    } catch {
      return false;
    }
  }

  // Disable a package (for system apps)
  async disablePackage(packageName: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !ShizukuModule) return false;
    try {
      return await ShizukuModule.disablePackage(packageName);
    } catch {
      return false;
    }
  }

  // Enable a package
  async enablePackage(packageName: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !ShizukuModule) return false;
    try {
      return await ShizukuModule.enablePackage(packageName);
    } catch {
      return false;
    }
  }

  // Grant permission to an app
  async grantPermission(packageName: string, permission: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !ShizukuModule) return false;
    try {
      return await ShizukuModule.grantPermission(packageName, permission);
    } catch {
      return false;
    }
  }

  // Revoke permission from an app
  async revokePermission(packageName: string, permission: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !ShizukuModule) return false;
    try {
      return await ShizukuModule.revokePermission(packageName, permission);
    } catch {
      return false;
    }
  }

  // Execute a shell command
  async executeCommand(command: string): Promise<CommandResult> {
    if (Platform.OS !== 'android' || !ShizukuModule) {
      return { output: '', error: 'Not supported', exitCode: -1 };
    }
    try {
      return await ShizukuModule.executeCommand(command);
    } catch (e: any) {
      return { output: '', error: e.message, exitCode: -1 };
    }
  }

  // Get running processes
  async getRunningProcesses(): Promise<ProcessInfo[]> {
    if (Platform.OS !== 'android' || !ShizukuModule) return [];
    try {
      return await ShizukuModule.getRunningProcesses();
    } catch {
      return [];
    }
  }

  // Event listeners
  onConnected(callback: () => void) {
    if (!shizukuEmitter) return { remove: () => {} };
    const subscription = shizukuEmitter.addListener('onShizukuConnected', callback);
    this.listeners.set('connected', subscription);
    return subscription;
  }

  onDisconnected(callback: () => void) {
    if (!shizukuEmitter) return { remove: () => {} };
    const subscription = shizukuEmitter.addListener('onShizukuDisconnected', callback);
    this.listeners.set('disconnected', subscription);
    return subscription;
  }

  onPermissionResult(callback: (granted: boolean) => void) {
    if (!shizukuEmitter) return { remove: () => {} };
    const subscription = shizukuEmitter.addListener('onShizukuPermissionResult', (data) => {
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

export const Shizuku = new ShizukuService();
export default Shizuku;
