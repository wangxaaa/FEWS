// api/log.js
// POST /api/log  ←  Dashboard kirim CSV log ke Supabase

import { sbInsert } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const log = req.body;

    // ── Validasi field wajib ─────────────────────────────
    const required = ['timestamp', 'curah_hujan', 'tinggi_air', 'suhu', 'kelembaban', 'kecepatan_angin', 'output', 'korelasi_r', 'status'];
    for (const f of required) {
      if (log[f] === undefined) {
        return res.status(400).json({ error: `Field '${f}' wajib ada` });
      }
    }

    // ── Simpan ke Supabase (tabel: csv_logs) ──────────────
    const row = {
      logged_at:       new Date().toISOString(),
      timestamp:       log.timestamp,
      curah_hujan:     parseFloat(log.curah_hujan),
      tinggi_air:      parseFloat(log.tinggi_air),
      suhu:            parseFloat(log.suhu),
      kelembaban:      parseFloat(log.kelembaban),
      kecepatan_angin: parseFloat(log.kecepatan_angin),
      output:          parseFloat(log.output),
      korelasi_r:      parseFloat(log.korelasi_r),
      status:          log.status,
    };

    await sbInsert('csv_logs', row);

    console.log(`[${row.timestamp}] CSV Log saved - Air:${row.tinggi_air}cm Hujan:${row.curah_hujan}mm`);
    return res.status(200).json({ ok: true, logged_at: row.logged_at });

  } catch (err) {
    console.error('Log error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
