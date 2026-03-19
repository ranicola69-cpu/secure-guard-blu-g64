#!/bin/bash

echo "=========================================="
echo "🔨 Secure Guard APK Builder"
echo "   Developer: Richard Carmen Anicola"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📋 Building APK for Secure Guard...${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Must be run from /app directory${NC}"
    exit 1
fi

cd frontend

echo -e "${BLUE}Step 1: Installing EAS CLI (if needed)...${NC}"
if ! command -v eas &> /dev/null; then
    npm install -g eas-cli
fi

echo ""
echo -e "${BLUE}Step 2: Building APK with EAS Build (Cloud)...${NC}"
echo -e "${YELLOW}This will build your APK in the cloud (easiest method)${NC}"
echo ""

read -p "Do you have an Expo account? (y/n): " has_account

if [ "$has_account" = "y" ] || [ "$has_account" = "Y" ]; then
    echo ""
    echo -e "${GREEN}Great! Logging in to Expo...${NC}"
    eas login
    
    echo ""
    echo -e "${BLUE}Configuring build...${NC}"
    eas build:configure
    
    echo ""
    echo -e "${BLUE}Starting APK build...${NC}"
    echo -e "${YELLOW}This will take 5-10 minutes...${NC}"
    eas build --platform android --profile preview
    
    echo ""
    echo -e "${GREEN}=========================================="
    echo "✅ Build Complete!"
    echo "==========================================${NC}"
    echo ""
    echo "📥 Download your APK from:"
    echo "   https://expo.dev/accounts/[your-account]/projects/frontend/builds"
    echo ""
    echo "Then upload to GitHub:"
    echo "1. Download the APK from Expo"
    echo "2. Rename it to: SecureGuard.apk"
    echo "3. Go to: https://github.com/ranicola69-cpu/secure-guard-blu-g64/releases"
    echo "4. Click 'Edit' on your latest release"
    echo "5. Drag and drop SecureGuard.apk"
    echo "6. Click 'Update release'"
    echo ""
else
    echo ""
    echo -e "${YELLOW}No problem! Here are your options:${NC}"
    echo ""
    echo "Option 1: Create Free Expo Account (Recommended)"
    echo "  1. Go to: https://expo.dev/signup"
    echo "  2. Sign up for free"
    echo "  3. Run this script again"
    echo "  4. EAS Build will create your APK in the cloud"
    echo ""
    echo "Option 2: Local Build (Requires Android Studio)"
    echo "  1. Install Android Studio"
    echo "  2. Install Android SDK and build tools"
    echo "  3. Run: npx expo prebuild --platform android"
    echo "  4. Run: cd android && ./gradlew assembleRelease"
    echo "  5. APK: android/app/build/outputs/apk/release/app-release.apk"
    echo ""
fi

echo ""
echo -e "${GREEN}=========================================="
echo "📚 Need Help?"
echo "==========================================${NC}"
echo "Email: richanicola@gmail.com"
echo "Docs: See BUILD_APK_GUIDE.md"
echo ""
