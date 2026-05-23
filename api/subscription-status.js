// CleanEats Premium — Check subscription status
// Returns whether a device has premium access

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { device_id } = req.query;
  
  if (!device_id) {
    return res.status(200).json({ premium: false, plan: 'free' });
  }

  // Check with Stripe if we have a secret key
  if (STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(STRIPE_SECRET_KEY);
      
      // Look up customer by device_id metadata
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
            plan: 'premium',
            current_period_end: subs.data[0].current_period_end
          });
        }
      }
    } catch (err) {
      console.error('Subscription check error:', err);
    }
  }

  // Fallback: check localStorage flag (client-side sets this on success redirect)
  return res.status(200).json({ premium: false, plan: 'free' });
}