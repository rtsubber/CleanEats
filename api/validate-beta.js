// CleanEats API - Validate beta code (server-side only)
// Prevents exposing beta codes in client-side JavaScript

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://cleaneats-eta.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Server-side only - never expose these codes in client-side JavaScript
  const VALID_CODES = new Set([
    'cleaneats2026',
    'beta2026',
    'gf2026',
    'testfree'
  ]);

  try {
    let body = req.body;
    if (!body) {
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        body = JSON.parse(Buffer.concat(chunks).toString());
      } catch (e) {
        return res.status(200).json({ valid: false });
      }
    }

    const { code } = body || {};
    if (!code || typeof code !== 'string') {
      return res.status(200).json({ valid: false });
    }

    const valid = VALID_CODES.has(code.toLowerCase().trim());
    return res.status(200).json({ valid });
  } catch (err) {
    console.error('Beta validation error:', err);
    return res.status(200).json({ valid: false });
  }
}