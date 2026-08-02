// ============ FEWS Dashboard - Vercel + Supabase Realtime ============
// Menggantikan versi MQTT: data masuk lewat Supabase Realtime
// (postgres_changes pada tabel sensor_data), gate control lewat
// REST API Vercel (/api/gate).

// >>> ISI SESUAI PROJECT SUPABASE KAMU <<<
const SUPABASE_URL = "https://xxxxxxxxxxxx.supabase.co"; // tanpa /rest/v1 di sisi client
const SUPABASE_ANON_KEY = "eyJhbGci..."; // anon public key (aman ditaruh di client)

const API_BASE = ""; // kosongkan jika client.js satu domain dengan Vercel API (default)
const MAX_HIST = 50;

let messageCount = 0;
let csvRows = [];
let csvCountdown = 10;
let histTime = [], histRain = [], histWater = [], histOut = [], histTemp = [], histHumidity = [], histWind = [];
let lastData = null;
let espLastData = null;
let dbLastCheck = null;

let lastRainValue = null;
let lastRainIncreaseTs = null;

const ESP_STALE_THRESHOLD = 30000;
const DB_STALE_THRESHOLD = 30000;

let espStatus = 'offline';
let dbStatus = 'offline';

let gateStatus = 'closed';
let gateMode = 'automatic';
let gateOverride = false;
let gatePosition = 0;
let currentFuzzyOutput = 0;

const CSV_KEY = 'fews_csv_log';
const THEME_KEY = 'fews_theme_mode';

const connDot = document.getElementById("connDot");
const connText = document.getElementById("connText");

// ============ Supabase client & Realtime ============
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const channel = supabase
  .channel("sensor_data_changes")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "sensor_data" },
    (payload) => {
      dbLastCheck = Date.now();
      updateDBStatus();
      handleIncomingRow(payload.new);
    }
  )
  .subscribe((status) => {
    if (status === "SUBSCRIBED") {
      connDot.classList.add("live");
      connText.textContent = "Terhubung (Realtime)";
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      connDot.classList.remove("live");
      connText.textContent = "Gagal terhubung ke Supabase";
    } else if (status === "CLOSED") {
      connDot.classList.remove("live");
      connText.textContent = "Terputus dari Supabase";
    }
  });

function handleIncomingRow(row) {
  const norm = normalizeRow(row);
  updateDashboard(norm);
  messageCount++;
  document.getElementById("metaCount").textContent = messageCount;
  document.getElementById("metaTime").textContent = new Date().toLocaleTimeString("id-ID");

  espLastData = Date.now();
  updateESPStatus();
  lastData = norm;

  const rainVal = Number(norm.curah_hujan);
  if (!Number.isNaN(rainVal)) {
    if (lastRainValue === null || rainVal > lastRainValue) {
      lastRainIncreaseTs = Date.now();
    }
    lastRainValue = rainVal;
  }

  if (!gateOverride && norm.gate_position !== undefined && norm.gate_position !== null) {
    let currentGateStatus = 'closed';
    if (norm.gate_position >= 90) currentGateStatus = 'open';
    else if (norm.gate_position >= 40) currentGateStatus = 'half';
    updateGateStatus(currentGateStatus, norm.gate_position, (norm.gate_mode || 'AUTO').toLowerCase() === 'manual' ? 'manual' : 'automatic');
  }
}

// Ubah nama kolom Supabase (snake_case, sudah sesuai) jadi field yang dipakai UI,
// dan terapkan skala tampilan tinggi air (x10) seperti versi MQTT sebelumnya.
function normalizeRow(row) {
  const dst = Object.assign({}, row);
  dst.output = row.fuzzy_output;
  dst.status = row.status_fuzzy || "AMAN";
  dst.status_dt = row.status_decision_tree || "AMAN";
  if (dst.tinggi_air != null) {
    dst.tinggi_air = dst.tinggi_air * 10;
  }
  return dst;
}

// ============ Load awal: data terakhir + histori grafik ============
async function loadInitialData() {
  try {
    const [latestRes, histRes] = await Promise.all([
      fetch(`${API_BASE}/api/latest`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/history?limit=${MAX_HIST}`).then(r => r.json()).catch(() => []),
    ]);

    if (Array.isArray(histRes) && histRes.length) {
      histRes.forEach((row) => {
        const norm = normalizeRow(row);
        const t = new Date(row.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        pushHistory(t, norm);
      });
      redrawCharts();
    }

    if (latestRes) {
      dbLastCheck = Date.now();
      updateDBStatus();
      const norm = normalizeRow(latestRes);
      updateDashboard(norm);
      lastData = norm;
      espLastData = Date.now();
      updateESPStatus();
    }
  } catch (e) {
    console.error("Gagal load data awal:", e);
  }
}

function firstNumericField(obj, keys) {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== "") {
      const n = Number(obj[k]);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  setTheme(saved);
}

function setTheme(mode) {
  if (mode === 'light') {
    document.body.classList.add('light-mode');
    localStorage.setItem(THEME_KEY, 'light');
    document.getElementById('btn_theme').textContent = '☀️';
  } else {
    document.body.classList.remove('light-mode');
    localStorage.setItem(THEME_KEY, 'dark');
    document.getElementById('btn_theme').textContent = '🌙';
  }
}

function toggleTheme() {
  const current = localStorage.getItem(THEME_KEY) || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
}

function updateESPStatus() {
  if (!espLastData) { setESPStatus('offline'); return; }
  const now = Date.now();
  const age = now - espLastData;
  if (age < ESP_STALE_THRESHOLD) setESPStatus('online', age);
  else setESPStatus('offline', age);
}

function setESPStatus(status, ageMs = 0) {
  if (espStatus === status && status !== 'online') return;
  espStatus = status;
  const dot = document.getElementById('esp_status_dot'), text = document.getElementById('esp_status_text'), seen = document.getElementById('esp_last_seen');
  let color = status === 'online' ? '#2dce74' : '#f25555';
  let label = status === 'online' ? '✓ ESP32: Online' : '✗ ESP32: Offline';
  dot.style.setProperty('--esp-color', color); text.innerText = label;
  if (ageMs > 0) seen.innerText = `(${Math.floor(ageMs / 1000)}s ago)`;
}

function updateDBStatus() {
  if (!dbLastCheck) { setDBStatus('offline'); return; }
  const now = Date.now();
  const age = now - dbLastCheck;
  if (age < DB_STALE_THRESHOLD) setDBStatus('online', age);
  else setDBStatus('offline', age);
}

function setDBStatus(status, ageMs = 0) {
  if (dbStatus === status && status !== 'online') return;
  dbStatus = status;
  const dot = document.getElementById('db_status_dot'), text = document.getElementById('db_status_text'), seen = document.getElementById('db_last_seen');
  let color = status === 'online' ? '#2dce74' : '#f25555';
  let label = status === 'online' ? '✓ Database: Online' : '✗ Database: Offline';
  dot.style.setProperty('--db-color', color); text.innerText = label;
  if (ageMs > 0) seen.innerText = `(${Math.floor(ageMs / 1000)}s ago)`;
}

Chart.defaults.color = '#4a6080';
Chart.defaults.font.family = "'Geist Mono', monospace";
Chart.defaults.font.size = 10;

const createChart = (ctx, label, color, bg) => new Chart(document.getElementById(ctx).getContext('2d'), {
  type: 'line',
  data: { labels: [], datasets: [{ label, data: [], borderColor: color, backgroundColor: bg, borderWidth: 2, tension: .3, fill: true, pointRadius: 0 }] },
  options: { responsive: true, animation: false, plugins: { legend: { labels: { color: '#6b83a0', boxWidth: 10 } } }, scales: { x: { ticks: { color: '#3d5270', maxTicksLimit: 6 }, grid: { color: '#111c30' } }, y: { ticks: { color: '#3d5270' }, grid: { color: '#111c30' } } } }
});

const chartRain = createChart('chartRain', 'Curah Hujan (mm)', '#4f8ef7', 'rgba(79,142,247,.1)');
const chartWater = createChart('chartWater', 'Tinggi Air (Visual)', '#2dce74', 'rgba(45,206,116,.1)');
const chartTemp = createChart('chartTemp', 'Suhu (°C)', '#ff6b6b', 'rgba(255,107,107,.1)');
const chartHumidity = createChart('chartHumidity', 'Kelembaban (%)', '#845ef7', 'rgba(132,94,247,.1)');
const chartWind = createChart('chartWind', 'Kecepatan Angin (m/s)', '#ffd43b', 'rgba(255,212,59,.1)');

function pushHistory(t, data) {
  [histTime, histRain, histWater, histOut, histTemp, histHumidity, histWind].forEach((a, i) => {
    const val = [t, data.curah_hujan, data.tinggi_air, data.output, data.suhu, data.kelembaban, data.kecepatan_angin][i];
    a.push(val); if (a.length > MAX_HIST) a.shift();
  });
}

function redrawCharts() {
  chartRain.data.labels = [...histTime]; chartRain.data.datasets[0].data = [...histRain]; chartRain.update('none');
  chartWater.data.labels = [...histTime]; chartWater.data.datasets[0].data = [...histWater]; chartWater.update('none');
  chartTemp.data.labels = [...histTime]; chartTemp.data.datasets[0].data = [...histTemp]; chartTemp.update('none');
  chartHumidity.data.labels = [...histTime]; chartHumidity.data.datasets[0].data = [...histHumidity]; chartHumidity.update('none');
  chartWind.data.labels = [...histTime]; chartWind.data.datasets[0].data = [...histWind]; chartWind.update('none');
}

function updateDashboard(data) {
  document.getElementById("valAir").innerHTML = fmt(data.tinggi_air) + '<span class="sensor-unit"></span>';
  document.getElementById("valHujan").innerHTML = fmt(data.curah_hujan) + '<span class="sensor-unit">mm</span>';
  document.getElementById("valSuhu").innerHTML = fmt(data.suhu) + '<span class="sensor-unit">°C</span>';
  document.getElementById("valLembab").innerHTML = fmt(data.kelembaban) + '<span class="sensor-unit">%</span>';
  document.getElementById("valAngin").innerHTML = fmt(data.kecepatan_angin) + '<span class="sensor-unit">m/s</span>';

  document.getElementById("fuzzyOut").textContent = fmt(data.output);
  currentFuzzyOutput = data.output;

  const pct = Math.max(0, Math.min(100, (data.tinggi_air / 300) * 100));
  document.getElementById("gaugeFill").style.height = pct + "%";

  const hero = document.getElementById("statusHero");
  const statusEl = document.getElementById("statusValue");
  const gaugeFill = document.getElementById("gaugeFill");

  const label = data.status ? data.status.toUpperCase() : "AMAN";
  let color;

  if (label === "BAHAYA") {
    color = "var(--bahaya)";
  } else if (label === "WASPADA") {
    color = "var(--siaga)";
  } else {
    color = "var(--aman)";
  }

  statusEl.textContent = label;
  statusEl.style.setProperty("--status-color", color);
  hero.style.setProperty("--status-glow", color);
  gaugeFill.style.background = `linear-gradient(180deg, ${color}, var(--water))`;

  const t = formatTime();
  pushHistory(t, data);
  redrawCharts();
}

function fmt(v) { return v != null ? Number(v).toFixed(1) : "–"; }
function formatTime() { return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

function updateGateStatus(status, position = 0, mode = 'automatic') {
  gateStatus = status; gatePosition = position; gateMode = mode;
  const gateDot = document.getElementById('gateDot'), gateStatusEl = document.getElementById('gateStatus');
  const gatePositionEl = document.getElementById('gatePosition'), gateModeEl = document.getElementById('gateMode');

  if (status === 'open' || status === 'half') {
    gateDot.classList.add('open');
    gateStatusEl.textContent = status === 'open' ? 'TERBUKA' : 'SETENGAH';
  } else {
    gateDot.classList.remove('open');
    gateStatusEl.textContent = 'TERTUTUP';
  }
  gatePositionEl.textContent = Math.round(position) + '%';
  gateModeEl.textContent = mode === 'automatic' ? 'Otomatis' : 'Manual';
  gateModeEl.style.color = mode === 'automatic' ? 'var(--aman)' : 'var(--siaga)';

  document.getElementById('btnOpen').disabled = !gateOverride;
  document.getElementById('btnHalf').disabled = !gateOverride;
  document.getElementById('btnClose').disabled = !gateOverride;
}

async function setGateManual(action) {
  if (!gateOverride) { alert('Override harus diaktifkan terlebih dahulu'); return; }
  let newPosition = 0; let newStatus = 'closed';
  if (action === 'open') { newPosition = 100; newStatus = 'open'; }
  else if (action === 'half') { newPosition = 50; newStatus = 'half'; }

  try {
    await fetch(`${API_BASE}/api/gate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'MANUAL', position: newPosition }),
    });
  } catch (e) { console.error('Gagal kirim perintah gate:', e); }

  updateGateStatus(newStatus, newPosition, 'manual');
  const buttonId = action === 'open' ? 'btnOpen' : action === 'half' ? 'btnHalf' : 'btnClose';
  const button = document.getElementById(buttonId);
  button.style.opacity = '0.7'; setTimeout(() => { button.style.opacity = '1'; }, 200);
}

async function toggleOverride(enabled) {
  gateOverride = enabled;
  const overrideLabel = document.getElementById('overrideLabel'), overrideInfo = document.getElementById('overrideInfo');

  if (enabled) {
    overrideLabel.textContent = 'Override ON'; overrideLabel.style.color = 'var(--aman)'; overrideInfo.style.color = 'var(--aman)';
    overrideInfo.textContent = '✓ Mode manual aktif - Anda dapat mengontrol pintu air';
    document.getElementById('btnOpen').disabled = false; document.getElementById('btnHalf').disabled = false; document.getElementById('btnClose').disabled = false;
  } else {
    overrideLabel.textContent = 'Override OFF'; overrideLabel.style.color = 'var(--text)'; overrideInfo.style.color = 'var(--text-dim)';
    overrideInfo.textContent = 'Saat diaktifkan, pintu air dapat dikontrol secara manual';
    document.getElementById('btnOpen').disabled = true; document.getElementById('btnHalf').disabled = true; document.getElementById('btnClose').disabled = true;
    try {
      await fetch(`${API_BASE}/api/gate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'AUTO' }),
      });
    } catch (e) { console.error('Gagal kembali ke AUTO:', e); }
  }
}

try { const saved = localStorage.getItem(CSV_KEY); if (saved) { csvRows = JSON.parse(saved); updateCsvUI(); } } catch (e) { csvRows = []; }

async function appendCsvRow(d) {
  const ts = new Date().toLocaleString('id-ID', { hour12: false });
  const row = { timestamp: ts, curah_hujan: d.curah_hujan, tinggi_air: d.tinggi_air, suhu: d.suhu, kelembaban: d.kelembaban, kecepatan_angin: d.kecepatan_angin, output: d.output, status: d.status || "AMAN", status_dt: d.status_dt || "AMAN" };
  csvRows.push(row);
  try { localStorage.setItem(CSV_KEY, JSON.stringify(csvRows)); } catch (e) { }
  updateCsvUI();
  const dot = document.getElementById('csv_dot'); dot.style.opacity = '0.5'; setTimeout(() => dot.style.opacity = '1', 100);
}

function updateCsvUI() {
  document.getElementById('csv_count').innerText = csvRows.length;
  document.getElementById('btn_download').disabled = csvRows.length === 0;
}

function downloadCSV() {
  if (!csvRows.length) return;
  const header = 'Timestamp,Curah_Hujan_mm,Tinggi_Air_x10,Suhu_C,Kelembaban_%,Kec_Angin_ms,Output_%,Status_Fuzzy,Status_DecisionTree\n';
  const data = csvRows.map(r => [`"${r.timestamp}"`, r.curah_hujan.toFixed(2), r.tinggi_air.toFixed(2), r.suhu.toFixed(2), r.kelembaban.toFixed(2), r.kecepatan_angin.toFixed(2), r.output.toFixed(2), r.status, r.status_dt].join(',')).join('\n');
  const blob = new Blob([header + data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `fews_log_${new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '')}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function clearCSV() {
  if (!csvRows.length) return;
  if (!confirm(`Hapus ${csvRows.length} baris log CSV?`)) return;
  csvRows = [];
  try { localStorage.removeItem(CSV_KEY); } catch (e) { }
  updateCsvUI();
}

setInterval(() => {
  csvCountdown--; document.getElementById('csv_countdown').innerText = csvCountdown;
  if (csvCountdown <= 0) { csvCountdown = 10; if (lastData) appendCsvRow(lastData); }
}, 1000);

setInterval(() => {
  try {
    if (lastRainIncreaseTs && (Date.now() - lastRainIncreaseTs) >= 60000) {
      if (lastData && Number(lastData.curah_hujan) !== 0) {
        lastData.curah_hujan = 0; lastRainValue = 0; lastRainIncreaseTs = null;
        updateDashboard(Object.assign({}, lastData));
      }
    }
  } catch (e) { }
}, 1000);

setInterval(updateESPStatus, 2000);
setInterval(updateDBStatus, 2000);
initTheme();
updateCsvUI();
loadInitialData();
