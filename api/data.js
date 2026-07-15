// api/data.js
// POST /api/data  ←  ESP32 kirim data sensor ke Vercel Cloud

import { sbSelect, sbInsert, pearson } from './_supabase.js';

const API_KEY = process.env.API_KEY || 'fews2026';  // Match dengan ESP32

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // ── Validasi API Key ─────────────────────────────────────
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const d = req.body;

  // ── Validasi field wajib ─────────────────────────────────
  const required = ['curah_hujan', 'tinggi_air', 'suhu', 'kelembaban', 'kecepatan_angin', 'output'];
  for (const f of required) {
    if (d[f] === undefined || d[f] === null) {
      return res.status(400).json({ error: `Missing field: ${f}` });
    }
  }

  try {
    const now = new Date();

    // ── Hitung Pearson di server jika tidak dikirim ESP32 ───
    let korStr   = d.korelasi_r;
    let sampleCt = d.sample_count || 1;

    if (korStr === undefined) {
      // Ambil 20 data terakhir untuk Pearson
      const hist = await sbSelect('sensor_data', 'select=curah_hujan,tinggi_air&order=received_at.desc&limit=20');
      const xs   = hist.map(h => h.curah_hujan).concat(d.curah_hujan);
      const ys   = hist.map(h => h.tinggi_air ).concat(d.tinggi_air);
      korStr   = pearson(xs, ys);
      sampleCt = xs.length;
    }

    // ── Simpan ke Supabase ───────────────────────────────────
    const row = {
      received_at:     now.toISOString(),
      server_time:     now.toLocaleString('id-ID', { hour12: false }),
      curah_hujan:     parseFloat(d.curah_hujan),
      tinggi_air:      parseFloat(d.tinggi_air),
      suhu:            parseFloat(d.suhu),
      kelembaban:      parseFloat(d.kelembaban),
      kecepatan_angin: parseFloat(d.kecepatan_angin),
      output:          parseFloat(d.output),
      korelasi_r:      parseFloat(korStr),
      sample_count:    parseInt(sampleCt),
      uptime:          d.uptime || '00:00:00'
    };

    await sbInsert('sensor_data', row);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
