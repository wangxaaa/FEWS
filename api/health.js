// api/health.js
// GET /api/health - Check server and database health status

import { sbSelect } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const health = {
    timestamp:    new Date().toISOString(),
    server:       'connected',
    database:     'disconnected',
  };

  // Try to connect to database
  try {
    await sbSelect('sensor_data', 'limit=1');
    health.database = 'connected';
    return res.status(200).json(health);
  } catch (err) {
    console.error('Database health check failed:', err.message);
    return res.status(200).json(health); // Return 200 even if DB is down (so client knows we checked)
  }
}
