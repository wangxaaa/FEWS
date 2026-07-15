// public/client.js - Frontend FEWS Dashboard

let ESP_IP = window.location.origin;
const MAX_HIST = 50;
let histTime=[], histRain=[], histWater=[], histOut=[];

// ── Load ESP32 IP from localStorage ────────────────────────────
const ESP_IP_KEY = 'fews_esp_ip';

function loadESPIp() {
  const saved = localStorage.getItem(ESP_IP_KEY);
  if (saved) {
    ESP_IP = saved;
    document.getElementById('espIp').value = saved;
  }
}

// ── Theme Mode (Light/Dark) ────────────────────────────
const THEME_KEY = 'fews_theme_mode';

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

// ── ESP32 Status Tracking ───────────────────────────────
let espLastData = null;
let espStatus = 'offline'; // 'online' | 'offline' | 'stale'
const ESP_ONLINE_THRESHOLD = 10000; // 10 detik
const ESP_STALE_THRESHOLD  = 30000; // 30 detik

function updateESPStatus() {
  if (!espLastData) {
    setESPStatus('offline');
    return;
  }
  
  const now = Date.now();
  const age = now - espLastData;
  
  if (age < ESP_STALE_THRESHOLD) {
    setESPStatus('online', age);
  } else {
    setESPStatus('offline', age);
  }
}

function setESPStatus(status, ageMs = 0) {
  if (espStatus === status && status !== 'online') return; // no need to update
  espStatus = status;
  
  const dot   = document.getElementById('esp_status_dot');
  const text  = document.getElementById('esp_status_text');
  const seen  = document.getElementById('esp_last_seen');
  
  let color, anim, label;
  
  if (status === 'online') {
    color = '#2dce74';
    anim  = 'none';
    label = '✓ ESP32: Online';
  } else {
    color = '#f25555';
    anim  = 'none';
    label = '✗ ESP32: Offline';
  }
  
  dot.style.setProperty('--esp-color', color);
  dot.style.animation = anim;
  text.innerText = label;
  
  if (ageMs > 0) {
    const secs = Math.floor(ageMs / 1000);
    seen.innerText = `(${secs}s ago)`;
  }
}

// ── Database Status Tracking ────────────────────────────
let dbLastCheck = null;
let dbStatus = 'offline'; // 'online' | 'offline' | 'stale'
const DB_ONLINE_THRESHOLD = 10000; // 10 detik
const DB_STALE_THRESHOLD  = 30000; // 30 detik

function updateDBStatus() {
  if (!dbLastCheck) {
    setDBStatus('offline');
    return;
  }
  
  const now = Date.now();
  const age = now - dbLastCheck;
  
  if (age < DB_STALE_THRESHOLD) {
    setDBStatus('online', age);
  } else {
    setDBStatus('offline', age);
  }
}

function setDBStatus(status, ageMs = 0) {
  if (dbStatus === status && status !== 'online') return; // no need to update
  dbStatus = status;
  
  const dot   = document.getElementById('db_status_dot');
  const text  = document.getElementById('db_status_text');
  const seen  = document.getElementById('db_last_seen');
  
  let color, anim, label;
  
  if (status === 'online') {
    color = '#2dce74';
    anim  = 'none';
    label = '✓ Database: Online';
  } else {
    color = '#f25555';
    anim  = 'none';
    label = '✗ Database: Offline';
  }
  
  dot.style.setProperty('--db-color', color);
  dot.style.animation = anim;
  text.innerText = label;
  
  if (ageMs > 0) {
    const secs = Math.floor(ageMs / 1000);
    seen.innerText = `(${secs}s ago)`;
  }
}

// ── Chart ──────────────────────────────────────────────────
Chart.defaults.color = '#4a6080';
Chart.defaults.font.family = "'DM Mono', monospace";
Chart.defaults.font.size   = 10;

const chart = new Chart(document.getElementById('chart').getContext('2d'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label:'Curah Hujan (mm)', data:[], borderColor:'#4f8ef7', backgroundColor:'rgba(79,142,247,.07)', borderWidth:2, tension:.3, fill:true, pointRadius:0 },
      { label:'Tinggi Air (cm)',  data:[], borderColor:'#2dce74', backgroundColor:'rgba(45,206,116,.07)', borderWidth:2, tension:.3, fill:true, pointRadius:0, yAxisID:'y2' },
      { label:'Output (%)',       data:[], borderColor:'#f0ad3f', backgroundColor:'transparent', borderWidth:1.5, borderDash:[4,3], tension:.3, pointRadius:0, yAxisID:'y3' },
    ]
  },
  options: {
    responsive:true, animation:false,
    plugins:{ legend:{ labels:{ color:'#6b83a0', boxWidth:10 } } },
    scales:{
      x:  { ticks:{color:'#3d5270', maxTicksLimit:8}, grid:{color:'#111c30'} },
      y:  { title:{display:true,text:'mm',color:'#4a6080'}, grid:{color:'#111c30'}, ticks:{color:'#3d5270'} },
      y2: { position:'right', title:{display:true,text:'cm',color:'#4a6080'}, grid:{drawOnChartArea:false}, ticks:{color:'#3d5270'} },
      y3: { position:'right', min:0, max:100, title:{display:true,text:'%',color:'#4a6080'}, grid:{drawOnChartArea:false}, ticks:{color:'#3d5270'} },
    }
  }
});

// ── Status ─────────────────────────────────────────────────
function setStatus(pct) {
  const hc  = document.getElementById('heroCard');
  const pg  = document.getElementById('prog');
  const pEl = document.getElementById('fuzzy_pct');
  const bdg = document.getElementById('status_badge');
  const bdot= document.getElementById('badge_dot');
  const txt = document.getElementById('status_text');
  let c, g, label;
  if (pct > 70) {
    c='#f25555'; g='rgba(242,85,85,.3)'; label='⚠ BAHAYA';
  } else if (pct > 40) {
    c='#f0ad3f'; g='rgba(240,173,63,.3)'; label='⚡ SIAGA';
  } else {
    c='#2dce74'; g='rgba(45,206,116,.25)'; label='✔ AMAN';
  }
  hc.style.setProperty('--hcolor', c);
  hc.style.setProperty('--hglow',  g);
  hc.style.setProperty('--hglow2', g);
  // set semantic class for styling variants
  hc.classList.remove('siaga','bahaya','aman');
  if (label.includes('SIAGA')) hc.classList.add('siaga');
  else if (label.includes('BAHAYA')) hc.classList.add('bahaya');
  else hc.classList.add('aman');
  pEl.style.color      = c;
  pg.style.background  = c;
  pg.style.boxShadow   = `0 0 10px ${g}`;
  pg.style.width       = pct + '%';
  bdg.style.background  = g.replace('.3',',.12').replace('.25',',.1');
  bdg.style.borderColor = g.replace('.3',',.4').replace('.25',',.35');
  bdg.style.color       = c;
  bdot.style.background = c;
  txt.innerText = label;
}

// ── Correlation ────────────────────────────────────────────
function setCorr(r, n) {
  document.getElementById('corr_r').innerText = r.toFixed(3);
  document.getElementById('corr_sample').innerText = n;
  document.getElementById('corr_thumb').style.left = (((r+1)/2)*100)+'%';
  const abs = Math.abs(r);
  let d = 'Tidak berkorelasi';
  if (n < 2)      d = 'Belum cukup data';
  else if(abs>=.9) d = r>0?'Sangat kuat ↑':'Sangat kuat ↓';
  else if(abs>=.7) d = r>0?'Kuat ↑':'Kuat ↓';
  else if(abs>=.5) d = 'Sedang';
  else if(abs>=.3) d = 'Lemah';
  document.getElementById('corr_desc').innerText = d;
}

// ── Helpers ────────────────────────────────────────────────
const now = ()=> new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
const rainCat  = v => v < 10?'🟢 Ringan': v<40?'🟡 Sedang':'🔴 Lebat';
const waterCat = v => v < 80?'🟢 Aman'  : v<200?'🟡 Waspada':'🔴 Bahaya';

// ── CSV Logger (ke Database) ─────────────────────────────
const CSV_KEY = 'fews_csv_log';
let csvRows = [];
let csvCountdown = 10;
let lastData = null;

// Load cache dari localStorage
try {
  const saved = localStorage.getItem(CSV_KEY);
  if (saved) {
    csvRows = JSON.parse(saved);
    updateCsvUI();
  }
} catch(e) {
  csvRows = [];
}

function statusLabel(pct) {
  if (pct > 70) return 'BAHAYA';
  if (pct > 40) return 'SIAGA';
  return 'AMAN';
}

async function appendCsvRow(d) {
  const ts = new Date().toLocaleString('id-ID', { hour12:false });
  const row = {
    timestamp:       ts,
    curah_hujan:     d.curah_hujan,
    tinggi_air:      d.tinggi_air,
    suhu:            d.suhu,
    kelembaban:      d.kelembaban,
    kecepatan_angin: d.kecepatan_angin,
    output:          d.output,
    korelasi_r:      d.korelasi_r,
    status:          statusLabel(d.output),
  };
  
  // Save ke database via API
  try {
    const res = await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (res.ok) {
      csvRows.push(row);
      // persist to localStorage as backup
      try { localStorage.setItem(CSV_KEY, JSON.stringify(csvRows)); } catch(e){}
      updateCsvUI();
    }
  } catch(err) {
    console.error('Error saving log:', err);
  }

  // Flash dot (instant, no animation)
  const dot = document.getElementById('csv_dot');
  dot.style.opacity = '0.5';
  setTimeout(()=> dot.style.opacity = '1', 100);
}

function updateCsvUI() {
  document.getElementById('csv_count').innerText = csvRows.length;
  document.getElementById('btn_download').disabled = csvRows.length === 0;
}

function downloadCSV() {
  if (!csvRows.length) return;
  const header = 'Timestamp,Curah_Hujan_mm,Tinggi_Air_cm,Suhu_C,Kelembaban_%,Kec_Angin_ms,Output_%,Korelasi_r,Status\n';
  const data = csvRows.map(r => [
    `"${r.timestamp}"`,
    r.curah_hujan.toFixed(2),
    r.tinggi_air.toFixed(2),
    r.suhu.toFixed(2),
    r.kelembaban.toFixed(2),
    r.kecepatan_angin.toFixed(2),
    r.output.toFixed(2),
    r.korelasi_r.toFixed(4),
    r.status
  ].join(',')).join('\n');
  
  const blob = new Blob([header + data], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const ts   = new Date().toISOString().slice(0,16).replace('T','_').replace(/:/g,'');
  a.href     = url;
  a.download = `fews_log_${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function clearCSV() {
  if (!csvRows.length) return;
  if (!confirm(`Hapus ${csvRows.length} baris log CSV?`)) return;
  csvRows = [];
  try { localStorage.removeItem(CSV_KEY); } catch(e){}
  updateCsvUI();
}

// Countdown & log trigger
setInterval(() => {
  csvCountdown--;
  document.getElementById('csv_countdown').innerText = csvCountdown;
  if (csvCountdown <= 0) {
    csvCountdown = 10;
    // Only append CSV row if ESP is online and lastData exists
    if (lastData && espStatus === 'online') appendCsvRow(lastData);
  }
}, 1000);

// ── Apply ESP32 IP Config ────────────────────────────────────────
function applyIp() {
  const raw = document.getElementById('espIp').value.trim();
  if (!raw) {
    alert('Masukkan IP address ESP32 terlebih dahulu');
    return;
  }

  // Format URL dengan http:// jika belum ada
  let url = raw;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }

  ESP_IP = url;
  localStorage.setItem(ESP_IP_KEY, ESP_IP);
  
  document.getElementById('conn_status').innerText = '✓ IP tersimpan!';
  document.getElementById('conn_status').style.color = 'var(--green)';
  
  // Fetch data immediately
  fetchData();
  
  // Reset status message after 3 seconds
  setTimeout(() => {
    document.getElementById('conn_status').innerText = '';
  }, 3000);
}

// ── Fetch Data ──────────────────────────────────────────
async function fetchData() {
  try {
    const res  = await fetch(`${ESP_IP}/api`, { signal: AbortSignal.timeout(4000) });
    const d    = await res.json();

    // conn_status element removed from UI
    // document.getElementById('conn_status').className = 'conn-ok';
    // document.getElementById('conn_status').innerText  = '✓ Terhubung — '+now();

    document.getElementById('rain').innerText  = d.curah_hujan.toFixed(1);
    document.getElementById('water').innerText = d.tinggi_air.toFixed(1);
    document.getElementById('temp').innerText  = d.suhu.toFixed(1);
    document.getElementById('hum').innerText   = d.kelembaban.toFixed(1);
    document.getElementById('wind').innerText  = d.kecepatan_angin.toFixed(1);
    document.getElementById('rain_cat').innerText  = rainCat(d.curah_hujan);
    document.getElementById('water_cat').innerText = waterCat(d.tinggi_air);

    document.getElementById('fuzzy_pct').innerHTML = d.output.toFixed(1)+'<span>%</span>';
    setStatus(d.output);

    document.getElementById('mi_water').innerText = d.tinggi_air.toFixed(1)+' cm';
    document.getElementById('mi_rain').innerText  = d.curah_hujan.toFixed(1)+' mm';

    setCorr(d.korelasi_r, d.sample_count);

    document.getElementById('info_uptime').innerText = d.uptime;
    document.getElementById('hdr_uptime').innerText  = d.uptime;
    document.getElementById('info_staip').innerText  = ESP_IP.replace('https://','').replace('http://','');
    if (d.data_age_sec !== undefined) {
      const age = d.data_age_sec;
      document.getElementById('info_age').innerText = age + ' detik';
      document.getElementById('info_age').style.color = age > 30 ? 'var(--red)' : age > 15 ? 'var(--yellow)' : 'var(--green)';
    }

    // ── Parameter Pengujian Baru ──────────────────────────
    // [1] Akurasi
    if (d.akurasi) {
      document.getElementById('acc_pct').innerText = d.akurasi.persen?.toFixed(1) || '--';
      document.getElementById('acc_pred_cat').innerText = d.akurasi.kategori_prediksi || '--';
      document.getElementById('acc_actual_cat').innerText = d.akurasi.kategori_aktual || '--';
      document.getElementById('acc_total').innerText = d.akurasi.total_prediksi || '0';
      document.getElementById('acc_correct').innerText = d.akurasi.benar || '0';
    }

    // [2] Response Time
    if (d.response_time) {
      document.getElementById('resp_last').innerText = d.response_time.last_ms || '--';
      document.getElementById('resp_avg').innerText = (d.response_time.avg_ms?.toFixed(1) || '--') + ' ms';
      document.getElementById('resp_min').innerText = (d.response_time.min_ms || '--') + ' ms';
      document.getElementById('resp_max').innerText = (d.response_time.max_ms || '--') + ' ms';
      
      // Set response time status based on avg time
      let respStatus = 'Baik ✓';
      if (d.response_time.avg_ms > 5000) respStatus = 'Lambat ⚠';
      if (d.response_time.avg_ms > 8000) respStatus = 'Sangat Lambat ✗';
      document.getElementById('resp_status').innerText = respStatus;
      document.getElementById('resp_status').style.color = 
        d.response_time.avg_ms > 8000 ? 'var(--red)' :
        d.response_time.avg_ms > 5000 ? 'var(--yellow)' : 'var(--green)';
    }

    // [3] Stabilitas Data
    if (d.stabilitas) {
      document.getElementById('stab_water_cv').innerText = d.stabilitas.cv_air?.toFixed(1) || '--';
      document.getElementById('stab_water_status').innerText = d.stabilitas.status_air || '--';
      document.getElementById('stab_water_bar').style.width = Math.min(d.stabilitas.cv_air || 0, 100) + '%';
      document.getElementById('stab_water_bar').style.background = 
        d.stabilitas.cv_air < 10 ? '#2dce74' :
        d.stabilitas.cv_air < 25 ? '#f0ad3f' : '#f25555';

      document.getElementById('stab_rain_cv').innerText = d.stabilitas.cv_hujan?.toFixed(1) || '--';
      document.getElementById('stab_rain_status').innerText = d.stabilitas.status_hujan || '--';
      document.getElementById('stab_rain_bar').style.width = Math.min(d.stabilitas.cv_hujan || 0, 100) + '%';
      document.getElementById('stab_rain_bar').style.background = 
        d.stabilitas.cv_hujan < 10 ? '#2dce74' :
        d.stabilitas.cv_hujan < 25 ? '#f0ad3f' : '#f25555';
    }

    lastData = d;

    // Update ESP32 status indicator
    espLastData = Date.now();
    updateESPStatus();

    const t = now();
    [histTime,histRain,histWater,histOut].forEach((a,i)=>{
      const val = [t, d.curah_hujan, d.tinggi_air, d.output][i];
      a.push(val); if(a.length>MAX_HIST) a.shift();
    });
    chart.data.labels = [...histTime];
    chart.data.datasets[0].data = [...histRain];
    chart.data.datasets[1].data = [...histWater];
    chart.data.datasets[2].data = [...histOut];
    chart.update('none');

  } catch(err) {
    // Error handling - removed conn_status element
    console.error('Error:', err.message);
    
    // Reset all values to 0 when ESP is offline
    document.getElementById('rain').innerText  = '0';
    document.getElementById('water').innerText = '0';
    document.getElementById('temp').innerText  = '0';
    document.getElementById('hum').innerText   = '0';
    document.getElementById('wind').innerText  = '0';
    document.getElementById('rain_cat').innerText  = '—';
    document.getElementById('water_cat').innerText = '—';
    document.getElementById('fuzzy_pct').innerHTML = '0<span>%</span>';
    setStatus(0);
    document.getElementById('mi_water').innerText = '0 cm';
    document.getElementById('mi_rain').innerText  = '0 mm';
    setCorr(0, 0);
    
    // Reset parameter pengujian
    document.getElementById('acc_pct').innerText = '--';
    document.getElementById('acc_pred_cat').innerText = '--';
    document.getElementById('acc_actual_cat').innerText = '--';
    document.getElementById('acc_total').innerText = '0';
    document.getElementById('acc_correct').innerText = '0';
    
    document.getElementById('resp_last').innerText = '--';
    document.getElementById('resp_avg').innerText = '-- ms';
    document.getElementById('resp_min').innerText = '-- ms';
    document.getElementById('resp_max').innerText = '-- ms';
    document.getElementById('resp_status').innerText = 'Offline';
    document.getElementById('resp_status').style.color = 'var(--red)';
    
    document.getElementById('stab_water_cv').innerText = '--';
    document.getElementById('stab_water_status').innerText = '--';
    document.getElementById('stab_water_bar').style.width = '0%';
    document.getElementById('stab_rain_cv').innerText = '--';
    document.getElementById('stab_rain_status').innerText = '--';
    document.getElementById('stab_rain_bar').style.width = '0%';
    
    // Clear lastData and update ESP status
    lastData = null;
    updateESPStatus();
  }
}


// ── Check Database Health ────────────────────────────────
async function checkDBHealth() {
  try {
    const res = await fetch(`${ESP_IP}/api/health`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data.database === 'connected') {
        dbLastCheck = Date.now();
        updateDBStatus();
      } else {
        setDBStatus('offline');
      }
    } else {
      setDBStatus('offline');
    }
  } catch (err) {
    setDBStatus('offline');
  }
}

setInterval(fetchData, 5000);                       // Fetch every 5 sec (optimized)
setInterval(updateESPStatus, 2000);                // Update ESP status every 2 sec
setInterval(updateDBStatus, 2000);                 // Update DB status every 2 sec
setInterval(checkDBHealth, 10000);                 // Check DB health every 10 sec
loadESPIp();      // Load ESP32 IP from localStorage
initTheme();      // Initialize theme on page load
fetchData();
