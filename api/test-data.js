// api/test-data.js
// Simple endpoint untuk TEST MANUAL: mengirim dummy data ke /api/data

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Use GET method' });
  }

  const testData = {
    curah_hujan: 5.2,
    tinggi_air: 120,
    suhu: 24.5,
    kelembaban: 65,
    kecepatan_angin: 3.2,
    output: 50.2,
    korelasi_r: 0.123,
    sample_count: 15,
    uptime: "00:05:23"
  };

  // Forward ke api/data endpoint
  const response = await fetch(`${req.headers['x-forwarded-proto']}://${req.headers['host']}/api/data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'fews2026'
    },
    body: JSON.stringify(testData)
  });

  const result = await response.json();
  
  return res.status(response.status).json({
    message: 'Test data sent to /api/data',
    status: response.status,
    response: result,
    test_payload: testData
  });
}
