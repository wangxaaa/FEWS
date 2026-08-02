// ============================================================
// POST /api/data
// Dipanggil oleh ESP32 (node fuzzy) setiap ~2.5 detik.
// - Menyimpan 1 baris data mentah + hasil klasifikasi ke Supabase
// - Membalas dengan status gate saat ini (menggantikan MQTT
//   topic gate/cmd yang dulu di-subscribe ESP32)
// ============================================================

const { supabaseFetch } = require("./_supabase");

const API_KEY = process.env.API_KEY;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ status: "error", message: "Method not allowed" });
    return;
  }

  const key = req.headers["x-api-key"];
  if (!API_KEY || key !== API_KEY) {
    res.status(401).json({ status: "error", message: "Unauthorized" });
    return;
  }

  const body = req.body || {};

  const row = {
    suhu: numOrNull(body.suhu),
    kelembaban: numOrNull(body.kelembaban),
    curah_hujan: numOrNull(body.curah_hujan),
    kecepatan_angin: numOrNull(body.kecepatan_angin),
    tinggi_air: numOrNull(body.tinggi_air),
    fuzzy_output: numOrNull(body.fuzzy_output),
    status_fuzzy: body.status_fuzzy ?? body.status ?? null,
    status_decision_tree: body.status_decision_tree ?? body.ground_truth ?? null,
    gate_position: intOrNull(body.gate_position),
    gate_mode: body.gate_mode ?? null,
    device_timestamp: intOrNull(body.timestamp),
  };

  try {
    // 1. Simpan data sensor
    await supabaseFetch("/sensor_data", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });

    // 2. Ambil status gate saat ini untuk dikirim balik ke ESP32
    const gateRows = await supabaseFetch(
      "/gate_state?id=eq.1&select=mode,position"
    );
    const gate = (gateRows && gateRows[0]) || { mode: "AUTO", position: 0 };

    res.status(200).json({
      status: "ok",
      gate_mode: gate.mode,
      gate_position: gate.position,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function intOrNull(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
