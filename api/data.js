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
  if (!key) {
    return res.status(401).json({ 
      error: 'Missing x-api-key header',
      expected_key: 'fews2026' 
    });
  }
  
  if (key !== API_KEY) {
    return res.status(401).json({ 
      error: `Unauthorized — API key mismatch. Got: ${key}, Expected: ${API_KEY}` 
    });
  }

  const d = req.body;

  // ── Validasi field wajib ─────────────────────────────────
  const required = ['curah_hujan', 'tinggi_air', 'suhu', 'kelembaban', 'kecepatan_angin', 'output'];
  for (const f of required) {
    if (d[f] === undefined || d[f] === null) {
      return res.status(400).json({ 
        error: `Missing required field: '${f}'`,
        received: d 
      });
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
      uptime:          d.uptime || '00:00:00',
      
      // ── Parameter Pengujian Baru ───────────────────────
      // [1] Akurasi
      akurasi_persen:       d.akurasi ? parseFloat(d.akurasi.persen) : null,
      akurasi_total:        d.akurasi ? parseInt(d.akurasi.total_prediksi) : null,
      akurasi_benar:        d.akurasi ? parseInt(d.akurasi.benar) : null,
      akurasi_pred_cat:     d.akurasi ? d.akurasi.kategori_prediksi : null,
      akurasi_aktual_cat:   d.akurasi ? d.akurasi.kategori_aktual : null,
      
      // [2] Response Time
      resp_last_ms:         d.response_time ? parseInt(d.response_time.last_ms) : null,
      resp_min_ms:          d.response_time ? parseInt(d.response_time.min_ms) : null,
      resp_max_ms:          d.response_time ? parseInt(d.response_time.max_ms) : null,
      resp_avg_ms:          d.response_time ? parseFloat(d.response_time.avg_ms) : null,
      
      // [3] Stabilitas Data
      stab_cv_air:          d.stabilitas ? parseFloat(d.stabilitas.cv_air) : null,
      stab_cv_hujan:        d.stabilitas ? parseFloat(d.stabilitas.cv_hujan) : null,
      stab_stddev_air:      d.stabilitas ? parseFloat(d.stabilitas.stddev_air) : null,
      stab_stddev_hujan:    d.stabilitas ? parseFloat(d.stabilitas.stddev_hujan) : null,
      stab_status_air:      d.stabilitas ? d.stabilitas.status_air : null,
      stab_status_hujan:    d.stabilitas ? d.stabilitas.status_hujan : null,
    };

    await sbInsert('sensor_data', row);

    console.log(`[${row.server_time}] Air:${row.tinggi_air}cm Hujan:${row.curah_hujan}mm Output:${row.output}% | Akurasi:${row.akurasi_persen?.toFixed(1)}% | ResponseTime:${row.resp_last_ms}ms`);
    return res.status(200).json({ ok: true, received: row.server_time });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
