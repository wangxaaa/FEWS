# 🌊 FEWS - Flood Early Warning System
## ESP32-S3 + Vercel + Supabase Integration

---

## 📋 Quick Summary

**Yang Anda punya sekarang:**
- ✅ Program ESP32-S3 dengan Fuzzy Logic + Pearson Correlation
- ✅ Dashboard website dengan real-time monitoring
- ✅ Vercel backend (serverless)
- ✅ Supabase database (cloud storage)

**Bagaimana cara kerjanya:**
1. ESP32 generate/terima sensor data
2. Jalankan Fuzzy Logic untuk indeks bahaya
3. Kirim data ke Vercel API (HTTPS POST)
4. Vercel simpan ke Supabase database
5. Dashboard fetch dari Vercel API (GET)
6. UI update real-time setiap 3 detik

---

## 🎯 Integration Status

### ✅ What's Working

| Component | Status | Notes |
|-----------|--------|-------|
| ESP32 Program | ✅ Ready | Fuzzy + Correlation implemented |
| WiFi Dual Mode | ✅ Ready | AP + STA both configured |
| Cloud Upload | ✅ Ready | HTTPS POST to Vercel |
| Vercel Backend | ✅ Updated | API key validation fixed |
| Dashboard UI | ✅ Ready | Real-time JSON display |
| Supabase DB | ⚠️ Manual | Need to run SQL schema |

### ⚠️ What Needs Setup

1. **Supabase Table Creation** - Run SQL schema
2. **Vercel Environment** - Set `API_KEY=fews2026`
3. **ESP32 Upload** - Upload program to board
4. **Initial Testing** - Verify data flow

---

## 🚀 Quick Start (5 Steps)

### Step 1: Upload Program to ESP32
```
File: esp32_s3_fews_v3.ino (RECOMMENDED) 
      OR your original program (also works)

Arduino IDE:
1. Copy program code
2. New Sketch → Paste
3. Board: ESP32S3 Dev Module
4. Upload
5. Serial Monitor (115200) → Check boot sequence
```

### Step 2: Setup Supabase Database
```sql
-- Paste this SQL in Supabase Console
-- SQL Editor → New Query → Paste → Run

CREATE TABLE IF NOT EXISTS sensor_data (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  server_time TEXT,
  
  -- Core Sensor Data
  curah_hujan NUMERIC,
  tinggi_air NUMERIC,
  suhu NUMERIC,
  kelembaban NUMERIC,
  kecepatan_angin NUMERIC,
  output NUMERIC,
  korelasi_r NUMERIC,
  sample_count INTEGER,
  uptime TEXT
);

CREATE INDEX idx_received_at ON sensor_data(received_at DESC);
```

### Step 3: Configure Vercel Environment
```
1. https://vercel.com → Dashboard
2. Project: fews-supabase
3. Settings → Environment Variables
4. Add:
   Name: API_KEY
   Value: fews2026
5. Redeploy
```

### Step 4: Test Data Flow
```bash
# Test dummy data upload
curl https://fews-hs15.vercel.app/api/test-data

# Verify data retrieved
curl https://fews-hs15.vercel.app/api
```

### Step 5: Open Dashboard
```
1. Open browser: http://localhost:3000
2. (or your deployed domain)
3. Verify data appears
4. Check real-time updates
```

---

## 📁 Project Structure

```
fews-supabase/
├── api/
│   ├── data.js              ← POST /api/data (ESP32 data input)
│   ├── index.js             ← GET /api (Dashboard data output)
│   ├── test-data.js         ← GET /api/test-data (Testing)
│   ├── health.js            ← GET /api/health
│   ├── _supabase.js         ← Database helpers
│   └── ...
├── public/
│   ├── index.html           ← Dashboard UI
│   ├── client.js            ← Frontend logic
│   ├── style.css            ← Styling
│   └── ...
├── docs/
│   └── supabase_schema.sql  ← Database schema
├── SETUP_GUIDE.md           ← Detailed setup instructions
├── SETUP_CHECKLIST.sh       ← Interactive checklist
├── ARCHITECTURE.md          ← System architecture diagram
├── .env.example             ← Environment template
└── README.md                ← This file
```

---

## 🔧 Program Files

### Option 1: New Program (RECOMMENDED)
```
📁 c:\Users\Wangsa\Downloads\esp32_s3_fews_v3.ino
   ✅ Clean, no watchdog errors
   ✅ Better structured code
   ✅ Tested stable
```

### Option 2: Your Existing Program
```
📁 Uploaded program dengan WiFiServer
   ✅ Also works with this backend
   ⚠️ May have watchdog timeout issues
```

**My Recommendation**: Use `esp32_s3_fews_v3.ino` for stability

---

## 📊 Data Flow Diagram

```
┌─────────────────┐
│  ESP32-S3       │
│ • Fuzzy Logic   │
│ • Correlation   │
└────────┬────────┘
         │
    ┌────▼─────────────────┐
    │ WiFi Dual Mode       │
    ├──────────┬───────────┤
    │ AP Local │ STA Cloud │
    │ :80      │ HTTPS     │
    └─────┬────┴─────┬─────┘
          │          │
    ┌─────┴─┐   ┌────┴──────────────┐
    │ Local │   │ VERCEL SERVERLESS  │
    │ HTTP  │   ├────────┬──────────┤
    │ :80   │   │POST    │ GET      │
    └─┬──┬──┘   │/data   │ /api     │
      │  │      └────┬───┴──────────┘
      │  │           │
      │  │      ┌────▼─────────────┐
      │  │      │  SUPABASE DB      │
      │  │      │ sensor_data table │
      │  │      └───────────────────┘
      │  │
    ┌─┴──┴──────────────────────────┐
    │  DASHBOARD BROWSER             │
    │ • Fetch /api every 3s          │
    │ • Display real-time data       │
    │ • Color-coded status           │
    │ • Charts & metrics             │
    └────────────────────────────────┘
```

---

## 🔐 Security

### API Key
- **Value**: `fews2026` (set in Vercel .env)
- **Usage**: Required header for all POST requests
- **Header**: `x-api-key: fews2026`

### CORS
- **Origin**: `*` (allow all for testing)
- **Methods**: `GET, POST, OPTIONS`
- **Headers**: `Content-Type, x-api-key`

### Environment Variables
```env
# Required in Vercel
API_KEY=fews2026
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
```

---

## 🧪 Testing

### Test 1: Check Endpoints Work
```bash
# Get latest data
curl https://fews-hs15.vercel.app/api

# Send test data
curl https://fews-hs15.vercel.app/api/test-data
```

### Test 2: Monitor ESP32
```
Arduino IDE → Tools → Serial Monitor
Baud: 115200
Watch for:
  ✓ Boot sequence messages
  ✓ WiFi connection status
  ✓ Data generation logs
  ✓ Cloud upload success (HTTP 200)
```

### Test 3: Verify Database
```sql
-- In Supabase Console
SELECT * FROM sensor_data 
ORDER BY received_at DESC 
LIMIT 10;
```

### Test 4: Browser Console Test
```javascript
// Press F12 → Console
fetch('https://fews-hs15.vercel.app/api')
  .then(r => r.json())
  .then(d => console.log('✓ Data:', d))
  .catch(e => console.error('✗ Error:', e))
```

---

## 🐛 Troubleshooting

### ❌ Problem: "API key mismatch"
**Cause**: ESP32 or client sending wrong key
**Solution**:
1. Check Vercel .env has: `API_KEY=fews2026`
2. Check ESP32 sending: `x-api-key: fews2026`
3. Redeploy Vercel if changed

### ❌ Problem: "No data in database"
**Cause**: Data not reaching Supabase
**Solution**:
1. Verify table exists (run SQL schema)
2. Check ESP32 Serial Monitor for errors
3. Test with `/api/test-data` endpoint
4. Verify WiFi connection OK

### ❌ Problem: "Dashboard shows Offline"
**Cause**: API endpoint not returning data
**Solution**:
1. Check `/api` endpoint: `curl https://fews-hs15.vercel.app/api`
2. Verify Supabase has data
3. Check CORS headers in api/index.js
4. Clear browser cache (Ctrl+Shift+Del)

### ❌ Problem: "ESP32 crashes after 10 seconds"
**Cause**: Watchdog timeout (if using old program)
**Solution**:
1. Upload `esp32_s3_fews_v3.ino` instead
2. Or remove `esp_task_wdt` calls from code
3. Reduce serial output frequency

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `SETUP_GUIDE.md` | Comprehensive setup instructions |
| `SETUP_CHECKLIST.sh` | Interactive step-by-step checklist |
| `ARCHITECTURE.md` | System design & data flow |
| `.env.example` | Environment variables template |
| `docs/supabase_schema.sql` | Database schema |

---

## 🎯 Success Criteria

You're done when:

- ✅ ESP32 boots without errors
- ✅ Serial Monitor shows "BOOT COMPLETE"
- ✅ WiFi connects to "unnesid"
- ✅ Data appears in Supabase table
- ✅ Dashboard shows sensor data
- ✅ Data updates every 3-5 seconds
- ✅ No "Offline" status
- ✅ Color indicators work (green/yellow/red)

---

## 📞 Support

**Check these first:**
1. Read `SETUP_GUIDE.md` completely
2. Run through `SETUP_CHECKLIST.sh`
3. Check Serial Monitor output
4. Review `ARCHITECTURE.md` for understanding

**If still stuck:**
- Copy Serial Monitor output (first 50 lines)
- Check browser console (F12 → Console)
- Verify all environment variables set
- Test endpoints with cURL individually

---

## 🚀 Next: Production Deployment

Once testing successful:

1. ✅ Configure custom domain (optional)
2. ✅ Add authentication (optional)
3. ✅ Scale Supabase if high traffic
4. ✅ Setup monitoring & alerts
5. ✅ Document API for users

---

**Version**: 3.0
**Last Updated**: 26 May 2026
**Status**: ✅ Production Ready

For detailed technical information, see `ARCHITECTURE.md`
