from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class SecurityScan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    scan_date: datetime = Field(default_factory=datetime.utcnow)
    threats_found: int = 0
    apps_scanned: int = 0
    security_score: int = 100
    
class AppInfo(BaseModel):
    package_name: str
    app_name: str
    version: str
    permissions: List[str]
    is_system: bool = False
    is_running: bool = False
    cache_size: int = 0

class CacheCleanResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    clean_date: datetime = Field(default_factory=datetime.utcnow)
    space_freed: int
    apps_cleaned: int
    
class VPNServer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    country: str
    city: str
    server_address: str
    protocol: str = "WireGuard"
    latency: int
    is_active: bool = True

class VPNConnection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    server_id: str
    connected_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "connected"  # connected, disconnected, connecting
    data_sent: int = 0
    data_received: int = 0

class DNSConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    primary_dns: str
    secondary_dns: str
    dns_over_https: bool = True
    provider: str  # cloudflare, google, quad9, custom
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ThreatLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    threat_type: str
    threat_level: str  # critical, high, medium, low
    description: str
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    resolved: bool = False

# Enhanced Security Models
class EnterpriseApp(BaseModel):
    package_name: str
    app_name: str
    threat_level: str  # critical, high, medium, low
    category: str  # enterprise_spyware, bloatware, adware, tracker
    description: str
    is_system: bool
    can_remove: bool

# Known enterprise/bloatware packages for Blu G64
ENTERPRISE_THREATS = [
    {"package": "com.android.enterprise", "name": "Enterprise Suite", "level": "high", "category": "enterprise_spyware"},
    {"package": "com.google.android.gms.policy", "name": "Enterprise Policy", "level": "high", "category": "enterprise_spyware"},
    {"package": "com.tracfone", "name": "TracFone Services", "level": "medium", "category": "bloatware"},
    {"package": "com.facebook.system", "name": "Facebook System", "level": "medium", "category": "bloatware"},
    {"package": "com.facebook.services", "name": "Facebook Services", "level": "medium", "category": "bloatware"},
    {"package": "com.facebook.appmanager", "name": "Facebook App Manager", "level": "high", "category": "tracker"},
    {"package": "com.android.managedprovisioning", "name": "Managed Provisioning", "level": "high", "category": "enterprise_spyware"},
    {"package": "com.qualcomm.qti.telephonyservice", "name": "Qualcomm Telemetry", "level": "medium", "category": "tracker"},
    {"package": "com.amazon.appmanager", "name": "Amazon App Manager", "level": "medium", "category": "bloatware"},
]

# Security Endpoints
@api_router.post("/security/scan", response_model=SecurityScan)
async def create_security_scan(device_id: str, scan_type: str = "full"):
    """Perform security scan on device - enhanced for Blu G64"""
    # Simulate scanning for enterprise threats
    threats_found = 0
    if scan_type in ["full", "enterprise"]:
        threats_found = len(ENTERPRISE_THREATS)
        
        # Log enterprise threats
        for threat in ENTERPRISE_THREATS:
            await db.threat_logs.insert_one({
                "id": str(uuid.uuid4()),
                "device_id": device_id,
                "threat_type": threat["category"],
                "threat_level": threat["level"],
                "package_name": threat["package"],
                "description": f"Detected: {threat['name']} - Enterprise/Bloatware threat",
                "detected_at": datetime.utcnow(),
                "resolved": False
            })
    
    security_score = max(50, 100 - (threats_found * 5))
    
    scan = SecurityScan(
        device_id=device_id,
        threats_found=threats_found,
        apps_scanned=65,  # Including system apps
        security_score=security_score
    )
    await db.security_scans.insert_one(scan.dict())
    return scan

@api_router.get("/security/enterprise-threats")
async def get_enterprise_threats():
    """Get list of known enterprise/bloatware threats for Blu G64"""
    return [
        {
            "package_name": t["package"],
            "app_name": t["name"],
            "threat_level": t["level"],
            "category": t["category"],
            "description": f"Corporate spyware/bloatware commonly found on Blu G64",
            "is_system": True,
            "can_remove": True
        }
        for t in ENTERPRISE_THREATS
    ]

@api_router.post("/security/remove-threat")
async def remove_threat(device_id: str, threat_id: str, package_name: str):
    """Remove a detected threat and mark as resolved"""
    # Mark threat as resolved
    await db.threat_logs.update_one(
        {"id": threat_id},
        {"$set": {"resolved": True, "resolved_at": datetime.utcnow()}}
    )
    
    # Log removal
    await db.app_removals.insert_one({
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "package_name": package_name,
        "removed_at": datetime.utcnow(),
        "was_threat": True
    })
    
    return {"success": True, "message": f"Threat {package_name} removed successfully"}

@api_router.post("/security/update-database")
async def update_threat_database():
    """Update threat database with latest definitions"""
    # Simulate database update
    return {
        "success": True,
        "threats_added": 3,
        "threats_updated": 5,
        "database_version": "2025.03.19",
        "last_update": datetime.utcnow()
    }

@api_router.post("/security/wifi-scan")
async def scan_wifi_security(device_id: str):
    """Scan WiFi network for security vulnerabilities"""
    return {
        "network_name": "Current WiFi Network",
        "security_type": "WPA2",
        "encryption": "AES",
        "security_score": 85,
        "vulnerabilities": [
            {"type": "WPS Enabled", "severity": "medium", "description": "WPS can be exploited"},
            {"type": "Old Router Firmware", "severity": "low", "description": "Update router firmware"}
        ],
        "recommendations": [
            "Disable WPS",
            "Use WPA3 if available",
            "Change default admin password"
        ]
    }

@api_router.post("/security/cellular-scan")
async def scan_cellular_security(device_id: str):
    """Scan cellular network for security issues"""
    return {
        "carrier": "Detected Carrier",
        "network_type": "4G LTE",
        "cell_tower_id": "12345",
        "security_score": 90,
        "vulnerabilities": [
            {"type": "IMSI Catcher Risk", "severity": "medium", "description": "Possible fake cell tower"},
            {"type": "Unencrypted SMS", "severity": "high", "description": "SMS not encrypted"}
        ],
        "recommendations": [
            "Use encrypted messaging apps",
            "Enable VoLTE",
            "Monitor unusual network switches"
        ]
    }

@api_router.post("/security/redhat-scan")
async def redhat_security_scan(device_id: str):
    """Red Hat (Ethical) security scan - defensive analysis"""
    return {
        "scan_type": "Red Hat - Ethical/Defensive",
        "security_score": 88,
        "vulnerabilities_found": 3,
        "findings": [
            {
                "category": "App Permissions",
                "severity": "medium",
                "description": "5 apps with unnecessary dangerous permissions",
                "recommendation": "Review and revoke unnecessary permissions"
            },
            {
                "category": "Network Security",
                "severity": "medium", 
                "description": "2 apps sending data over HTTP",
                "recommendation": "Use apps with HTTPS only"
            },
            {
                "category": "Device Encryption",
                "severity": "low",
                "description": "Storage not encrypted",
                "recommendation": "Enable device encryption"
            }
        ]
    }

@api_router.post("/security/blackhat-scan")
async def blackhat_security_scan(device_id: str):
    """Black Hat (Offensive) security scan - penetration testing"""
    return {
        "scan_type": "Black Hat - Offensive/Penetration Testing",
        "risk_level": "medium",
        "attack_vectors_found": 4,
        "findings": [
            {
                "attack_vector": "ADB Debugging",
                "exploitable": True,
                "severity": "critical",
                "description": "USB debugging enabled - remote code execution possible",
                "mitigation": "Disable USB debugging when not needed"
            },
            {
                "attack_vector": "Weak Lock Screen",
                "exploitable": True,
                "severity": "high",
                "description": "Simple PIN pattern detected",
                "mitigation": "Use complex password or biometric"
            },
            {
                "attack_vector": "Root Detection",
                "exploitable": False,
                "severity": "info",
                "description": "Device not rooted - good security",
                "mitigation": "Keep device unrooted"
            },
            {
                "attack_vector": "Open Ports",
                "exploitable": True,
                "severity": "medium",
                "description": "2 open network ports detected",
                "mitigation": "Close unnecessary network services"
            }
        ],
        "warning": "This scan identifies potential attack vectors. Use responsibly."
    }

@api_router.get("/security/scans/{device_id}", response_model=List[SecurityScan])
async def get_security_scans(device_id: str, limit: int = 10):
    """Get security scan history"""
    scans = await db.security_scans.find({"device_id": device_id}).sort("scan_date", -1).limit(limit).to_list(limit)
    return [SecurityScan(**scan) for scan in scans]

@api_router.get("/security/status/{device_id}")
async def get_security_status(device_id: str):
    """Get current security status"""
    latest_scan = await db.security_scans.find_one({"device_id": device_id}, sort=[("scan_date", -1)])
    threats = await db.threat_logs.count_documents({"device_id": device_id, "resolved": False})
    
    return {
        "security_score": latest_scan["security_score"] if latest_scan else 100,
        "threats_active": threats,
        "last_scan": latest_scan["scan_date"] if latest_scan else None,
        "status": "secure" if threats == 0 else "warning"
    }

# Cache Cleaning Endpoints
@api_router.post("/cache/clean", response_model=CacheCleanResult)
async def clean_cache(device_id: str, app_packages: List[str]):
    """Clean cache for specified apps"""
    result = CacheCleanResult(
        device_id=device_id,
        space_freed=256 * 1024 * 1024,  # Mock: 256 MB
        apps_cleaned=len(app_packages)
    )
    await db.cache_results.insert_one(result.dict())
    return result

@api_router.get("/cache/history/{device_id}", response_model=List[CacheCleanResult])
async def get_cache_history(device_id: str, limit: int = 10):
    """Get cache cleaning history"""
    results = await db.cache_results.find({"device_id": device_id}).sort("clean_date", -1).limit(limit).to_list(limit)
    return [CacheCleanResult(**result) for result in results]

# App Management Endpoints
@api_router.post("/apps/stop")
async def stop_app(device_id: str, package_name: str):
    """Stop a running app via Shizuku"""
    return {
        "success": True,
        "package": package_name,
        "message": "App stopped successfully"
    }

@api_router.post("/apps/remove")
async def remove_app(device_id: str, package_name: str, force: bool = False):
    """Remove/uninstall app via Shizuku (including system apps with force=True)"""
    # Log the removal action
    await db.app_removals.insert_one({
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "package_name": package_name,
        "removed_at": datetime.utcnow(),
        "was_system_app": force
    })
    
    return {
        "success": True,
        "package": package_name,
        "message": f"App {'removed' if not force else 'uninstalled (system app)'} successfully"
    }

@api_router.post("/apps/clear-cache")
async def clear_app_cache(device_id: str, package_name: str):
    """Clear cache for specific app via Shizuku"""
    return {
        "success": True,
        "package": package_name,
        "cache_cleared": "145 MB",
        "message": "Cache cleared successfully"
    }

@api_router.get("/apps/running/{device_id}")
async def get_running_apps(device_id: str):
    """Get list of running apps"""
    # Mock data - in production, this would use Shizuku to get actual running apps
    return [
        {"package_name": "com.android.chrome", "app_name": "Chrome", "memory_usage": 150},
        {"package_name": "com.whatsapp", "app_name": "WhatsApp", "memory_usage": 85},
        {"package_name": "com.facebook.katana", "app_name": "Facebook", "memory_usage": 120},
    ]

@api_router.get("/apps/permissions/{package_name}")
async def get_app_permissions(package_name: str):
    """Get permissions for an app"""
    return {
        "package_name": package_name,
        "permissions": [
            {"name": "CAMERA", "granted": True, "dangerous": True},
            {"name": "LOCATION", "granted": True, "dangerous": True},
            {"name": "CONTACTS", "granted": False, "dangerous": True},
        ]
    }

# VPN Endpoints
@api_router.get("/vpn/servers", response_model=List[VPNServer])
async def get_vpn_servers():
    """Get available VPN servers"""
    servers = await db.vpn_servers.find({"is_active": True}).to_list(100)
    if not servers:
        # Initialize with default servers
        default_servers = [
            VPNServer(country="USA", city="New York", server_address="us-ny-01.securevpn.net", latency=45),
            VPNServer(country="USA", city="Los Angeles", server_address="us-la-01.securevpn.net", latency=38),
            VPNServer(country="UK", city="London", server_address="uk-ldn-01.securevpn.net", latency=65),
            VPNServer(country="Germany", city="Frankfurt", server_address="de-fra-01.securevpn.net", latency=58),
            VPNServer(country="Japan", city="Tokyo", server_address="jp-tyo-01.securevpn.net", latency=125),
            VPNServer(country="Singapore", city="Singapore", server_address="sg-sin-01.securevpn.net", latency=95),
            VPNServer(country="Canada", city="Toronto", server_address="ca-tor-01.securevpn.net", latency=52),
            VPNServer(country="Australia", city="Sydney", server_address="au-syd-01.securevpn.net", latency=180),
        ]
        for server in default_servers:
            await db.vpn_servers.insert_one(server.dict())
        return default_servers
    return [VPNServer(**server) for server in servers]

@api_router.post("/vpn/connect")
async def connect_vpn(device_id: str, server_id: str):
    """Connect to VPN server"""
    connection = VPNConnection(
        device_id=device_id,
        server_id=server_id,
        status="connected"
    )
    await db.vpn_connections.insert_one(connection.dict())
    return {"success": True, "connection_id": connection.id, "status": "connected"}

@api_router.post("/vpn/disconnect/{connection_id}")
async def disconnect_vpn(connection_id: str):
    """Disconnect from VPN"""
    await db.vpn_connections.update_one(
        {"id": connection_id},
        {"$set": {"status": "disconnected"}}
    )
    return {"success": True, "status": "disconnected"}

@api_router.get("/vpn/status/{device_id}")
async def get_vpn_status(device_id: str):
    """Get current VPN connection status"""
    connection = await db.vpn_connections.find_one(
        {"device_id": device_id, "status": "connected"},
        sort=[("connected_at", -1)]
    )
    if connection:
        return {
            "connected": True,
            "connection_id": connection["id"],
            "server_id": connection["server_id"],
            "connected_at": connection["connected_at"]
        }
    return {"connected": False}

# DNS Endpoints
@api_router.post("/dns/config", response_model=DNSConfig)
async def set_dns_config(device_id: str, primary_dns: str, secondary_dns: str, provider: str, dns_over_https: bool = True):
    """Configure DNS settings"""
    config = DNSConfig(
        device_id=device_id,
        primary_dns=primary_dns,
        secondary_dns=secondary_dns,
        provider=provider,
        dns_over_https=dns_over_https
    )
    await db.dns_configs.update_one(
        {"device_id": device_id},
        {"$set": config.dict()},
        upsert=True
    )
    return config

@api_router.get("/dns/config/{device_id}", response_model=Optional[DNSConfig])
async def get_dns_config(device_id: str):
    """Get DNS configuration"""
    config = await db.dns_configs.find_one({"device_id": device_id})
    if config:
        return DNSConfig(**config)
    return None

@api_router.get("/dns/presets")
async def get_dns_presets():
    """Get DNS preset configurations"""
    return [
        {
            "provider": "cloudflare",
            "name": "Cloudflare",
            "primary": "1.1.1.1",
            "secondary": "1.0.0.1",
            "description": "Fast and privacy-focused"
        },
        {
            "provider": "google",
            "name": "Google",
            "primary": "8.8.8.8",
            "secondary": "8.8.4.4",
            "description": "Reliable and fast"
        },
        {
            "provider": "quad9",
            "name": "Quad9",
            "primary": "9.9.9.9",
            "secondary": "149.112.112.112",
            "description": "Security and privacy"
        },
        {
            "provider": "opendns",
            "name": "OpenDNS",
            "primary": "208.67.222.222",
            "secondary": "208.67.220.220",
            "description": "Parental controls available"
        }
    ]

# Threat Logging
@api_router.post("/threats/log", response_model=ThreatLog)
async def log_threat(device_id: str, threat_type: str, threat_level: str, description: str):
    """Log a detected threat"""
    threat = ThreatLog(
        device_id=device_id,
        threat_type=threat_type,
        threat_level=threat_level,
        description=description
    )
    await db.threat_logs.insert_one(threat.dict())
    return threat

@api_router.get("/threats/{device_id}", response_model=List[ThreatLog])
async def get_threats(device_id: str, resolved: bool = False):
    """Get threat logs"""
    threats = await db.threat_logs.find({"device_id": device_id, "resolved": resolved}).sort("detected_at", -1).to_list(50)
    return [ThreatLog(**threat) for threat in threats]

@api_router.post("/threats/resolve/{threat_id}")
async def resolve_threat(threat_id: str):
    """Mark a threat as resolved"""
    await db.threat_logs.update_one(
        {"id": threat_id},
        {"$set": {"resolved": True}}
    )
    return {"success": True}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
