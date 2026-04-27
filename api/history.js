// api/history.js
// GET /api/history  ←  Ambil 50 data terakhir (opsional, untuk keperluan lain)

import { sbSelect } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const rows  = await sbSelect(
      'sensor_data',
      `select=received_at,curah_hujan,tinggi_air,output,korelasi_r&order=received_at.desc&limit=${limit}`
    );
    // Kembalikan urutan chronological (oldest first)
    return res.status(200).json(rows.reverse());
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
