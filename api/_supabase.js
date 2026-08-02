// ============================================================
// Helper Supabase - fetch wrapper untuk PostgREST
//
// PENTING: SUPABASE_URL di Environment Variables Vercel HARUS
// menyertakan suffix "/rest/v1", contoh:
//   https://xxxxxxxxxxxx.supabase.co/rest/v1
// (Bukan cuma "https://xxxxxxxxxxxx.supabase.co" saja, karena itu
// menyebabkan error PGRST204 / 404 - ini bug yang sama seperti
// versi sebelumnya.)
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

async function supabaseFetch(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_ANON_KEY belum diset di Environment Variables Vercel"
    );
  }

  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return null;
}

module.exports = { supabaseFetch };
