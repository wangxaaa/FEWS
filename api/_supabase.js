// api/_supabase.js
// Helper untuk Supabase REST API — tanpa library tambahan, pakai fetch biasa

const BASE_URL = process.env.SUPABASE_URL;
const KEY      = process.env.SUPABASE_ANON_KEY;

const headers = {
  'Content-Type': 'application/json',
  'apikey':       KEY,
  'Authorization': `Bearer ${KEY}`,
};

// ── SELECT ────────────────────────────────────────────────
// contoh: sbSelect('sensor_data', 'order=received_at.desc&limit=1')
export async function sbSelect(table, query = '') {
  const url = `${BASE_URL}/${table}${query ? '?' + query : ''}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Supabase SELECT error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── INSERT ────────────────────────────────────────────────
export async function sbInsert(table, row) {
  const res = await fetch(`${BASE_URL}/${table}`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase INSERT error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Pearson Correlation ───────────────────────────────────
export function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const ex = xs[i] - mx, ey = ys[i] - my;
    num += ex * ey; dx += ex * ex; dy += ey * ey;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : parseFloat((num / denom).toFixed(4));
}
