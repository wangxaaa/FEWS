#!/bin/bash
# Setup checklist untuk FEWS Supabase + ESP32

echo "╔════════════════════════════════════════════════════════╗"
echo "║     FEWS Integration Checklist - ESP32 + Vercel       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_status() {
  echo -e "${YELLOW}[?]${NC} $1"
}

success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

error() {
  echo -e "${RED}[✗]${NC} $1"
}

echo ""
echo "LANGKAH 1: Verifikasi Program ESP32"
echo "======================================"
check_status "Apakah program ini sudah di-upload ke ESP32?"
echo "   File: esp32_s3_fews_v3.ino ATAU program original Anda"
echo ""

echo "LANGKAH 2: Setup Vercel Environment"
echo "======================================"
echo "1. Buka https://vercel.com → Dashboard"
echo "2. Project: fews-supabase"
echo "3. Settings → Environment Variables"
echo "4. Add variable:"
echo "   Name: API_KEY"
echo "   Value: fews2026"
echo "5. Redeploy project"
echo ""
check_status "Sudah set API_KEY di Vercel?"

echo ""
echo "LANGKAH 3: Setup Supabase Database"
echo "======================================"
echo "1. Buka https://supabase.com → Console"
echo "2. Pilih project FEWS"
echo "3. SQL Editor → New Query"
echo "4. Copy-paste dari file: SETUP_GUIDE.md (SQL schema)"
echo "5. Run query"
echo ""
check_status "Sudah create table sensor_data?"

echo ""
echo "LANGKAH 4: Test Backend"
echo "======================================"
echo "Test 1: Dummy Data"
echo "   Buka: https://fews-hs15.vercel.app/api/test-data"
echo "   Expected: status 200, data saved"
echo ""
check_status "Dummy test OK?"

echo "Test 2: Lihat Data Terbaru"
echo "   Buka: https://fews-hs15.vercel.app/api"
echo "   Expected: JSON dengan sensor data"
echo ""
check_status "Endpoint /api OK?"

echo ""
echo "LANGKAH 5: Monitor Serial ESP32"
echo "======================================"
echo "Arduino IDE → Serial Monitor (115200 baud)"
echo "Expected output:"
echo "   ✓ Fuzzy Logic OK"
echo "   ✓ WiFi connected"
echo "   ✓ HTTP Server OK"
echo "   ✓ Every 10sec: sendToServer() → HTTP 200"
echo ""
check_status "Serial Monitor output OK?"

echo ""
echo "LANGKAH 6: Test Dashboard"
echo "======================================"
echo "1. Buka: http://localhost:3000 (local) ATAU domain"
echo "2. Input IP ESP32: 192.168.137.104"
echo "3. Click 'Hubungkan'"
echo "4. Check: Data sensor muncul?"
echo ""
check_status "Dashboard loading data?"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                   TROUBLESHOOTING TIPS                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "❌ Dashboard shows 'Offline':"
echo "   → Check API key match: ESP32 'fews2026' = Vercel API_KEY"
echo "   → Check WiFi: ping fews-hs15.vercel.app dari PC"
echo "   → Check Supabase: Verify table exists"
echo ""
echo "❌ ESP32 crashes setelah 10 detik:"
echo "   → Upload program: esp32_s3_fews_v3.ino (clean version)"
echo "   → Check watchdog: Remove esp_task_wdt calls"
echo ""
echo "❌ Data tidak tersimpan:"
echo "   → Check Serial: Is sendToServer() returning HTTP 200?"
echo "   → Check API_KEY: Echo curl test dengan correct key"
echo ""
echo "❌ CORS error di browser:"
echo "   → Verify api/data.js has CORS headers ✓"
echo "   → Verify api/index.js has CORS headers ✓"
echo ""
echo "✅ All good? Contact: Check SETUP_GUIDE.md for details"
echo ""
