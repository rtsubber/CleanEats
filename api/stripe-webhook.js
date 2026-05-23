// CleanEats Premium — Stripe Webhook Handler
// Processes subscription events from Stripe

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    console.error('Missing Stripe env vars');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let body;
  try {
    body = await getRawBody(req);
  } catch (e) {
    console.error('Failed to read body:', e);
    return res.status(400).json({ error: 'Failed to read body' });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const deviceId = session.metadata?.device_id || '';
        console.log(`✅ Premium activated for device: ${deviceId}, session: ${session.id}`);
        // In production, store in database. For now, log it.
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        console.log(`❌ Premium deactivated for subscription: ${sub.id}`);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log(`💳 Payment succeeded: ${invoice.id}`);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`⚠️ Payment failed: ${invoice.id}`);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Webhook failed' });
  }
}