# 🌊 FEWS - Setup & Integration Guide

## Ringkas: Program ESP32 Anda + Website Dashboard

Program ESP32 Anda menggunakan **2 mode komunikasi**:

### Mode 1: Lokal (Local AP)
- ESP32 membuat WiFi hotspot: `FEWS_Flood_System`
- Dashboard bisa akses data real-time dari IP ESP32 lokal
- **Path**: `http://192.168.137.104/api` (atau IP yang ditampilkan)

### Mode 2: Cloud (Vercel + Supabase)
- ESP32 kirim data via HTTPS POST ke: `https://fews-hs15.vercel.app/api/data`
- Backend Vercel simpan ke Supabase database
- Dashboard fetch dari: `https://fews-hs15.vercel.app/api`

---

## ⚙️ Setup Backend Vercel

### Langkah 1: Set API Key
Pastikan di Vercel environment variable ada:
```
API_KEY=fews2026
```

**Program ESP32 Anda sudah pake:** `const char* API_KEY = "fews2026";`

✅ **Cocok!** Tidak perlu diubah.

### Langkah 2: Setup Supabase Database

Run SQL query ini di Supabase:

```sql
CREATE TABLE IF NOT EXISTS sensor_data (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  server_time TEXT,
  
  -- Sensor Data
  curah_hujan NUMERIC,
  tinggi_air NUMERIC,
  suhu NUMERIC,
  kelembaban NUMERIC,
  kecepatan_angin NUMERIC,
  output NUMERIC,
  korelasi_r NUMERIC,
  sample_count INTEGER,
  uptime TEXT,
  
  -- Testing Parameters (optional)
  akurasi_persen NUMERIC,
  akurasi_total INTEGER,
  akurasi_benar INTEGER,
  akurasi_pred_cat TEXT,
  akurasi_aktual_cat TEXT,
  
  resp_last_ms INTEGER,
  resp_min_ms INTEGER,
  resp_max_ms INTEGER,
  resp_avg_ms NUMERIC,
  
  stab_cv_air NUMERIC,
  stab_cv_hujan NUMERIC,
  stab_stddev_air NUMERIC,
  stab_stddev_hujan NUMERIC,
  stab_status_air TEXT,
  stab_status_hujan TEXT
);

CREATE INDEX idx_received_at ON sensor_data(received_at DESC);
```

---

## 📝 Cara Kerja Program ESP32 Anda

### Setup Phase (Startup)
```
1. Serial begin (115200)
2. WiFi mode: AP + STA
   - AP: FEWS_Flood_System (192.168.4.1)
   - STA: Connect ke "unnesid"
3. Fuzzy Logic setup
4. TCP Server listening port 80
```

### Loop Phase (Main)
```
Every 10 seconds:
  1. Check WiFi connection
  2. Jika ada sensor data → processData()
     - Hitung Fuzzy Logic
     - Hitung Pearson Correlation
     - Kirim ke Cloud: sendToServer()
       └─ HTTP POST ke https://fews-hs15.vercel.app/api/data
          └─ Header: x-api-key: fews2026
          └─ Body: JSON {curah_hujan, tinggi_air, suhu, ...}
```

---

## 🔗 Endpoints

### Backend POST (Data Input dari ESP32)
```
POST https://fews-hs15.vercel.app/api/data

Headers:
  Content-Type: application/json
  x-api-key: fews2026

Body:
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

Response (200 OK):
{
  "ok": true,
  "received": "26/05/2026 14:30:45"
}
```

### Backend GET (Data Output ke Dashboard)
```
GET https://fews-hs15.vercel.app/api

Response (200 OK):
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
  "akurasi": { ... },
  "response_time": { ... },
  "stabilitas": { ... }
}
```

### ESP32 Lokal HTTP (Optional, untuk dashboard akses langsung)
```
GET http://192.168.137.104/api

Response:
{
  "curah_hujan": 5.2,
  "tinggi_air": 120,
  "suhu": 24.5,
  ...
}
```

---

## 🚀 Testing Data Flow

### Test 1: ESP32 → Cloud (Manual dengan cURL)
```bash
curl -X POST https://fews-hs15.vercel.app/api/data \
  -H "Content-Type: application/json" \
  -H "x-api-key: fews2026" \
  -d '{
    "curah_hujan": 5.2,
    "tinggi_air": 120,
    "suhu": 24.5,
    "kelembaban": 65,
    "kecepatan_angin": 3.2,
    "output": 50.2,
    "korelasi_r": 0.123,
    "sample_count": 15,
    "uptime": "00:05:23"
  }'
```

### Test 2: Verifikasi Data Tersimpan
```bash
curl https://fews-hs15.vercel.app/api
```

### Test 3: Dashboard Fetch Test
Buka browser → F12 (Developer Tools) → Console:
```javascript
fetch('https://fews-hs15.vercel.app/api')
  .then(r => r.json())
  .then(d => console.log(d))
```

---

## 🔧 Troubleshooting

### Problem 1: "Unauthorized — API key mismatch"
**Solusi:**
- ✅ Verifikasi `API_KEY=fews2026` di Vercel .env
- ✅ Program ESP32 kirim header: `x-api-key: fews2026`

### Problem 2: "Missing required field"
**Solusi:**
- ✅ Pastikan ESP32 mengirim semua field: curah_hujan, tinggi_air, suhu, kelembaban, kecepatan_angin, output
- ✅ Cek program `processData()` → `sendToServer()` function

### Problem 3: Data tidak muncul di dashboard
**Debug:**
1. Check Serial Monitor ESP32:
   ```
   [🌐 CLOUD SUCCESS] Berhasil masuk Vercel! HTTP 200
   ```
2. Verifikasi Supabase table `sensor_data` ada data
3. Test endpoint `/api` berhasil return data

### Problem 4: WiFi disconnect 10 detik
**Penyebab:** watchdog timeout
**Solusi:** Gunakan program `esp32_s3_fews_v3.ino` (yang sudah clean)

---

## 📊 Quick Reference

| Component | Status | Action |
|-----------|--------|--------|
| ESP32 Program | ✅ Ready | Upload ke board |
| Vercel Backend | ✅ Ready | Set `API_KEY=fews2026` |
| Supabase DB | ⚠️ Manual | Run SQL schema |
| Dashboard | ✅ Ready | Fetch dari `/api` |
| WiFi Config | ✅ OK | SSID: unnesid, Pass: 12345678 |
| Cloud Upload | ✅ OK | Auto setiap 10 detik |

---

## 📌 Next Steps

1. **Upload program ESP32** ke board
2. **Monitor Serial** untuk verifikasi boot
3. **Set Vercel .env**: `API_KEY=fews2026`
4. **Create Supabase table** dengan SQL di atas
5. **Test dashboard** - refresh dan lihat data muncul

**Contact**: Jika ada error, share output dari Serial Monitor! 🔍

