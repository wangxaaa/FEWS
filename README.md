# 🌊 FEWS — Vercel + Supabase

## Struktur File
```
fews-supabase/
├── api/
│   ├── _supabase.js   ← Helper Supabase (fetch wrapper + Pearson)
│   ├── index.js       ← GET  /api          (dashboard ambil data terbaru)
│   ├── data.js        ← POST /api/data     (ESP32 kirim data)
│   └── history.js     ← GET  /api/history  (50 data terakhir)
├── public/
│   └── index.html     ← Dashboard Web
├── vercel.json
├── package.json
├── supabase_schema.sql ← SQL untuk buat tabel di Supabase
├── fews_esp32.ino
└── .gitignore
```

---

## 🔁 Alur Sistem
```
Sensor → ESP32 → POST /api/data → Vercel Function → Supabase (PostgreSQL)
                                                           ↑
Dashboard Web ← GET /api ← Vercel Function ────────────────┘
```

---

## 🚀 Langkah 1 — Buat Project Supabase

1. Buka https://supabase.com → **Start your project** (gratis)
2. **New Project** → isi nama: `fews-db`, password database (catat!), region: **Southeast Asia (Singapore)**
3. Tunggu ~2 menit sampai project siap
4. Buka menu **SQL Editor** → klik **New query** → paste isi file `supabase_schema.sql` → klik **Run**
5. Tabel `sensor_data` akan terbuat
6. Buka **Project Settings → API**, salin dua nilai:
   ```
   Project URL  : https://xxxxxxxxxxxx.supabase.co
   anon public  : eyJhbGci...  (panjang, ini API key publik)
   ```

---

## 🚀 Langkah 2 — Upload ke GitHub

1. Buat repo baru di https://github.com/new → nama: `fews-vercel`
2. Upload semua file ini **kecuali** `fews_esp32.ino`:
   ```
   api/_supabase.js
   api/index.js
   api/data.js
   api/history.js
   public/index.html
   vercel.json
   package.json
   .gitignore
   ```

---

## 🚀 Langkah 3 — Deploy di Vercel

1. Buka https://vercel.com → Login dengan GitHub
2. **Add New → Project** → pilih repo `fews-vercel` → **Import**
3. Sebelum klik Deploy, buka bagian **Environment Variables** dan tambahkan:

   | Name | Value |
   |------|-------|
   | `SUPABASE_URL`      | `https://xxxxxxxxxxxx.supabase.co` |
   | `SUPABASE_ANON_KEY` | `eyJhbGci...` (anon public key) |
   | `API_KEY`           | buat sendiri, misal: `fews2026xyz` |

4. Klik **Deploy** → tunggu ~1 menit
5. Vercel beri URL: `https://fews-vercel.vercel.app`

---

## 🚀 Langkah 4 — Konfigurasi ESP32

Edit 4 baris pertama di `fews_esp32.ino`:

```cpp
const char* WIFI_SSID  = "NAMA_WIFI_KAMU";
const char* WIFI_PASS  = "PASSWORD_WIFI";
const char* SERVER_URL = "https://fews-vercel.vercel.app/api/data";
const char* API_KEY    = "fews2026xyz";  // ← HARUS SAMA dengan di Vercel
```

Upload ke ESP32, buka **Serial Monitor** (baud 115200):
```
✓ WiFi Connected: 192.168.x.x
Rain:12.5 mm | Water:95.3 cm | Temp:28.1°C | ... | Out:55.0%
✓ Data terkirim ke server
```

Buka dashboard di browser: `https://fews-vercel.vercel.app`

---

## 🔌 Wiring Sensor

| Sensor       | Pin ESP32 | Catatan              |
|--------------|-----------|----------------------|
| DHT22 DATA   | GPIO 4    | Suhu & Kelembaban    |
| HC-SR04 TRIG | GPIO 5    | Tinggi air (trigger) |
| HC-SR04 ECHO | GPIO 18   | Tinggi air (echo)    |
| Rain sensor  | GPIO 34   | Analog ADC1          |
| Anemometer   | GPIO 35   | Analog ADC1          |

Library Arduino (install via Library Manager):
- **ArduinoJson** by Benoit Blanchon (v6.x)
- **DHT sensor library** by Adafruit

---

## 📊 API Endpoints

| Method | Endpoint       | Header wajib  | Keterangan                    |
|--------|----------------|---------------|-------------------------------|
| GET    | `/`            | –             | Dashboard web                 |
| GET    | `/api`         | –             | Data sensor terbaru           |
| POST   | `/api/data`    | `x-api-key`   | ESP32 kirim data              |
| GET    | `/api/history` | –             | 50 data terakhir (JSON)       |

---

## ✅ Batas Gratis Supabase

| Item | Batas Gratis |
|------|-------------|
| Database | 500 MB |
| Row reads/bulan | 5 juta |
| Row inserts/bulan | 50 ribu |

Dengan kirim 1 data per 10 detik → **~8.640 insert/hari** → dalam sebulan ~260 ribu insert → **masih di bawah 50 ribu?**

⚠️ **Perhatian:** 50 ribu insert/bulan di tier gratis berarti ~1.6 insert/menit. Jika interval ESP32 10 detik (6/menit), dalam sebulan = **~259.200 insert** → melebihi batas gratis.

**Solusi:** Naikkan interval ESP32 ke **60 detik** (1 insert/menit → ~43.200/bulan ✓ aman) atau gunakan paket Supabase Pro ($25/bln) untuk data lebih sering.

---

## 🔧 Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Dashboard "Belum ada data" | Cek ESP32 menyala & WiFi konek. Lihat Serial Monitor |
| HTTP 401 dari ESP32 | API_KEY ESP32 ≠ environment variable Vercel |
| HTTP 500 | Cek SUPABASE_URL & SUPABASE_ANON_KEY sudah benar |
| Tabel tidak ditemukan | Jalankan `supabase_schema.sql` di Supabase SQL Editor |
| Data age merah di dashboard | ESP32 tidak mengirim — cek koneksi internet ESP32 |
