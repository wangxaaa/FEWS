-- ============================================================
-- FEWS - Supabase Schema (migrasi dari MQTT ke Vercel+Supabase)
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Tabel utama: setiap baris = satu pembacaan sensor + hasil klasifikasi
create table if not exists sensor_data (
  id                     bigint generated always as identity primary key,
  created_at             timestamptz not null default now(),
  suhu                   numeric,
  kelembaban             numeric,
  curah_hujan            numeric,
  kecepatan_angin        numeric,
  tinggi_air             numeric,
  fuzzy_output           numeric,
  status_fuzzy           text,     -- AMAN / WASPADA / BAHAYA (hasil Fuzzy Logic)
  status_decision_tree   text,     -- AMAN / WASPADA / BAHAYA (hasil Decision Tree)
  gate_position          int,
  gate_mode              text,     -- AUTO / MANUAL
  device_timestamp       bigint    -- millis() dari ESP32, untuk debugging
);

create index if not exists idx_sensor_data_created_at
  on sensor_data (created_at desc);

-- Tabel status pintu air (menggantikan topic MQTT fews/.../gate/cmd)
-- Selalu 1 baris (id = 1) yang di-update terus oleh dashboard / ESP32
create table if not exists gate_state (
  id          int primary key default 1,
  mode        text not null default 'AUTO',   -- AUTO / MANUAL
  position    int  not null default 0,
  updated_at  timestamptz not null default now()
);

insert into gate_state (id, mode, position)
values (1, 'AUTO', 0)
on conflict (id) do nothing;

-- ============================================================
-- Row Level Security
-- Dibuka untuk anon key karena akses ditutup di level API Vercel
-- (x-api-key untuk endpoint ESP32, sedangkan endpoint dashboard read-only)
-- ============================================================
alter table sensor_data enable row level security;
alter table gate_state  enable row level security;

drop policy if exists "allow read sensor_data" on sensor_data;
create policy "allow read sensor_data" on sensor_data
  for select using (true);

drop policy if exists "allow insert sensor_data" on sensor_data;
create policy "allow insert sensor_data" on sensor_data
  for insert with check (true);

drop policy if exists "allow read gate_state" on gate_state;
create policy "allow read gate_state" on gate_state
  for select using (true);

drop policy if exists "allow update gate_state" on gate_state;
create policy "allow update gate_state" on gate_state
  for update using (true);

-- ============================================================
-- Aktifkan Realtime untuk dashboard (postgres_changes)
-- ============================================================
alter publication supabase_realtime add table sensor_data;
alter publication supabase_realtime add table gate_state;
