#!/bin/bash

echo "=========================================="
echo "🛡️  Secure Guard - GitHub Publisher"
echo "   Developer: Richard Carmen Anicola"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if git is installed
echo -e "${BLUE}📋 Step 1: Checking prerequisites...${NC}"
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed. Please install git first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Git is installed${NC}"
echo ""

# Step 2: Get GitHub username
echo -e "${BLUE}📋 Step 2: GitHub Configuration${NC}"
read -p "Enter your GitHub username: " GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo -e "${RED}❌ GitHub username is required${NC}"
    exit 1
fi

REPO_NAME="secure-guard-blu-g64"
echo -e "${GREEN}✅ Repository will be: $GITHUB_USERNAME/$REPO_NAME${NC}"
echo ""

# Step 3: Configure git user
echo -e "${BLUE}📋 Step 3: Configuring Git...${NC}"
git config user.name "Richard Carmen Anicola"
git config user.email "richanicola@gmail.com"
echo -e "${GREEN}✅ Git configured${NC}"
echo ""

# Step 4: Initialize repository
echo -e "${BLUE}📋 Step 4: Initializing Git repository...${NC}"
if [ ! -d ".git" ]; then
    git init
    echo -e "${GREEN}✅ Git repository initialized${NC}"
else
    echo -e "${YELLOW}⚠️  Git repository already initialized${NC}"
fi
echo ""

# Step 5: Add all files
echo -e "${BLUE}📋 Step 5: Adding files to repository...${NC}"
git add .
echo -e "${GREEN}✅ Files added${NC}"
echo ""

# Step 6: Create commit
echo -e "${BLUE}📋 Step 6: Creating commit...${NC}"
git commit -m "feat: Secure Guard - Enterprise virus scanner for Blu G64 with Shizuku

Developer: Richard Carmen Anicola (richanicola@gmail.com)

Features:
- Enterprise spyware detection (TracFone, Facebook, Enterprise Policy, etc.)
- System app cache cleaning and removal via Shizuku
- Force stop and uninstall system apps
- Free worldwide VPN (8 servers: USA, UK, Germany, Japan, Singapore, Canada, Australia)
- DNS manager with DoH support (Cloudflare, Google, Quad9, OpenDNS)
- Military-grade security features for Blu G64

Support development: PayPal 95weisland88@gmail.com"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Commit created${NC}"
else
    echo -e "${YELLOW}⚠️  Nothing to commit or commit already exists${NC}"
fi
echo ""

# Step 7: Set up remote
echo -e "${BLUE}📋 Step 7: Setting up GitHub remote...${NC}"
git remote remove origin 2>/dev/null
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo -e "${GREEN}✅ Remote configured: https://github.com/$GITHUB_USERNAME/$REPO_NAME${NC}"
echo ""

# Step 8: Rename branch to main
echo -e "${BLUE}📋 Step 8: Renaming branch to main...${NC}"
git branch -M main
echo -e "${GREEN}✅ Branch renamed to main${NC}"
echo ""

# Step 9: Instructions for GitHub repo creation
echo -e "${YELLOW}=========================================="
echo "⚠️  IMPORTANT: Create GitHub Repository"
echo "==========================================${NC}"
echo ""
echo "Before pushing, you need to create the repository on GitHub:"
echo ""
echo "1. Go to: ${BLUE}https://github.com/new${NC}"
echo "2. Repository name: ${GREEN}$REPO_NAME${NC}"
echo "3. Description: ${GREEN}Military-grade security app for Blu G64 with enterprise virus scanning${NC}"
echo "4. Make it: ${GREEN}Public${NC}"
echo "5. ${RED}DO NOT${NC} initialize with README, .gitignore, or license"
echo "6. Click ${GREEN}Create repository${NC}"
echo ""
read -p "Press ENTER when you have created the repository on GitHub..."
echo ""

# Step 10: Push to GitHub
echo -e "${BLUE}📋 Step 10: Pushing to GitHub...${NC}"
echo -e "${YELLOW}You will need to enter your GitHub credentials${NC}"
echo ""

git push -u origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
else
    echo -e "${RED}❌ Push failed. Please check your credentials and try:${NC}"
    echo "   git push -u origin main"
    exit 1
fi
echo ""

# Step 11: Create release tag
echo -e "${BLUE}📋 Step 11: Creating release tag...${NC}"
git tag -a v1.0.0 -m "Release v1.0.0 - Enterprise Scanner

Developer: Richard Carmen Anicola
Contact: richanicola@gmail.com
Donate: PayPal 95weisland88@gmail.com

Features:
- Enterprise virus/bloatware detection
- System app management via Shizuku  
- Cache cleaner for all apps
- Free VPN worldwide (8 servers)
- DNS configuration with DoH
- Built specifically for Blu G64"

git push origin v1.0.0

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Release tag created and pushed!${NC}"
else
    echo -e "${YELLOW}⚠️  Tag creation failed. You can create it manually later.${NC}"
fi
echo ""

# Step 12: Success and next steps
echo -e "${GREEN}=========================================="
echo "🎉 SUCCESS! Repository Published!"
echo "==========================================${NC}"
echo ""
echo "📍 Your repository: ${BLUE}https://github.com/$GITHUB_USERNAME/$REPO_NAME${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1. Create GitHub Release:"
echo "   - Go to: https://github.com/$GITHUB_USERNAME/$REPO_NAME/releases/new"
echo "   - Choose tag: v1.0.0"
echo "   - Title: Secure Guard v1.0.0 - Enterprise Security Scanner"
echo "   - Copy description from GITHUB_DEPLOYMENT.md"
echo "   - Click 'Publish release'"
echo ""
echo "2. Add PayPal donation badge (already configured in README.md)"
echo ""
echo "3. Test your repository:"
echo "   - Visit: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo "   - Check README displays correctly"
echo "   - Verify donation link works"
echo ""
echo "4. Share your app:"
echo "   - Repository URL: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo "   - Clone command: git clone https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo ""
echo -e "${GREEN}=========================================="
echo "👨‍💻 Developer: Richard Carmen Anicola"
echo "📧 Email: richanicola@gmail.com"  
echo "💖 Donate: PayPal 95weisland88@gmail.com"
echo "==========================================${NC}"
