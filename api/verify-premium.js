// CleanEats API - Verify premium access (server-side source of truth)
// Called by the frontend to check if a device/user has premium access
// Supports: Stripe subscription check, beta code validation, trial status

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://cleaneats-eta.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (!body && req.method === 'POST') {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch (e) {
      return res.status(200).json({ premium: false, source: 'none', plan: 'free' });
    }
  }

  const { device_id, beta_code } = body || {};

  // 1. Check Stripe subscription by device_id
  if (device_id && STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(STRIPE_SECRET_KEY);

      const customers = await stripe.customers.list({
        metadata: { device_id },
        limit: 1
      });

      if (customers.data.length > 0) {
        const subs = await stripe.subscriptions.list({
          customer: customers.data[0].id,
          status: 'active',
          limit: 1
        });

        if (subs.data.length > 0) {
          return res.status(200).json({
            premium: true,
            source: 'stripe',
            plan: subs.data[0].plan?.interval || 'monthly',
            current_period_end: subs.data[0].current_period_end
          });
        }
      }
    } catch (err) {
      console.error('Stripe check error:', err);
    }
  }

  // 2. Validate beta code (server-side only - never expose in client JS)
  const VALID_BETA_CODES = new Set([
    'cleaneats2026',
    'beta2026',
    'gf2026',
    'testfree'
  ]);

  if (beta_code && VALID_BETA_CODES.has(beta_code.toLowerCase().trim())) {
    return res.status(200).json({
      premium: true,
      source: 'beta',
      plan: 'beta'
    });
  }

  // 3. No premium found
  return res.status(200).json({
    premium: false,
    source: 'none',
    plan: 'free'
  });
}