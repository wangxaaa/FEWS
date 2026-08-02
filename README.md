# 🌊 FEWS — Migrasi MQTT → Vercel + Supabase

## Apa yang berubah

| Sebelum (MQTT) | Sesudah (Vercel + Supabase) |
|---|---|
| Node fuzzy publish ke HiveMQ broker | Node fuzzy `POST` ke `/api/data` di Vercel |
| Dashboard subscribe topic MQTT | Dashboard subscribe **Supabase Realtime** (`postgres_changes`) |
| Gate command via MQTT topic `gate/cmd` | Gate command via tabel `gate_state`, dibaca lewat response `/api/data` & `/api/gate` |
| Data tidak tersimpan permanen | Semua data mentah + hasil Fuzzy & Decision Tree tersimpan di tabel `sensor_data` |

**Node master pengirim (sensor) TIDAK BERUBAH** — dia tetap kirim data lokal ke node fuzzy lewat HTTP `192.168.4.1/data` seperti sebelumnya. Yang berubah hanya node fuzzy (`esp32_penerima_fuzzy_CLOUD.ino`).

---

## Langkah 1 — Cek/siapkan tabel di Supabase (project lama)

1. Buka project Supabase kamu yang lama → **SQL Editor** → **New query**
2. Paste isi `supabase_schema.sql` → **Run**
   - Ini akan membuat tabel `sensor_data` (jika belum ada) dan `gate_state`
   - Aman dijalankan ulang — pakai `if not exists` dan `on conflict do nothing`
3. Buka **Project Settings → API**, catat dua nilai:
   - `Project URL` → contoh `https://xxxxxxxxxxxx.supabase.co`
   - `anon public` key

⚠️ **Penting soal PGRST204** (error yang pernah kamu alami dulu): untuk **server-side** (Vercel API), `SUPABASE_URL` di environment variable **harus** ditambah suffix `/rest/v1`:
```
https://xxxxxxxxxxxx.supabase.co/rest/v1
```
Untuk **client-side** (dashboard, di `public/client.js`), pakai URL project **tanpa** `/rest/v1`.

---

## Langkah 2 — Deploy ke Vercel

1. Push folder ini (`api/`, `public/`, `vercel.json`, `package.json`, `supabase_schema.sql`) ke repo GitHub kamu (`wangxaaa/FEWS` atau repo baru)
2. Di Vercel → **Add New → Project** → import repo tersebut
3. Sebelum Deploy, buka **Environment Variables**, tambahkan:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co/rest/v1` |
   | `SUPABASE_ANON_KEY` | `eyJhbGci...` (anon public key) |
   | `API_KEY` | bebas, contoh `fews2026xyz` — harus sama dengan yang ditulis di firmware |

4. **Deploy**. Vercel akan beri URL, misal `https://fews-vercel.vercel.app`

---

## Langkah 3 — Isi kredensial di dashboard

Edit `public/client.js`, baris paling atas:

```js
const SUPABASE_URL = "https://xxxxxxxxxxxx.supabase.co"; // TANPA /rest/v1
const SUPABASE_ANON_KEY = "eyJhbGci...";
```

Commit & push — Vercel auto-redeploy.

---

## Langkah 4 — Konfigurasi firmware ESP32 (hanya node fuzzy)

Edit `esp32/esp32_penerima_fuzzy_CLOUD.ino`:

```cpp
const char* CLOUD_DATA_URL = "https://fews-vercel.vercel.app/api/data";
const char* CLOUD_API_KEY  = "fews2026xyz";   // HARUS SAMA dengan API_KEY di Vercel
```

Library Arduino yang dibutuhkan (beberapa sudah kamu pakai sebelumnya, `PubSubClient` sudah **tidak dipakai lagi** dan boleh di-uninstall kalau mau):
- ArduinoJson
- Fuzzy (eFLL)
- ESP32Servo

Upload ke ESP32 node fuzzy. Node master pengirim (`esp32_master_pengirim.ino`) **upload ulang seperti biasa, tanpa perubahan apa pun**.

---

## Langkah 5 — Cek

1. Buka Serial Monitor node fuzzy (115200 baud) → pastikan tidak ada error HTTP saat `TaskCloudSync` jalan
2. Buka dashboard `https://fews-vercel.vercel.app`
3. Indikator "Terhubung (Realtime)" di kanan atas harus hijau
4. Data sensor & grafik harus update tiap ±2.5 detik
5. Coba override gate manual dari dashboard → cek node fuzzy merespons

---

## Endpoint API

| Method | Endpoint | Header wajib | Keterangan |
|---|---|---|---|
| POST | `/api/data` | `x-api-key` | ESP32 kirim data, balasan berisi status gate |
| GET | `/api/latest` | – | Data sensor terbaru (load awal dashboard) |
| GET | `/api/history?limit=50` | – | N data terakhir (isi grafik saat dashboard dibuka) |
| GET | `/api/gate` | – | Baca status gate saat ini |
| POST | `/api/gate` | – | Dashboard set override manual / kembali AUTO |

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Dashboard "Gagal terhubung ke Supabase" | Cek `SUPABASE_URL`/`SUPABASE_ANON_KEY` di `client.js` benar & tanpa `/rest/v1` |
| HTTP 401 dari ESP32 | `CLOUD_API_KEY` di firmware ≠ `API_KEY` di Vercel env |
| HTTP 500 di Vercel | Cek `SUPABASE_URL` (server) sudah pakai suffix `/rest/v1`, dan `SUPABASE_ANON_KEY` benar |
| Tabel tidak ditemukan | Jalankan ulang `supabase_schema.sql` |
| Grafik kosong saat dashboard dibuka | Cek endpoint `/api/history` mengembalikan data (buka langsung di browser) |
| Gate tidak merespons override | Cek tabel `gate_state` ter-update di Supabase Table Editor saat toggle override |
