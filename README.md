# 🥗 CleanEats

**Find gluten-free, keto & healthy food near you instantly**

A progressive web app that searches Yelp, Google Places, and Foursquare simultaneously to find restaurants matching your dietary needs — whether you're celiac, keto, vegan, or just eating healthier.

## Features

- 🌾 **Gluten-Free** — Dedicated GF menus, GF options, celiac-safe ratings
- 🥑 **Keto Friendly** — Low-carb and sugar-free restaurants near you
- 🌱 **Vegan & Organic** — Plant-based options in one search
- ☕ **Clean Drinks** — Coffee, boba, smoothies, protein shakes filtered for your diet
- 📍 **Works Anywhere** — Auto-detects location or search any zip code
- 🎲 **Can't Decide?** — Let the Decider pick a healthy spot for you
- 🌙 **Dark Mode** — Easy on the eyes
- 📱 **PWA** — No app store download needed

## Pricing

- **Free** — Healthy filter, location search, 3 saved favorites
- **Premium ($2.99/mo or $24.99/yr)** — GF/keto/vegan filters, celiac-safe ratings, unlimited saves, full menu details, no ads

7-day free trial included. Cancel anytime.

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no framework — fast & lightweight)
- **Backend:** Vercel Serverless Functions (Node.js)
- **Search APIs:** Yelp Fusion, Google Places, Foursquare
- **Payments:** Stripe Checkout + Subscriptions
- **Hosting:** Vercel (PWA with offline support)

## Setup

```bash
# Install dependencies
npm install

# Set environment variables in .env or Vercel dashboard:
YELP_API_KEY=your_yelp_api_key
GOOGLE_PLACES_KEY=your_google_places_key
FOURSQUARE_CLIENT_ID=your_foursquare_client_id
FOURSQUARE_CLIENT_SECRET=your_foursquare_client_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_MONTHLY_PRICE_ID=price_xxx  # optional, auto-creates if empty
STRIPE_YEARLY_PRICE_ID=price_xxx   # optional, auto-creates if empty
STRIPE_WEBHOOK_SECRET=whsec_xxx    # for webhook endpoint

# Run locally
vercel dev

# Deploy
vercel --prod
```

## Environment Variables

All secrets are loaded from environment variables — **never hardcoded**. See `.env` example above or set them in your Vercel project settings.

## License

MIT

---

Built with 💚 by [BrandBoost Studio](https://brandbooststudio.co)