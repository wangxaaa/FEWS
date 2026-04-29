// ═══════════════════════════════════════════════════════════
//  FEWS — ESP32 Sensor + HTTP Client
//  Kirim data sensor ke server yang sudah di-hosting
//  Library: DHT sensor library, HTTPClient (bawaan ESP32)
// ═══════════════════════════════════════════════════════════

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ── Konfigurasi WiFi ──────────────────────────────────────
const char* WIFI_SSID = "NAMA_WIFI_KAMU";
const char* WIFI_PASS = "PASSWORD_WIFI";

// ── Konfigurasi Server ────────────────────────────────────
// Ganti dengan URL Railway/Render kamu setelah deploy
const char* SERVER_URL = "https://fews-hs15.vercel.app/api/data";
const char* API_KEY    = "fews2026"; // harus sama dengan server

// ── Pin Sensor ────────────────────────────────────────────
#define DHT_PIN    4      // GPIO DHT22 (suhu & kelembaban)
#define DHT_TYPE   DHT22
#define TRIG_PIN   5      // HC-SR04 trigger (tinggi air)
#define ECHO_PIN   18     // HC-SR04 echo
#define RAIN_PIN   34     // Rain sensor analog (ADC)
#define WIND_PIN   35     // Anemometer analog (ADC)
#define RESET_BTN  32     // Tombol reset data

DHT dht(DHT_PIN, DHT_TYPE);

// ── Pearson Correlation (rolling 20 sampel) ───────────────
#define CORR_N 20
float corrRain[CORR_N], corrWater[CORR_N];
int   corrIdx = 0, corrCount = 0;

float pearsonR() {
  int n = min(corrCount, CORR_N);
  if (n < 2) return 0.0;
  float mx=0, my=0;
  for (int i=0;i<n;i++) { mx+=corrRain[i]; my+=corrWater[i]; }
  mx/=n; my/=n;
  float num=0, dx=0, dy=0;
  for (int i=0;i<n;i++) {
    float ex=corrRain[i]-mx, ey=corrWater[i]-my;
    num+=ex*ey; dx+=ex*ex; dy+=ey*ey;
  }
  float denom=sqrt(dx*dy);
  return (denom==0) ? 0 : num/denom;
}

// ── Fuzzy Logic Output ────────────────────────────────────
float fuzzyOutput(float rain, float water) {
  // Membership: water
  float wAman    = (water < 80)  ? 1.0 : (water < 200) ? (200-water)/120.0 : 0.0;
  float wWaspada = (water < 80)  ? 0.0 : (water < 140) ? (water-80)/60.0
                 : (water < 200) ? (200-water)/60.0 : 0.0;
  float wBahaya  = (water < 140) ? 0.0 : (water < 200) ? (water-140)/60.0 : 1.0;

  // Membership: rain
  float rRingan  = (rain < 10) ? 1.0 : (rain < 30) ? (30-rain)/20.0 : 0.0;
  float rSedang  = (rain < 10) ? 0.0 : (rain < 25) ? (rain-10)/15.0
                 : (rain < 40) ? (40-rain)/15.0 : 0.0;
  float rLebat   = (rain < 25) ? 0.0 : (rain < 40) ? (rain-25)/15.0 : 1.0;

  // Rules → output centroid
  float rules[9][3] = {
    {min(wAman,rRingan),    0},   // AMAN
    {min(wAman,rSedang),    0},
    {min(wAman,rLebat),    50},   // SIAGA
    {min(wWaspada,rRingan), 0},
    {min(wWaspada,rSedang),50},
    {min(wWaspada,rLebat), 90},   // BAHAYA
    {min(wBahaya,rRingan), 50},
    {min(wBahaya,rSedang), 90},
    {min(wBahaya,rLebat),  100},
  };
  float num=0, den=0;
  for (auto& r : rules) { num+=r[0]*r[1]; den+=r[0]; }
  return (den==0) ? 0 : num/den;
}

// ── Baca Tinggi Air (HC-SR04) ─────────────────────────────
float readWaterLevel() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long dur  = pulseIn(ECHO_PIN, HIGH, 30000);
  float dist = dur * 0.034 / 2.0; // cm dari sensor ke permukaan air
  // Asumsi sensor dipasang 250 cm di atas dasar sungai
  float level = 250.0 - dist;
  return max(0.0f, level);
}

// ── Baca Curah Hujan ──────────────────────────────────────
float readRainfall() {
  int raw = analogRead(RAIN_PIN); // 0–4095
  // Kalibrasi: 0 = kering (4095), 4095 = sangat basah (0)
  float mm = map(raw, 4095, 0, 0, 60);
  return constrain(mm, 0, 60);
}

// ── Baca Kecepatan Angin ──────────────────────────────────
float readWindSpeed() {
  int raw = analogRead(WIND_PIN);
  // Kalibrasi: sesuaikan dengan anemometer kamu
  float ms = raw * (15.0 / 4095.0);
  return ms;
}

// ── Setup ─────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);  pinMode(RESET_BTN, INPUT_PULLUP);
  Serial.println("\n🌊 FEWS ESP32 Starting...");

  // Konek WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500); Serial.print("."); tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n✗ WiFi gagal! Cek SSID/Password.");
  }
}

// ── Uptime string ─────────────────────────────────────────
String uptimeStr() {
  unsigned long s = millis() / 1000;
  char buf[9];
  sprintf(buf, "%02lu:%02lu:%02lu", s/3600, (s%3600)/60, s%60);
  return String(buf);
}

// ── Loop ──────────────────────────────────────────────────
unsigned long lastSend = 0;
unsigned long lastBtnCheck = 0;
const unsigned long INTERVAL = 10000; // kirim setiap 10 detik
const unsigned long BTN_DEBOUNCE = 500; // debounce 500ms

void loop() {
  // Cek tombol reset (debounce)
  if (millis() - lastBtnCheck > BTN_DEBOUNCE) {
    lastBtnCheck = millis();
    if (digitalRead(RESET_BTN) == LOW) {
      corrCount = 0;
      corrIdx = 0;
      memset(corrRain, 0, sizeof(corrRain));
      memset(corrWater, 0, sizeof(corrWater));
      Serial.println("🔄 Data reset! Correlation data cleared.");
      delay(1000); // tunggu tombol dilepas
    }
  }

  if (millis() - lastSend < INTERVAL) return;
  lastSend = millis();

  // Baca semua sensor
  float rain  = readRainfall();
  float water = readWaterLevel();
  float temp  = dht.readTemperature();
  float hum   = dht.readHumidity();
  float wind  = readWindSpeed();

  // Fallback jika DHT gagal baca
  if (isnan(temp)) temp = 0;
  if (isnan(hum))  hum  = 0;

  // Hitung Pearson & Fuzzy
  corrRain[corrIdx]  = rain;
  corrWater[corrIdx] = water;
  corrIdx   = (corrIdx + 1) % CORR_N;
  if (corrCount < CORR_N) corrCount++;

  float r      = pearsonR();
  float output = fuzzyOutput(rain, water);

  Serial.printf("Rain:%.1f mm | Water:%.1f cm | Temp:%.1f°C | Hum:%.1f%% | Wind:%.1f m/s | Out:%.1f%% | r:%.3f\n",
                rain, water, temp, hum, wind, output, r);

  // Kirim ke server jika WiFi tersambung
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    WiFi.reconnect();
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  http.setTimeout(8000);

  // Buat JSON payload
  StaticJsonDocument<256> doc;
  doc["curah_hujan"]    = round(rain  * 10) / 10.0;
  doc["tinggi_air"]     = round(water * 10) / 10.0;
  doc["suhu"]           = round(temp  * 10) / 10.0;
  doc["kelembaban"]     = round(hum   * 10) / 10.0;
  doc["kecepatan_angin"]= round(wind  * 10) / 10.0;
  doc["output"]         = round(output* 10) / 10.0;
  doc["korelasi_r"]     = round(r * 1000) / 1000.0;
  doc["sample_count"]   = corrCount;
  doc["uptime"]         = uptimeStr();

  String payload;
  serializeJson(doc, payload);

  int code = http.POST(payload);
  if (code == 200) {
    Serial.println("✓ Data terkirim ke server");
  } else {
    Serial.printf("✗ Gagal kirim, HTTP %d\n", code);
  }
  http.end();
}
