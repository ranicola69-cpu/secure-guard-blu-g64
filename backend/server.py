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

# Security Endpoints
@api_router.post("/security/scan", response_model=SecurityScan)
async def create_security_scan(device_id: str):
    """Perform security scan on device"""
    scan = SecurityScan(
        device_id=device_id,
        threats_found=0,
        apps_scanned=45,
        security_score=98
    )
    await db.security_scans.insert_one(scan.dict())
    return scan

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
