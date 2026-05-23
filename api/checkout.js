// CleanEats Premium — Stripe Checkout Session
// Creates a Stripe Checkout session for premium subscription

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

const PLANS = {
  monthly: {
    name: 'CleanEats Premium — Monthly',
    price_id: process.env.STRIPE_MONTHLY_PRICE_ID || '',
    amount: 299, // $2.99
    interval: 'month'
  },
  yearly: {
    name: 'CleanEats Premium — Yearly',
    price_id: process.env.STRIPE_YEARLY_PRICE_ID || '',
    amount: 2499, // $24.99
    interval: 'year'
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://cleaneats-eta.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  try {
    const { plan = 'monthly', device_id } = req.body;
    const selectedPlan = PLANS[plan];
    if (!selectedPlan) return res.status(400).json({ error: 'Invalid plan' });

    // Dynamic import for Stripe (Node 18+ ESM)
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: selectedPlan.price_id ? [
        { price: selectedPlan.price_id, quantity: 1 }
      ] : [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: selectedPlan.name, description: 'Advanced GF filters, unlimited saves, celiac safety data & more' },
            recurring: { interval: selectedPlan.interval }
          },
          unit_amount: selectedPlan.amount,
          quantity: 1
        }
      ],
      metadata: { device_id: device_id || '', app: 'cleaneats' },
      success_url: 'https://cleaneats-eta.vercel.app/?premium=success',
      cancel_url: 'https://cleaneats-eta.vercel.app/?premium=cancel',
    });

    return res.status(200).json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err.message || err);
    return res.status(500).json({ error: 'Checkout failed', details: err.message || String(err) });
  }
}