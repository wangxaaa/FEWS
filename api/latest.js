// ============================================================
// GET /api/latest -> 1 baris data sensor terbaru
// ============================================================

const { supabaseFetch } = require("./_supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ status: "error", message: "Method not allowed" });
    return;
  }
  try {
    const rows = await supabaseFetch(
      "/sensor_data?select=*&order=created_at.desc&limit=1"
    );
    res.status(200).json((rows && rows[0]) || null);
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
