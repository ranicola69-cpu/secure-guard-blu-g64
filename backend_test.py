#!/usr/bin/env python3
"""
Backend API Testing for Secure Guard Security App
Tests all security, cache cleaning, app management, VPN, DNS, and threat logging APIs
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Backend URL from frontend/.env
BASE_URL = "https://military-grade-vpn.preview.emergentagent.com/api"

# Test device ID
DEVICE_ID = "test123"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        self.failed_tests = []
        
    def test_endpoint(self, method, endpoint, expected_status=200, data=None, params=None):
        """Test a single endpoint"""
        try:
            url = f"{BASE_URL}{endpoint}"
            
            if method.upper() == "GET":
                response = self.session.get(url, params=params)
            elif method.upper() == "POST":
                if data:
                    if isinstance(data, list):
                        response = self.session.post(url, json=data, params=params)
                    elif isinstance(data, dict):
                        response = self.session.post(url, json=data, params=params)
                    else:
                        response = self.session.post(url, data=data, params=params)
                else:
                    response = self.session.post(url, params=params)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            success = response.status_code == expected_status
            result = {
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_size": len(response.text),
                "response_data": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text[:200]
            }
            
            if not success:
                self.failed_tests.append(result)
            
            self.results.append(result)
            return response, success
            
        except requests.exceptions.RequestException as e:
            result = {
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": "ERROR",
                "success": False,
                "error": str(e),
                "response_data": None
            }
            self.failed_tests.append(result)
            self.results.append(result)
            return None, False
        except Exception as e:
            result = {
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": "EXCEPTION",
                "success": False,
                "error": str(e),
                "response_data": None
            }
            self.failed_tests.append(result)
            self.results.append(result)
            return None, False

    def test_security_apis(self):
        """Test all security-related API endpoints"""
        print("🔒 Testing Security APIs...")
        
        # 1. Create security scan
        print("  Testing POST /security/scan...")
        response, success = self.test_endpoint("POST", f"/security/scan?device_id={DEVICE_ID}")
        if success and response:
            scan_data = response.json()
            print(f"    ✅ Security scan created: Score {scan_data.get('security_score', 'N/A')}")
        
        # 2. Get security status
        print("  Testing GET /security/status...")
        response, success = self.test_endpoint("GET", f"/security/status/{DEVICE_ID}")
        if success and response:
            status_data = response.json()
            print(f"    ✅ Security status: {status_data.get('status', 'N/A')}")
        
        # 3. Get scan history
        print("  Testing GET /security/scans...")
        response, success = self.test_endpoint("GET", f"/security/scans/{DEVICE_ID}")
        if success and response:
            scans = response.json()
            print(f"    ✅ Scan history retrieved: {len(scans)} scans")

    def test_cache_apis(self):
        """Test cache cleaning API endpoints"""
        print("🧹 Testing Cache Cleaning APIs...")
        
        # 1. Clean cache for specific apps
        print("  Testing POST /cache/clean...")
        apps_to_clean = ["com.test.app1", "com.test.app2"]
        response, success = self.test_endpoint(
            "POST", 
            f"/cache/clean?device_id={DEVICE_ID}",
            data=apps_to_clean
        )
        if success and response:
            clean_data = response.json()
            print(f"    ✅ Cache cleaned: {clean_data.get('space_freed', 0)} bytes freed")
        
        # 2. Get cleaning history
        print("  Testing GET /cache/history...")
        response, success = self.test_endpoint("GET", f"/cache/history/{DEVICE_ID}")
        if success and response:
            history = response.json()
            print(f"    ✅ Cache history retrieved: {len(history)} entries")

    def test_app_management_apis(self):
        """Test app management API endpoints"""
        print("📱 Testing App Management APIs...")
        
        # 1. Stop an app
        print("  Testing POST /apps/stop...")
        response, success = self.test_endpoint(
            "POST", 
            f"/apps/stop?device_id={DEVICE_ID}&package_name=com.test.app"
        )
        if success and response:
            stop_data = response.json()
            print(f"    ✅ App stop: {stop_data.get('message', 'N/A')}")
        
        # 2. Get running apps
        print("  Testing GET /apps/running...")
        response, success = self.test_endpoint("GET", f"/apps/running/{DEVICE_ID}")
        if success and response:
            apps = response.json()
            print(f"    ✅ Running apps retrieved: {len(apps)} apps")
        
        # 3. Get app permissions
        print("  Testing GET /apps/permissions...")
        response, success = self.test_endpoint("GET", "/apps/permissions/com.android.chrome")
        if success and response:
            perms = response.json()
            permissions = perms.get('permissions', [])
            print(f"    ✅ App permissions retrieved: {len(permissions)} permissions")

    def test_vpn_apis(self):
        """Test VPN API endpoints"""
        print("🌐 Testing VPN APIs...")
        
        # 1. Get VPN servers (should return 8 servers)
        print("  Testing GET /vpn/servers...")
        response, success = self.test_endpoint("GET", "/vpn/servers")
        server_id = None
        if success and response:
            servers = response.json()
            print(f"    ✅ VPN servers retrieved: {len(servers)} servers")
            if len(servers) >= 8:
                print(f"    ✅ Expected 8+ servers found")
                server_id = servers[0].get('id')
            else:
                print(f"    ❌ Expected 8+ servers, found {len(servers)}")
        
        # 2. Connect to VPN server
        if server_id:
            print("  Testing POST /vpn/connect...")
            response, success = self.test_endpoint(
                "POST", 
                f"/vpn/connect?device_id={DEVICE_ID}&server_id={server_id}"
            )
            connection_id = None
            if success and response:
                connect_data = response.json()
                connection_id = connect_data.get('connection_id')
                print(f"    ✅ VPN connected: {connect_data.get('status', 'N/A')}")
            
            # 3. Get VPN status
            print("  Testing GET /vpn/status...")
            response, success = self.test_endpoint("GET", f"/vpn/status/{DEVICE_ID}")
            if success and response:
                status_data = response.json()
                print(f"    ✅ VPN status: {'Connected' if status_data.get('connected') else 'Disconnected'}")
            
            # 4. Disconnect VPN
            if connection_id:
                print("  Testing POST /vpn/disconnect...")
                response, success = self.test_endpoint("POST", f"/vpn/disconnect/{connection_id}")
                if success and response:
                    disconnect_data = response.json()
                    print(f"    ✅ VPN disconnected: {disconnect_data.get('status', 'N/A')}")

    def test_dns_apis(self):
        """Test DNS API endpoints"""
        print("🌍 Testing DNS APIs...")
        
        # 1. Get DNS presets (should return 4 providers)
        print("  Testing GET /dns/presets...")
        response, success = self.test_endpoint("GET", "/dns/presets")
        if success and response:
            presets = response.json()
            print(f"    ✅ DNS presets retrieved: {len(presets)} providers")
            if len(presets) >= 4:
                print(f"    ✅ Expected 4+ providers found")
            else:
                print(f"    ❌ Expected 4+ providers, found {len(presets)}")
        
        # 2. Set DNS configuration
        print("  Testing POST /dns/config...")
        response, success = self.test_endpoint(
            "POST", 
            f"/dns/config?device_id={DEVICE_ID}&primary_dns=1.1.1.1&secondary_dns=1.0.0.1&provider=cloudflare&dns_over_https=true"
        )
        if success and response:
            config_data = response.json()
            print(f"    ✅ DNS config set: {config_data.get('provider', 'N/A')}")
        
        # 3. Get DNS configuration
        print("  Testing GET /dns/config...")
        response, success = self.test_endpoint("GET", f"/dns/config/{DEVICE_ID}")
        if success and response:
            config = response.json()
            if config:
                print(f"    ✅ DNS config retrieved: {config.get('provider', 'N/A')}")
            else:
                print(f"    ❌ No DNS config found")

    def test_threat_logging_apis(self):
        """Test threat logging API endpoints"""
        print("⚠️  Testing Threat Logging APIs...")
        
        # 1. Log a threat
        print("  Testing POST /threats/log...")
        response, success = self.test_endpoint(
            "POST", 
            f"/threats/log?device_id={DEVICE_ID}&threat_type=malware&threat_level=high&description=Test threat"
        )
        threat_id = None
        if success and response:
            threat_data = response.json()
            threat_id = threat_data.get('id')
            print(f"    ✅ Threat logged: {threat_data.get('threat_type', 'N/A')}")
        
        # 2. Get threat logs
        print("  Testing GET /threats...")
        response, success = self.test_endpoint("GET", f"/threats/{DEVICE_ID}")
        if success and response:
            threats = response.json()
            print(f"    ✅ Threat logs retrieved: {len(threats)} threats")
        
        # 3. Resolve threat
        if threat_id:
            print("  Testing POST /threats/resolve...")
            response, success = self.test_endpoint("POST", f"/threats/resolve/{threat_id}")
            if success and response:
                resolve_data = response.json()
                print(f"    ✅ Threat resolved: {resolve_data.get('success', 'N/A')}")

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting Secure Guard Backend API Tests")
        print(f"📍 Base URL: {BASE_URL}")
        print(f"🆔 Device ID: {DEVICE_ID}")
        print("=" * 50)
        
        # Run tests in order (as some depend on data from others)
        self.test_security_apis()
        print()
        
        self.test_cache_apis()
        print()
        
        self.test_app_management_apis()
        print()
        
        self.test_vpn_apis()
        print()
        
        self.test_dns_apis()
        print()
        
        self.test_threat_logging_apis()
        print()
        
        # Summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        total_tests = len(self.results)
        passed_tests = total_tests - len(self.failed_tests)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {len(self.failed_tests)} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"  - {test['method']} {test['endpoint']}")
                print(f"    Expected: {test['expected_status']}, Got: {test['actual_status']}")
                if 'error' in test:
                    print(f"    Error: {test['error']}")
                print()
        
        # Detailed results for analysis
        print("\n📝 DETAILED RESULTS:")
        for result in self.results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['method']} {result['endpoint']} - {result['actual_status']}")

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()