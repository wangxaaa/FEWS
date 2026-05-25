# 🔗 FEWS Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FEWS - Complete System                              │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────────┐
                    │   ESP32-S3 Smart Gateway     │
                    │  Fuzzy Logic + Correlation   │
                    │   WiFi Dual Mode (AP+STA)    │
                    └──────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
          ┌─────┴─────┐            ┌───────┴────────┐
          │  Lokal AP  │            │  Cloud (STA)   │
          │ 192.168.4.1│            │  via WiFi      │
          │  TCP:80    │            │  HTTPS POST    │
          └─────┬─────┘            └───────┬────────┘
                │                           │
         ┌──────┴────────┐          ┌──────┴──────────────────┐
         │               │          │                         │
    ┌────┴─────┐   ┌────┴─────┐   ┌┴────────────────────────┐│
    │ Dashboard │   │ Postman/ │   │  VERCEL SERVERLESS      ││
    │ Browser   │   │ cURL     │   │  ┌──────────────────┐   ││
    │ Local     │   │ Test     │   │  │  /api/data (POST)│   ││
    │ :3000     │   │          │   │  │  Auth: x-api-key│   ││
    └──────┬────┘   └──────────┘   │  └────────┬─────────┘   ││
           │                        │          │              ││
           │                        │          ▼              ││
           │                        │      ┌─────────────┐    ││
           │                        │      │  /api/data  │    ││
           │                        │      │  (handler)  │    ││
           │                        │      └────┬────────┘    ││
           │                        │           │             ││
           │                        │      ┌────┴────────┐    ││
           │                        │      │  /api       │    ││
           │                        │      │  (GET JSON) │    ││
           │                        │      └────┬────────┘    ││
           │                        │           │             ││
           │                        └───────────┼─────────────┘│
           │                                    │              │
           │                        ┌───────────┴─────────────┐
           │                        │   SUPABASE POSTGRESQL   │
           │                        │  ┌─────────────────────┐│
           │                        │  │  Table: sensor_data ││
           │                        │  │  - curah_hujan      ││
           │                        │  │  - tinggi_air       ││
           │                        │  │  - suhu, kelembaban ││
           │                        │  │  - output, korelasi ││
           │                        │  └─────────────────────┘│
           │                        └─────────────────────────┘
           │
    ┌──────┴────────────────────────────────────────┐
    │ GET /api (Real-time JSON Response)            │
    │ ┌─────────────────────────────────────────┐   │
    │ │ {                                       │   │
    │ │   curah_hujan: 5.2,                     │   │
    │ │   tinggi_air: 120,                      │   │
    │ │   suhu: 24.5,                           │   │
    │ │   output: 50.2,                         │   │
    │ │   korelasi_r: 0.123,                    │   │
    │ │   data_age_sec: 12                      │   │
    │ │ }                                       │   │
    │ └─────────────────────────────────────────┘   │
    └────────────────────────────────────────────────┘
```

---

## Data Flow Sequence

### 1️⃣ Initialization Phase (Startup)
```
ESP32 BOOT
├─ Serial 115200 init
├─ Fuzzy Logic setup (3 rules, 2 inputs)
├─ WiFi mode: AP_STA
│  ├─ AP: FEWS_Flood_System (192.168.4.1)
│  └─ STA: Connect unnesid (192.168.137.x)
├─ TCP Server listen :80
└─ Generate initial test data
```

### 2️⃣ Runtime Loop (Main Cycle - every 10 sec)
```
LOOP ITERATION
├─ Check WiFi connection
├─ processData() from sensor/TCP
│  ├─ Update 20-sample history
│  ├─ Calculate Pearson correlation
│  ├─ Run Fuzzy Logic rules
│  └─ Prepare JSON payload
└─ sendToServer() to Cloud
   ├─ HTTP POST to https://fews-hs15.vercel.app/api/data
   ├─ Header: x-api-key: fews2026
   ├─ Body: {curah_hujan, tinggi_air, suhu, ...}
   └─ Response: 200 OK
```

### 3️⃣ Cloud Processing (Vercel)
```
POST /api/data (from ESP32)
├─ Validate API_KEY header
├─ Parse JSON body
├─ Validate required fields
├─ Calculate Pearson (if needed)
└─ Insert into Supabase

GET /api (from Dashboard)
├─ Query latest row from sensor_data
├─ Format response with testing parameters
└─ Return JSON
```

### 4️⃣ Dashboard Display (Browser)
```
BROWSER → Dashboard
├─ Fetch GET /api every 3 seconds
├─ Parse JSON response
├─ Update UI cards:
│  ├─ Sensor data (rain, water, temp)
│  ├─ Fuzzy output (0-100)
│  ├─ Pearson correlation
│  └─ Uptime + data age
└─ Color code status (green/yellow/red)
```

---

## API Contract

### REQUEST: ESP32 → Vercel

```
HTTP POST /api/data
Host: fews-hs15.vercel.app
Content-Type: application/json
x-api-key: fews2026

{
  "curah_hujan": 5.2,
  "tinggi_air": 120,
  "suhu": 24.5,
  "kelembaban": 65,
  "kecepatan_angin": 3.2,
  "output": 50.2,
  "korelasi_r": 0.123,
  "sample_count": 15,
  "uptime": "00:05:23"
}
```

### RESPONSE: Success (200 OK)
```json
{
  "ok": true,
  "received": "26/05/2026 14:30:45"
}
```

### RESPONSE: Error (401 Unauthorized)
```json
{
  "error": "Unauthorized — API key mismatch. Got: wrong_key, Expected: fews2026"
}
```

---

## Response: Dashboard

### REQUEST: Browser → Vercel
```
GET /api
Accept: application/json
```

### RESPONSE: Latest Sensor Data (200 OK)
```json
{
  "curah_hujan": 5.2,
  "tinggi_air": 120,
  "suhu": 24.5,
  "kelembaban": 65,
  "kecepatan_angin": 3.2,
  "output": 50.2,
  "korelasi_r": 0.123,
  "sample_count": 15,
  "uptime": "00:05:23",
  "server_time": "26/05/2026 14:30:45",
  "received_at": "2026-05-26T14:30:45.000Z",
  "data_age_sec": 12,
  "wifi_status": "connected",
  
  "akurasi": {
    "persen": null,
    "total_prediksi": null,
    "benar": null,
    "kategori_prediksi": null,
    "kategori_aktual": null
  },
  "response_time": {
    "last_ms": null,
    "min_ms": null,
    "max_ms": null,
    "avg_ms": null
  },
  "stabilitas": {
    "cv_air": null,
    "cv_hujan": null,
    "stddev_air": null,
    "stddev_hujan": null,
    "status_air": null,
    "status_hujan": null
  }
}
```

---

## Key Integration Points

| Component | Protocol | Port | Format | Frequency |
|-----------|----------|------|--------|-----------|
| ESP32 → Vercel | HTTPS | 443 | JSON POST | Every 10s |
| Vercel ↔ Supabase | REST API | 443 | JSON | Real-time |
| Dashboard ← Vercel | HTTP/S | 80/443 | JSON GET | Every 3s |
| Dashboard ↔ ESP32 (local) | HTTP | 80 | JSON | Every 3s |

---

## Testing Endpoints

### Test 1: Send Dummy Data
```
GET https://fews-hs15.vercel.app/api/test-data
```
Sends test payload to `/api/data`, returns response

### Test 2: Get Latest Data
```
GET https://fews-hs15.vercel.app/api
```
Returns latest sensor reading from database

### Test 3: Manual POST (cURL)
```bash
curl -X POST https://fews-hs15.vercel.app/api/data \
  -H "Content-Type: application/json" \
  -H "x-api-key: fews2026" \
  -d '{"curah_hujan":5.2,"tinggi_air":120,"suhu":24.5,"kelembaban":65,"kecepatan_angin":3.2,"output":50.2,"korelasi_r":0.123,"sample_count":15,"uptime":"00:05:23"}'
```

---

## Files Modified/Created

✅ **Backend**
- `api/data.js` - Updated with better error handling
- `api/test-data.js` - NEW: Test endpoint

✅ **Documentation**
- `SETUP_GUIDE.md` - Complete setup instructions
- `SETUP_CHECKLIST.sh` - Interactive checklist
- `.env.example` - Environment variables template
- This file - Architecture overview

---

## Next Steps

1. ✅ **Upload program ESP32** ke board
2. ✅ **Monitor Serial** untuk debug
3. ✅ **Set Vercel .env**: `API_KEY=fews2026`
4. ✅ **Create Supabase table** dengan SQL
5. ✅ **Test endpoints** dengan cURL/Postman
6. ✅ **Refresh Dashboard** dan verify data

**Status**: Ready for production! 🚀
