# Secure Guard - Military Grade Security App

## Overview
This is a security application optimized for Blu G64 Android devices. It uses the Shizuku framework for system-level operations without requiring root access. The project consists of a React Native/Expo mobile frontend and a FastAPI Python backend.

## Architecture

### Frontend (React Native/Expo)
- Located in `frontend/`
- Built with Expo SDK 55 and expo-router v5 for file-based navigation
- Uses Zustand for state management
- Targets Android devices (Blu G64 specifically)
- Package manager: Yarn
- **Note:** The mobile app cannot run in the Replit web environment directly. It must be built as an Android APK using EAS or locally with Gradle.

### Backend (FastAPI + MongoDB)
- Located in `backend/`
- FastAPI Python web server
- MongoDB database (local instance)
- Runs on port 5000
- Exposed as the web service in Replit

## Running the Application

The application starts with `start.sh`, which:
1. Starts MongoDB on port 27017 (data stored in `data/db/`)
2. Starts FastAPI server on port 5000 (accessible via browser)

The FastAPI backend serves:
- Swagger UI docs at `/docs`
- API endpoints at `/api/...`

## Environment Variables
- `MONGO_URL` - MongoDB connection URL (default: `mongodb://localhost:27017`)
- `DB_NAME` - MongoDB database name (default: `secureguard`)

## Key API Features
- `/api/security/*` - Security scanning, threat detection, enterprise threat removal
- `/api/cache/*` - Cache cleaning history and operations
- `/api/apps/*` - App management (stop, remove, clear cache)
- `/api/vpn/*` - VPN server list and connection management
- `/api/dns/*` - DNS configuration and presets
- `/api/threats/*` - Threat logging and resolution

## Deployment
- Deployment target: VM (always-on, required for MongoDB)
- Run command: `bash /home/runner/workspace/start.sh`

## Building the Android APK
See `BUILD_APK.sh` and `HOW_TO_PUBLISH.md` for instructions on building and publishing the Android APK.
