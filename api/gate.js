// ============================================================
// GET  /api/gate  -> baca status gate saat ini
// POST /api/gate  -> dashboard set override manual / kembali ke AUTO
// ============================================================

const { supabaseFetch } = require("./_supabase");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const rows = await supabaseFetch(
        "/gate_state?id=eq.1&select=mode,position,updated_at"
      );
      res.status(200).json((rows && rows[0]) || { mode: "AUTO", position: 0 });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const mode = (body.mode || "AUTO").toUpperCase() === "MANUAL" ? "MANUAL" : "AUTO";
    const position =
      mode === "MANUAL" ? Math.max(0, Math.min(100, parseInt(body.position, 10) || 0)) : 0;

    try {
      await supabaseFetch("/gate_state?id=eq.1", {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          mode,
          position,
          updated_at: new Date().toISOString(),
        }),
      });
      res.status(200).json({ status: "ok", mode, position });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
    return;
  }

  res.status(405).json({ status: "error", message: "Method not allowed" });
};
