# FEWS — Frontend/Backend Separation Guide

## Struktur Proyek

```
fews-supabase/
├── public/
│   ├── index.html       ← HTML Structure (clean, no inline CSS/JS)
│   ├── style.css        ← All CSS styling
│   ├── client.js        ← Frontend logic (Dashboard interaction)
│   └── ...
├── api/
│   ├── index.js         ← GET /api — fetch latest sensor data
│   ├── data.js          ← POST /api/data — receive sensor data from ESP32
│   ├── log.js           ← POST /api/log — save CSV log to Supabase ✨ NEW
│   └── _supabase.js     ← Supabase helper functions
├── supabaseConfig.js    ← Supabase credentials
├── .env.local           ← Environment variables
└── supabase_schema.sql  ← Database schema
```

## Pemisahan Frontend & Backend

### **Frontend** (`public/client.js`)
- ✅ Fetch data dari `/api` setiap 3 detik
- ✅ Update dashboard UI secara real-time
- ✅ Tampilkan chart histori 50 data terakhir
- ✅ **NEW**: Kirim CSV log ke `/api/log` setiap 10 detik
- ✅ Local storage sebagai backup cache

### **Backend** (`api/`)
- ✅ `GET /api` — return data sensor terbaru
- ✅ `POST /api/data` — terima data dari ESP32 setiap 10 detik
- ✅ **NEW** `POST /api/log` — simpan CSV log ke Supabase (`csv_logs` table)
- ✅ Hitung Pearson correlation di server
- ✅ Simpan ke Supabase otomatis

## Setup Supabase

### 1. Buat Tabel di Supabase
Buka **Supabase Dashboard → SQL Editor** dan jalankan:

```sql
-- Jalankan semua perintah dari file ini:
-- supabase_schema.sql
```

### 2. Sesuaikan Environment Variables

File `.env.local`:
```env
SUPABASE_URL=https://qegrytzjnqlngeqhjhhi.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZ3J5dHpqbnFsbmdlcWhqaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTM3OTMsImV4cCI6MjA5Mjc4OTc5M30.wgeB1t6QQVt66XdMfMdsgbJRjZ37TkOyMcLslUI1Ngw
```

## API Endpoints

### **GET /api** — Get Latest Sensor Data
```javascript
// Frontend request
const data = await fetch('/api').then(r => r.json());

// Response:
{
  curah_hujan: 5.2,
  tinggi_air: 95.4,
  suhu: 28.5,
  kelembaban: 75,
  kecepatan_angin: 2.1,
  output: 35.8,        // Flood risk %
  korelasi_r: 0.68,    // Pearson correlation
  sample_count: 12,
  uptime: "12:34:56",
  data_age_sec: 5
}
```

### **POST /api/log** — Save CSV Log to Database
```javascript
// Frontend request (automatic setiap 10 detik)
const log = {
  timestamp: "27/04/2026 10:30:45",
  curah_hujan: 5.2,
  tinggi_air: 95.4,
  suhu: 28.5,
  kelembaban: 75,
  kecepatan_angin: 2.1,
  output: 35.8,
  korelasi_r: 0.68,
  status: "AMAN"
};

await fetch('/api/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(log)
});
```

### **POST /api/data** — Receive Data from ESP32
```javascript
// ESP32 request (dari firmware)
const data = {
  curah_hujan: 5.2,
  tinggi_air: 95.4,
  suhu: 28.5,
  kelembaban: 75,
  kecepatan_angin: 2.1,
  output: 35.8,
  uptime: "12:34:56"
};

fetch('https://your-server.com/api/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'fews-secret-key'
  },
  body: JSON.stringify(data)
});
```

## Data Flow

```
┌─────────────┐
│   ESP32     │
│  Sensor     │
└──────┬──────┘
       │ POST /api/data (10s)
       ▼
┌─────────────────────────────────────────┐
│     BACKEND (api/*.js)                  │
│  • Validasi data                        │
│  • Hitung Pearson correlation           │
│  • Simpan ke sensor_data table          │
└──────┬──────────────────────────────────┘
       │
       ├─ GET /api ◄─── FRONTEND (Dashboard)
       │                    │
       │ Latest data        │ Fetch every 3s
       │                    │
       │                    ├─ Update UI
       │                    ├─ Show chart (50 samples)
       │                    └─ Log CSV every 10s
       │                         │
       └─────────────────────────┼─ POST /api/log
                                 ▼
                    ┌──────────────────────┐
                    │  SUPABASE DATABASE   │
                    │                      │
                    │ • sensor_data        │
                    │ • csv_logs ✨ NEW    │
                    └──────────────────────┘
```

## CSV Logger Flow

### Local → Database Pipeline

1. **Dashboard mengumpulkan data** (setiap 3s dari `/api`)
2. **Countdown 10 detik** untuk CSV logging
3. **POST /api/log** → Backend menerima + validasi
4. **Backend INSERT** ke Supabase `csv_logs` table
5. **Cache di localStorage** sebagai backup
6. **Download CSV** dari cached rows (browser-side)

### Backup & Recovery
- Jika `/api/log` gagal: data tetap di localStorage
- Saat koneksi kembali: retry otomatis
- Bisa manual download CSV dari cache kapan saja

## Files Description

| File | Purpose |
|------|---------|
| `index.html` | Clean HTML structure, imports CSS + JS |
| `style.css` | All visual styling |
| `client.js` | Frontend logic, API calls, UI updates |
| `api/index.js` | GET /api endpoint |
| `api/data.js` | POST /api/data (ESP32 upload) |
| `api/log.js` | **NEW** POST /api/log (CSV to DB) |
| `api/_supabase.js` | Supabase REST API helper |
| `.env.local` | Environment secrets |
| `supabaseConfig.js` | Configuration object |
| `supabase_schema.sql` | Database schema (run in Supabase) |

## Development

### Run Locally
```bash
npm install
npm run dev
# Opens http://localhost:3000
```

### Deploy to Vercel
```bash
vercel deploy
```

### Monitor Database
Visit **Supabase Dashboard → Inspect** to see:
- `sensor_data` — all readings from ESP32
- `csv_logs` — all dashboard logs (NEW)

## Troubleshooting

### CSV not saving to database?
1. Check `/api/log.js` is created
2. Verify `csv_logs` table exists in Supabase
3. Check browser console for error messages
4. Verify `.env.local` has correct Supabase credentials

### Data not appearing in dashboard?
1. Check ESP32 is sending to `/api/data`
2. Check `/api/index.js` returns correct data
3. Check browser network tab in DevTools
4. Verify CORS is enabled in backend

## Next Steps

1. ✅ Created: `/public/style.css` (CSS)
2. ✅ Created: `/public/client.js` (Frontend)
3. ✅ Updated: `/public/index.html` (HTML)
4. ✅ Created: `/api/log.js` (CSV Logger API)
5. ✅ Updated: `supabase_schema.sql` (New table)
6. **TODO**: Run SQL schema in Supabase
7. **TODO**: Test CSV logging in dashboard
8. **TODO**: Deploy to Vercel

---

**Created**: April 27, 2026  
**System**: FEWS v2.0 - Flood Early Warning System  
**Architecture**: Frontend/Backend Separated
