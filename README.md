# 🛡️ SECURE GUARD - Military Grade Security App

**Powered by Shizuku** | **For Blu G64 Android Devices**

A comprehensive security application that leverages Shizuku framework to provide military-grade security features including system cache cleaning, app management, VPN services, and DNS configuration.

---

## 🌟 Features

### 🔒 Security Dashboard
- Real-time security score monitoring
- Threat detection and logging
- System-wide security scan
- Active protection status
- Shizuku-powered deep system access

### 🧹 Cache Cleaner
- System-level cache cleaning via Shizuku
- Multi-app selection
- Real-time space calculation
- Cleaning history tracking
- Free up storage efficiently

### 📱 App Manager
- View running and all installed apps
- Force stop apps using Shizuku
- Permission analysis
- Memory usage monitoring
- System vs user app distinction

### 🌐 VPN Service
- **FREE worldwide VPN**
- Multiple server locations (USA, UK, Germany, Japan, Singapore, Canada, Australia)
- WireGuard protocol
- Military-grade AES-256 encryption
- No registration required
- No logs policy
- Real-time latency monitoring

### 🔧 DNS Manager
- Multiple DNS providers (Cloudflare, Google, Quad9, OpenDNS)
- DNS over HTTPS (DoH) support
- Custom DNS configuration
- Malware protection
- Fast DNS resolution
- Privacy-focused

---

## 📋 Prerequisites

### Required Android Components

#### 1. **Shizuku Framework**
Shizuku is essential for system-level operations. Install it before using this app:

**Installation:**
1. Download from [GitHub](https://github.com/RikkaApps/Shizuku/releases) or [Play Store](https://play.google.com/store/apps/details?id=moe.shizuku.privileged.api)
2. Install the APK on your Blu G64
3. Start Shizuku service using one of these methods:

**Method A: Wireless Debugging (Android 11+)**
```bash
# Enable Developer Options and Wireless Debugging on your phone
# Connect to same WiFi network
# On PC/Mac:
adb pair <IP:PORT>
adb tcpip 5555
adb connect <IP:5555>
```

**Method B: USB Debugging**
```bash
# Connect phone via USB
# Enable USB Debugging in Developer Options
# On PC/Mac:
adb shell sh /storage/emulated/0/Android/data/moe.shizuku.privileged.api/start.sh
```

**Method C: Root (if device is rooted)**
- Simply start Shizuku from the app with root permission

#### 2. **Verify Shizuku is Running**
- Open Shizuku app
- You should see "Shizuku is running" status
- Grant necessary permissions when prompted

---

## 🚀 Installation

### For Development

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd secure-guard-app
```

2. **Install dependencies**
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
yarn install
```

3. **Configure environment**
```bash
# Backend .env is already configured
# Frontend .env is already configured
```

4. **Start services**
```bash
# Start MongoDB (if not running)
sudo systemctl start mongodb

# Start backend
cd backend
python server.py

# Start frontend
cd frontend
yarn start
```

### For Production (APK Build)

```bash
cd frontend

# Build for Android
eas build --platform android --profile production

# Or local build
expo prebuild
cd android
./gradlew assembleRelease
```

---

## 📱 Usage Guide

### First Time Setup

1. **Install Shizuku** (see Prerequisites section)
2. **Start Shizuku service** on your Blu G64
3. **Launch Secure Guard app**
4. **Grant permissions** when prompted
5. **App will automatically detect device and create profile**

### Security Dashboard

- **Scan Now**: Performs comprehensive security scan
- **Security Score**: Shows overall device security (0-100)
- **Active Threats**: Displays detected threats
- **Real-time Protection**: Always monitoring

### Cache Cleaner

1. **Select apps** to clean (or use "All" button)
2. **Review total cache** to be cleared
3. **Tap "CLEAN CACHE"** button
4. **Confirm action**
5. **View freed space** in history

### App Manager

- **Running Tab**: Shows currently running apps with memory usage
- **All Apps Tab**: Shows all installed apps
- **Shield Icon**: View app permissions
- **Stop Icon**: Force stop app (requires Shizuku)

### VPN Service

1. **Browse available servers** worldwide
2. **Check latency** (green = fast, yellow = medium, red = slow)
3. **Tap server** to connect
4. **Monitor connection** status
5. **Tap "DISCONNECT"** when done

### DNS Configuration

1. **Choose provider** (Cloudflare, Google, Quad9, OpenDNS)
2. **Or configure custom DNS**
3. **Enable DNS over HTTPS** (DoH) for encryption
4. **Tap provider** to apply configuration
5. **Verify active configuration** at top

---

## 🔧 Technical Architecture

### Frontend Stack
- **Framework**: React Native with Expo Router
- **Navigation**: File-based routing with bottom tabs
- **State Management**: React Hooks + AsyncStorage
- **HTTP Client**: Axios
- **UI Components**: Custom React Native components
- **Icons**: Expo Vector Icons (Ionicons)

### Backend Stack
- **Framework**: FastAPI (Python)
- **Database**: MongoDB with Motor (async)
- **Authentication**: Device ID based
- **API**: RESTful with OpenAPI documentation

### Database Schema

**Collections:**
- `security_scans`: Security scan history
- `cache_results`: Cache cleaning logs
- `vpn_servers`: Available VPN servers
- `vpn_connections`: Active VPN connections
- `dns_configs`: DNS configurations per device
- `threat_logs`: Detected threat records

---

## 🔒 Security & Privacy

### Data Protection
- All data stored locally on device
- MongoDB database secured
- No personal information collected
- Device ID used for identification (not linked to user)

### VPN Privacy
- **No logs policy**: We don't track your activity
- **AES-256 encryption**: Military-grade encryption
- **No registration**: Use anonymously
- **Open source**: Code is auditable

### DNS Security
- **DNS over HTTPS (DoH)**: Encrypted DNS queries
- **Malware blocking**: Protection against malicious domains
- **No query logging**: Privacy-focused providers

---

## 📊 API Endpoints

### Security
- `POST /api/security/scan` - Perform security scan
- `GET /api/security/status/{device_id}` - Get security status
- `GET /api/security/scans/{device_id}` - Get scan history

### Cache
- `POST /api/cache/clean` - Clean app cache
- `GET /api/cache/history/{device_id}` - Get cleaning history

### Apps
- `POST /api/apps/stop` - Stop running app
- `GET /api/apps/running/{device_id}` - Get running apps
- `GET /api/apps/permissions/{package_name}` - Get app permissions

### VPN
- `GET /api/vpn/servers` - List available servers
- `POST /api/vpn/connect` - Connect to server
- `POST /api/vpn/disconnect/{connection_id}` - Disconnect
- `GET /api/vpn/status/{device_id}` - Get connection status

### DNS
- `GET /api/dns/presets` - Get DNS provider presets
- `POST /api/dns/config` - Set DNS configuration
- `GET /api/dns/config/{device_id}` - Get current DNS config

---

## 🎨 Design System

### Color Palette
- **Primary**: #00ff88 (Neon Green)
- **Secondary**: #00aaff (Blue)
- **Warning**: #ff9900 (Orange)
- **Danger**: #ff3366 (Red)
- **Background**: #0a0a0a (Deep Black)
- **Surface**: #1a1a1a (Dark Gray)
- **Text**: #ffffff (White)
- **Text Secondary**: #999999 (Gray)

### Typography
- **Headers**: Bold, 28-36px
- **Body**: Regular, 13-15px
- **Labels**: 11-12px
- **Letter Spacing**: Increased for buttons/badges

---

## 🐛 Troubleshooting

### Shizuku Not Working
1. Restart Shizuku service
2. Re-grant permissions
3. Check if ADB connection is active
4. Verify Android version compatibility

### App Not Stopping
- Ensure Shizuku is running with proper permissions
- Some system apps cannot be stopped
- Check app logs for errors

### VPN Connection Failed
- Check internet connectivity
- Try different server
- Restart app
- Check device firewall settings

### DNS Not Applying
- Verify Shizuku permissions
- Some devices require root for DNS changes
- Try rebooting device after applying

---

## 🚀 Future Enhancements

- [ ] Native Shizuku module integration
- [ ] Advanced malware scanning
- [ ] Real-time network monitoring
- [ ] Firewall rules management
- [ ] Automatic app cleanup scheduler
- [ ] Widget support
- [ ] Dark/Light theme options
- [ ] Multi-language support
- [ ] Export security reports

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Shizuku Framework** by RikkaApps
- **Expo Team** for amazing React Native tooling
- **FastAPI** for modern Python API framework
- **MongoDB** for flexible database solution

---

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing issues for solutions
- Contribute via pull requests

---

## ⚠️ Disclaimer

This app requires system-level access via Shizuku. Use responsibly and at your own risk. Always backup your data before using system-level tools. This is a security utility app and should be used for legitimate purposes only.

---

**Built with ❤️ for Blu G64 and Android Security**

**Powered by Shizuku | Military Grade Security**
