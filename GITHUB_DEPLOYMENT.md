# 🚀 GitHub Deployment Guide for Secure Guard App

This guide will help you push your Secure Guard security app to GitHub and prepare it for release.

---

## 📋 Prerequisites

1. **Git installed** on your system
2. **GitHub account** created
3. **Personal Access Token** (if using HTTPS) or **SSH key** configured
4. **Repository** created on GitHub (or ready to create)

---

## 🔧 Step 1: Initialize Git Repository (If Not Already Done)

```bash
# Navigate to your app directory
cd /app

# Initialize git repository
git init

# Set your identity
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

---

## 📝 Step 2: Create .gitignore File

Make sure you have a proper `.gitignore` to exclude unnecessary files:

```bash
# Check if .gitignore exists
cat .gitignore
```

The `.gitignore` should include:

```
# Node modules
node_modules/
frontend/node_modules/

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.so
*.egg
*.egg-info/
dist/
build/
backend/.env

# Expo
.expo/
.expo-shared/
frontend/.metro-cache/

# Environment variables
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
logs/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Testing
.pytest_cache/
coverage/

# Database
*.db
*.sqlite
*.sqlite3
```

---

## 🎯 Step 3: Prepare Your Repository

### A. Create Repository on GitHub

1. Go to https://github.com
2. Click **"New repository"**
3. Enter repository name: `secure-guard-app` (or your preferred name)
4. Choose **Public** or **Private**
5. **DO NOT** initialize with README (we already have one)
6. Click **"Create repository"**

### B. Stage Your Files

```bash
# Add all files to staging
git add .

# Check what will be committed
git status

# Review the files being added
git diff --cached --name-only
```

### C. Create Initial Commit

```bash
# Commit your code
git commit -m "feat: Initial commit - Secure Guard military-grade security app

Features:
- Security Dashboard with real-time monitoring
- Cache Cleaner with Shizuku integration
- App Manager with force stop capability
- Free worldwide VPN service (8 servers)
- DNS Manager with DoH support
- Backend APIs with FastAPI
- MongoDB database integration
- React Native Expo frontend
- Material design UI with dark theme"
```

---

## 🔗 Step 4: Connect to GitHub

### Option A: Using HTTPS (Recommended for Beginners)

```bash
# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/secure-guard-app.git

# Verify remote
git remote -v
```

### Option B: Using SSH (Recommended for Advanced Users)

```bash
# Add GitHub remote
git remote add origin git@github.com:YOUR_USERNAME/secure-guard-app.git

# Verify remote
git remote -v
```

---

## 📤 Step 5: Push to GitHub

### First Push (Main Branch)

```bash
# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

If you get authentication errors:

**For HTTPS:**
```bash
# GitHub will prompt for credentials
# Use your GitHub username and Personal Access Token (not password)
```

**For SSH:**
```bash
# Make sure SSH key is added to GitHub
ssh -T git@github.com
```

---

## 🏷️ Step 6: Create a Release Tag

```bash
# Create a version tag
git tag -a v1.0.0 -m "Release v1.0.0 - Initial Release

Military-grade security app for Android with:
- Shizuku-powered system operations
- Free worldwide VPN
- DNS management with DoH
- Real-time security monitoring
- Cache cleaning
- App management"

# Push tags to GitHub
git push origin --tags
```

---

## 📱 Step 7: Create GitHub Release

1. Go to your repository on GitHub
2. Click **"Releases"** (right sidebar)
3. Click **"Create a new release"**
4. Choose tag: **v1.0.0**
5. Release title: **"Secure Guard v1.0.0 - Initial Release"**
6. Description:

```markdown
# 🛡️ Secure Guard v1.0.0

Military-grade security application for Android devices.

## 🌟 Features
- ✅ Security Dashboard with real-time monitoring
- ✅ Cache Cleaner (Shizuku-powered)
- ✅ App Manager with force stop
- ✅ Free VPN (8 worldwide servers)
- ✅ DNS Manager (DoH support)
- ✅ Material dark theme UI

## 📋 Requirements
- Android 11+
- Shizuku Framework
- Developer Options enabled
- 50MB storage space

## 📥 Installation

### APK (Coming Soon)
Build APK using:
```bash
cd frontend
expo prebuild
cd android
./gradlew assembleRelease
```

### Development
See [README.md](README.md) for development setup.

## 📖 Documentation
- [Setup Guide](README.md)
- [Shizuku Setup](SHIZUKU_SETUP.md)

## 🐛 Known Issues
None reported yet.

## 🙏 Credits
- Shizuku Framework by RikkaApps
- Built with Expo & FastAPI
```

7. Click **"Publish release"**

---

## 🔄 Step 8: Future Updates

### Making Changes

```bash
# Make your code changes
# ...

# Stage changes
git add .

# Commit with descriptive message
git commit -m "fix: Fixed VPN connection timeout issue"

# Push to GitHub
git push origin main
```

### Creating New Releases

```bash
# Create new version tag
git tag -a v1.0.1 -m "Release v1.0.1 - Bug fixes"

# Push tag
git push origin v1.0.1

# Create GitHub Release (follow Step 7)
```

---

## 📦 Step 9: Build APK for Release

### Option A: EAS Build (Cloud Build)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
cd frontend
eas build:configure

# Build APK
eas build --platform android --profile production

# Download APK from EAS dashboard
```

### Option B: Local Build

```bash
cd frontend

# Prebuild native code
npx expo prebuild --platform android

# Build APK
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

### Option C: AAB for Play Store

```bash
cd frontend/android
./gradlew bundleRelease

# AAB location:
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📤 Step 10: Upload APK to GitHub Release

1. Build your APK (see Step 9)
2. Go to your GitHub Release
3. Click **"Edit release"**
4. Drag and drop APK file to **"Attach binaries"** section
5. Name it: `SecureGuard-v1.0.0.apk`
6. Click **"Update release"**

---

## 🌐 Step 11: Add Topics to Repository

On GitHub repository page:
1. Click **"⚙️"** (gear icon) next to About
2. Add topics:
   - `android`
   - `security`
   - `vpn`
   - `shizuku`
   - `cache-cleaner`
   - `dns`
   - `react-native`
   - `expo`
   - `fastapi`
   - `mongodb`
3. Click **"Save changes"**

---

## 📊 Step 12: Set Up GitHub Pages (Optional - For Docs)

```bash
# Create docs branch
git checkout -b gh-pages

# Create simple docs page
echo "# Secure Guard Documentation

Visit [GitHub Repository](https://github.com/YOUR_USERNAME/secure-guard-app)

[Download Latest Release](https://github.com/YOUR_USERNAME/secure-guard-app/releases/latest)
" > index.md

# Commit and push
git add index.md
git commit -m "docs: Add GitHub Pages"
git push origin gh-pages

# Go to Settings > Pages on GitHub
# Select source: gh-pages branch
```

---

## ✅ Verification Checklist

After pushing to GitHub, verify:

- [ ] Repository is visible on GitHub
- [ ] README.md displays correctly
- [ ] SHIZUKU_SETUP.md is accessible
- [ ] .gitignore is working (no node_modules, .env files)
- [ ] All source files are present
- [ ] License file is added (if needed)
- [ ] Release is created with tag
- [ ] Topics are added
- [ ] Repository description is set

---

## 🔒 Security Notes

### Before Pushing:

1. **Remove sensitive data:**
   ```bash
   # Check for secrets
   git secrets --scan
   
   # Or manually search
   grep -r "api_key" .
   grep -r "password" .
   grep -r "secret" .
   ```

2. **Review .env files:**
   - Ensure `.env` files are in `.gitignore`
   - Never commit API keys or credentials
   - Use environment variable placeholders in README

3. **Add .env.example:**
   ```bash
   # Create example file
   cp frontend/.env frontend/.env.example
   
   # Replace values with placeholders
   # EXPO_PUBLIC_BACKEND_URL=https://your-domain.com
   ```

---

## 📝 Additional Files to Add

### LICENSE

Create `LICENSE` file:

```
MIT License

Copyright (c) 2025 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### CONTRIBUTING.md

```markdown
# Contributing to Secure Guard

Thank you for your interest in contributing!

## How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Code Style

- Follow existing code style
- Write clear commit messages
- Add comments for complex logic
- Test your changes

## Reporting Bugs

Open an issue with:
- Device information
- Android version
- Steps to reproduce
- Expected vs actual behavior
```

---

## 🎉 You're Done!

Your Secure Guard app is now on GitHub and ready for the world!

### Share Your Repository:

```
Repository URL: https://github.com/YOUR_USERNAME/secure-guard-app
Latest Release: https://github.com/YOUR_USERNAME/secure-guard-app/releases/latest
```

---

## 🔗 Useful Commands

```bash
# Clone your repository (for others)
git clone https://github.com/YOUR_USERNAME/secure-guard-app.git

# Check repository status
git status

# View commit history
git log --oneline

# View remote URL
git remote -v

# Fetch latest changes
git pull origin main

# Create new branch
git checkout -b feature/new-feature

# Switch branches
git checkout main

# Delete branch
git branch -d feature/old-feature
```

---

**Need Help?**
- [GitHub Docs](https://docs.github.com)
- [Git Documentation](https://git-scm.com/doc)
- [GitHub Community](https://github.community)
