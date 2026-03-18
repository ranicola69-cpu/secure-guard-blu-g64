# 🔧 Shizuku Setup Guide for Secure Guard App

## What is Shizuku?

Shizuku is a framework that allows apps to use system APIs without root access. It provides a way for apps like Secure Guard to perform system-level operations (cache cleaning, force stopping apps, etc.) on Android devices.

---

## 📋 Requirements

- **Android Device**: Blu G64 (or any Android 11+ device)
- **Developer Options**: Enabled
- **USB Debugging**: Enabled (for initial setup)
- **Computer**: Windows, Mac, or Linux (for ADB setup)
- **ADB Tools**: Android Debug Bridge installed

---

## 🚀 Step-by-Step Installation

### Step 1: Install Shizuku App

**Option A: Google Play Store** (Recommended)
1. Open Google Play Store on your Blu G64
2. Search for "Shizuku"
3. Install "Shizuku" by RikkaW
4. Open the app

**Option B: GitHub (Latest Version)**
1. Visit: https://github.com/RikkaApps/Shizuku/releases
2. Download latest APK (e.g., `shizuku-v13.x.x.r1234.release.apk`)
3. Enable "Install from Unknown Sources" if prompted
4. Install the APK
5. Open Shizuku app

### Step 2: Enable Developer Options

1. Open **Settings** on your Blu G64
2. Scroll to **About Phone**
3. Find **Build Number**
4. Tap **Build Number** 7 times rapidly
5. You'll see "You are now a developer!"

### Step 3: Enable USB Debugging

1. Go back to **Settings**
2. Find **Developer Options** (usually under System or Additional Settings)
3. Enable **USB Debugging**
4. Enable **USB Debugging (Security Settings)** if available

### Step 4: Install ADB on Your Computer

**For Windows:**
```cmd
# Download Platform Tools from:
# https://developer.android.com/studio/releases/platform-tools

# Extract to C:\platform-tools
# Add to PATH or use full path
```

**For Mac:**
```bash
# Using Homebrew
brew install android-platform-tools

# Verify installation
adb version
```

**For Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install adb

# Fedora
sudo dnf install android-tools

# Verify
adb version
```

### Step 5: Start Shizuku via ADB

**Method 1: USB Connection (Easiest)**

1. Connect Blu G64 to computer via USB cable
2. On phone, tap **"Allow USB Debugging"** when prompted
3. Check "Always allow from this computer" (optional)
4. Open terminal/command prompt on computer
5. Run:

```bash
# Verify device is connected
adb devices

# You should see:
# List of devices attached
# XXXXXXXXXX    device

# Start Shizuku
adb shell sh /storage/emulated/0/Android/data/moe.shizuku.privileged.api/start.sh
```

6. Open Shizuku app on phone
7. You should see **"Shizuku is running"**

**Method 2: Wireless Debugging (Android 11+)**

1. Enable **Wireless Debugging** in Developer Options
2. Tap **Pair device with pairing code**
3. Note the IP address and port (e.g., 192.168.1.100:43567)
4. On computer:

```bash
# Pair device (one-time)
adb pair 192.168.1.100:43567
# Enter the 6-digit pairing code shown on phone

# Connect
adb connect 192.168.1.100:5555

# Start Shizuku
adb shell sh /storage/emulated/0/Android/data/moe.shizuku.privileged.api/start.sh
```

5. Open Shizuku app
6. Verify **"Shizuku is running"**

**Method 3: Root Access (If Rooted)**

1. Open Shizuku app
2. Tap **"Start via Root"**
3. Grant root permission when prompted
4. Shizuku will start automatically

---

## ✅ Verifying Shizuku is Working

### In Shizuku App:

1. Open Shizuku
2. Check status at top:
   - ✅ **"Shizuku is running"** = Working
   - ❌ **"Shizuku is not running"** = Not working
3. Note the version number
4. Scroll down to see "Authorized Applications"

### Grant Secure Guard Access:

1. Open **Secure Guard** app
2. When prompted, grant Shizuku permission
3. Go back to Shizuku app
4. Check "Authorized Applications" list
5. You should see "Secure Guard" listed

---

## 🔄 Making Shizuku Persistent

### Auto-Start on Boot (Requires ADB Each Boot)

Unfortunately, Shizuku doesn't persist after reboot without root. You need to:

**Option A: Quick Start Script**

Create a script on your computer for easy restart:

**Windows (start_shizuku.bat):**
```batch
@echo off
adb shell sh /storage/emulated/0/Android/data/moe.shizuku.privileged.api/start.sh
echo Shizuku started!
pause
```

**Mac/Linux (start_shizuku.sh):**
```bash
#!/bin/bash
adb shell sh /storage/emulated/0/Android/data/moe.shizuku.privileged.api/start.sh
echo "Shizuku started!"
```

Make executable: `chmod +x start_shizuku.sh`

**Option B: Root Access**

If your device is rooted, Shizuku will auto-start on boot.

**Option C: Wireless ADB (Stays Active)**

Once wireless ADB is enabled, it persists until:
- Device reboots
- USB debugging is disabled
- Developer options are disabled

---

## 🐛 Troubleshooting

### Issue: "Device not found" when running adb commands

**Solutions:**
1. Check USB cable (try different cable/port)
2. Enable USB Debugging again
3. Revoke USB debugging authorizations and re-allow
4. Try `adb kill-server` then `adb start-server`
5. Install device-specific USB drivers (Windows)

### Issue: "Shizuku is not running" after following steps

**Solutions:**
1. Restart Shizuku app
2. Re-run ADB command
3. Check if ADB devices shows your device
4. Verify USB Debugging is still enabled
5. Try rebooting phone
6. Reinstall Shizuku app

### Issue: Shizuku stops after disconnecting USB

**This is normal!** Shizuku requires:
- Active ADB connection (USB or Wireless)
- OR Root access

To keep running:
- Use Wireless ADB (persists until reboot)
- Get root access (permanent)

### Issue: "Permission denied" when accessing system features

**Solutions:**
1. Ensure Shizuku is running (check status)
2. Grant Shizuku permission to Secure Guard
3. Restart both apps
4. Re-start Shizuku via ADB

### Issue: Wireless ADB not working

**Solutions:**
1. Ensure phone and computer on same WiFi network
2. Disable VPN on both devices
3. Check firewall settings
4. Use port 5555 for connection
5. Try pairing again with new code

### Issue: Shizuku stops working after Android update

**Solutions:**
1. Update Shizuku to latest version
2. Re-enable Developer Options
3. Re-enable USB Debugging
4. Re-authorize computer
5. Start Shizuku again via ADB

---

## 🔒 Security Considerations

### Is Shizuku Safe?

✅ **YES**, when used properly:
- Open source (code is auditable)
- Developed by trusted developer (RikkaW)
- Used by millions worldwide
- No root required
- Permissions explicitly granted per app

### Best Practices:

1. **Only grant Shizuku access to trusted apps**
2. **Download Shizuku from official sources only**
3. **Keep Shizuku updated**
4. **Don't leave USB Debugging always enabled** (security risk)
5. **Use strong device PIN/password**
6. **Revoke access for unused apps**

### What Can Apps Do with Shizuku?

**Allowed:**
- Access system APIs
- Clear app cache
- Stop running apps
- Read system information
- Manage app permissions

**Not Allowed:**
- Install apps without confirmation
- Access root-level system files
- Bypass Android security model
- Modify system partition

---

## 📱 Using Secure Guard with Shizuku

Once Shizuku is set up:

1. **Start Shizuku** (via ADB or root)
2. **Open Secure Guard app**
3. **Grant Shizuku permission** when prompted
4. **Features now enabled:**
   - ✅ Cache Cleaner (system-level cleaning)
   - ✅ Force Stop Apps (stop any app)
   - ✅ Permission Analysis (deep scan)
   - ✅ System Security Scan

### Feature Status Without Shizuku:

- ⚠️ Cache Cleaner: Limited to user apps only
- ⚠️ Force Stop: May not work for all apps
- ⚠️ Permission Analysis: Surface-level only
- ✅ VPN Service: Works fully
- ✅ DNS Manager: Works fully
- ✅ Security Dashboard: Works with limitations

---

## 🆘 Quick Reference Commands

```bash
# Check connected devices
adb devices

# Start Shizuku
adb shell sh /storage/emulated/0/Android/data/moe.shizuku.privileged.api/start.sh

# Wireless pairing
adb pair <IP>:<PORT>

# Wireless connect
adb connect <IP>:5555

# Wireless disconnect
adb disconnect

# Restart ADB server
adb kill-server
adb start-server

# Check Shizuku status (on device)
# Open Shizuku app and check status bar
```

---

## 📚 Additional Resources

- **Shizuku Official Website**: https://shizuku.rikka.app/
- **GitHub Repository**: https://github.com/RikkaApps/Shizuku
- **Documentation**: https://shizuku.rikka.app/guide/
- **ADB Setup Guide**: https://developer.android.com/studio/command-line/adb
- **Support**: https://github.com/RikkaApps/Shizuku/issues

---

## 🎓 Video Tutorials

1. Search YouTube for "How to setup Shizuku"
2. Search "Shizuku ADB setup tutorial"
3. Watch device-specific guides for Blu G64

---

## ✅ Checklist

Before using Secure Guard, ensure:

- [ ] Shizuku app installed
- [ ] Developer Options enabled
- [ ] USB Debugging enabled
- [ ] ADB installed on computer
- [ ] Device connected and authorized
- [ ] Shizuku started via ADB command
- [ ] Shizuku shows "running" status
- [ ] Secure Guard granted Shizuku permission
- [ ] Features working in Secure Guard

---

**You're all set! Enjoy military-grade security with Secure Guard! 🛡️**
