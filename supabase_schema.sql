-- ═══════════════════════════════════════════════════════════
--  FEWS — Supabase Table Schema
--  Jalankan SQL ini di Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════

CREATE TABLE sensor_data (
  id              BIGSERIAL PRIMARY KEY,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  server_time     TEXT,
  curah_hujan     FLOAT NOT NULL,
  tinggi_air      FLOAT NOT NULL,
  suhu            FLOAT NOT NULL,
  kelembaban      FLOAT NOT NULL,
  kecepatan_angin FLOAT NOT NULL,
  output          FLOAT NOT NULL,
  korelasi_r      FLOAT DEFAULT 0,
  sample_count    INT   DEFAULT 1,
  uptime          TEXT  DEFAULT '00:00:00'
);

-- Index supaya query "data terbaru" sangat cepat
CREATE INDEX idx_sensor_received ON sensor_data (received_at DESC);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;

-- Policy: siapa saja boleh SELECT (baca) data — untuk dashboard publik
CREATE POLICY "allow_public_read"
  ON sensor_data FOR SELECT
  USING (true);

-- Policy: INSERT hanya dari server (API key divalidasi di Vercel, bukan di Supabase)
-- Karena kita pakai anon key di serverless function, izinkan INSERT dari anon
CREATE POLICY "allow_anon_insert"
  ON sensor_data FOR INSERT
  WITH CHECK (true);

-- (Opsional) Hapus otomatis data lebih dari 30 hari agar tidak penuh storage gratis
-- Jalankan di cron job atau Supabase Edge Function jika diperlukan:
-- DELETE FROM sensor_data WHERE received_at < NOW() - INTERVAL '30 days';

-- ═══════════════════════════════════════════════════════════
--  CSV Logger Table — Menyimpan log dari Dashboard
-- ═══════════════════════════════════════════════════════════

CREATE TABLE csv_logs (
  id              BIGSERIAL PRIMARY KEY,
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timestamp       TEXT NOT NULL,
  curah_hujan     FLOAT NOT NULL,
  tinggi_air      FLOAT NOT NULL,
  suhu            FLOAT NOT NULL,
  kelembaban      FLOAT NOT NULL,
  kecepatan_angin FLOAT NOT NULL,
  output          FLOAT NOT NULL,
  korelasi_r      FLOAT NOT NULL,
  status          TEXT NOT NULL
);

-- Index untuk query cepat berdasarkan waktu log
CREATE INDEX idx_csv_logs_logged ON csv_logs (logged_at DESC);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE csv_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Dashboard (anon key) bisa SELECT (untuk download/export)
CREATE POLICY "allow_public_read_logs"
  ON csv_logs FOR SELECT
  USING (true);

-- Policy: INSERT dari dashboard
CREATE POLICY "allow_anon_insert_logs"
  ON csv_logs FOR INSERT
  WITH CHECK (true);

