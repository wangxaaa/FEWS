// api/index.js
// GET /api  ←  Dashboard ambil data sensor terbaru

import { sbSelect } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Ambil 1 baris terbaru dari tabel sensor_data
    const rows = await sbSelect('sensor_data', 'order=received_at.desc&limit=1');

    if (!rows || rows.length === 0) {
      return res.status(503).json({
        error: 'Belum ada data. Pastikan ESP32 sudah menyala dan terhubung ke internet.'
      });
    }

    const d = rows[0];
    const ageSec = d.received_at
      ? Math.floor((Date.now() - new Date(d.received_at).getTime()) / 1000)
      : null;

    // Sesuaikan nama field dengan yang diharapkan dashboard
    return res.status(200).json({
      curah_hujan:    d.curah_hujan,
      tinggi_air:     d.tinggi_air,
      suhu:           d.suhu,
      kelembaban:     d.kelembaban,
      kecepatan_angin:d.kecepatan_angin,
      output:         d.output,
      korelasi_r:     d.korelasi_r,
      sample_count:   d.sample_count,
      uptime:         d.uptime,
      server_time:    d.server_time,
      received_at:    d.received_at,
      data_age_sec:   ageSec,
      
      // Parameter Pengujian Baru
      akurasi: {
        persen:              d.akurasi_persen,
        total_prediksi:      d.akurasi_total,
        benar:               d.akurasi_benar,
        kategori_prediksi:   d.akurasi_pred_cat,
        kategori_aktual:     d.akurasi_aktual_cat,
      },
      response_time: {
        last_ms:             d.resp_last_ms,
        min_ms:              d.resp_min_ms,
        max_ms:              d.resp_max_ms,
        avg_ms:              d.resp_avg_ms,
      },
      stabilitas: {
        cv_air:              d.stab_cv_air,
        cv_hujan:            d.stab_cv_hujan,
        stddev_air:          d.stab_stddev_air,
        stddev_hujan:        d.stab_stddev_hujan,
        status_air:          d.stab_status_air,
        status_hujan:        d.stab_status_hujan,
      },
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
