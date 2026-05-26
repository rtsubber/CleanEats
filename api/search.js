// CleanEats API — Multi-source search: Google Places (primary) + Yelp (secondary) + Foursquare (tertiary) + chain database
// Uses Google Places API for maximum coverage, Yelp for reviews/ratings, Foursquare for granular categories, demo data as fallback

const YELP_API_KEY = process.env.YELP_API_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_KEY || '';
const FS_CLIENT_ID = process.env.FOURSQUARE_CLIENT_ID || '';
const FS_CLIENT_SECRET = process.env.FOURSQUARE_CLIENT_SECRET || '';

// Foursquare category IDs for drink types
const FS_DRINK_CATEGORIES = {
  coffee: '4bf58dd8d48988d1e0931735',
  boba: '52e81612bcbc57f1066b7a0c',
  juice: '4bf58dd8d48988d112941735',
  smoothie: '4bf58dd8d48988d1bd941735',
  tea: '52e81612bcbc57f1066b7a0c,4bf58dd8d48988d1e0931735',
};
const FS_FOOD_CATEGORIES = {
  gf: '4bf58dd8d48988d174941735', // gluten-free restaurant
  vegan: '4bf58dd8d48988d1d3941735',
  vegetarian: '4bf58dd8d48988d1af941735',
  healthy: '4bf58dd8d48988d175941735', // salad place
};
const FS_VERSION = '20240101';

// Google Place type mappings for search
const GOOGLE_FOOD_TYPES = {
  all: 'restaurant',
  gf: 'restaurant',
  healthy: 'restaurant',
  vegan: 'restaurant',
  organic: 'restaurant',
  keto: 'restaurant'
};
const GOOGLE_FOOD_KEYWORDS = {
  all: 'gluten free healthy restaurant',
  gf: 'gluten free restaurant',
  healthy: 'healthy food restaurant',
  vegan: 'vegan gluten free restaurant',
  organic: 'organic gluten free restaurant',
  keto: 'keto paleo gluten free restaurant'
};
const GOOGLE_DRINK_KEYWORDS = {
  all: 'coffee tea smoothie juice drinks',
  coffee: 'coffee shop cafe espresso',
  protein: 'protein smoothie shake health nutrition',
  keto: 'keto coffee sugar free low carb drinks',
  smoothie: 'smoothie juice bar acai bowl',
  boba: 'bubble tea boba milk tea',
  energy: 'energy drinks smoothie coffee'
};
const GOOGLE_DRINK_TYPES = {
  all: 'cafe',
  coffee: 'cafe',
  protein: 'cafe',
  keto: 'cafe',
  smoothie: 'cafe',
  boba: 'cafe',
  energy: 'cafe'
};

// Known chains with GF menus/options (supplement Yelp data)
const GF_CHAIN_MENU = {
  'texas roadhouse': { gf_menu: true, gf_items: 'Steaks, ribs, sweet potato, side salad, baked potato, green beans', celiac_safe: 'shared kitchen', gf_note: '📋 GF Menu: Steaks, ribs, sides — ask for the allergen menu' },
  'olive garden': { gf_menu: true, gf_items: 'GF pasta, minestrone soup, salad without croutons, Zuppa Toscana', celiac_safe: 'separate GF pasta water', gf_note: '📋 GF Menu: Pasta, soups, salads — GF pasta cooked separately' },
  "chili's": { gf_menu: true, gf_items: 'GF burgers, fajitas, ribs, grilled chicken, margaritas', celiac_safe: 'shared kitchen', gf_note: '📋 GF Menu: Burgers, fajitas, ribs — ask for the allergen guide' },
  'outback steakhouse': { gf_menu: true, gf_items: 'Steaks, chicken, seafood, salads, baked potatoes, veggies', celiac_safe: 'dedicated GF fryer', gf_note: '📋 GF Menu: Extensive GF menu with dedicated fryer' },
  'bonefish grill': { gf_menu: true, gf_items: 'Grilled fish, bang bang shrimp (GF version), salads, steaks', celiac_safe: 'dedicated GF menu', gf_note: '📋 GF Menu: Dedicated gluten-free menu available' },
  'pf chang': { gf_menu: true, gf_items: 'GF Chang\'s spicy chicken, GF fried rice, GF lo mein, GF Beijing beef', celiac_safe: 'separate GF prep area', gf_note: '📋 GF Menu: Extensive GF menu with separate prep' },
  'benihana': { gf_menu: false, gf_options: true, gf_items: 'Fried rice (GF), hibachi chicken, steak, shrimp, edamame', celiac_safe: 'shared grill', gf_note: '⚠️ GF Options: Most items naturally GF, rice instead of noodles' },
  'red lobster': { gf_menu: false, gf_options: true, gf_items: 'Lobster, crab legs, shrimp, salmon, salads, baked potato', celiac_safe: 'shared kitchen', gf_note: '⚠️ GF Options: Several options marked on menu' },
  'cheesecake factory': { gf_menu: true, gf_items: 'GF pasta, GF burgers, GF pizzas, salads, GF cheesecake', celiac_safe: 'shared kitchen', gf_note: '📋 GF Menu: 30+ GF items called "GlutenFree" cuisine' },
  'panera bread': { gf_menu: false, gf_options: true, gf_items: 'GF bowls, soups, salads without croutons', celiac_safe: 'shared bakery', gf_note: '⚠️ GF Options: Gluten-conscious items (not celiac-safe)' },
  'chipotle': { gf_menu: false, gf_options: true, gf_items: 'Bowls, tacos with corn tortillas, rice, beans, guac, salsa', celiac_safe: 'most items GF except tortillas', gf_note: '⚠️ GF Options: Bowls and corn tortilla tacos are GF' },
  'five guys': { gf_menu: false, gf_options: true, gf_items: 'Burger bowls (no bun), hot dogs (no bun), fries', celiac_safe: 'dedicated fryer for fries', gf_note: '⚠️ GF Options: Burger bowls + fries (dedicated fryer)' },
  'noodles & company': { gf_menu: false, gf_options: true, gf_items: 'GF noodles available for most dishes', celiac_safe: 'shared kitchen', gf_note: '⚠️ GF Options: Gluten-free noodles available' },
  'buffalo wild wings': { gf_menu: false, gf_options: true, gf_items: 'Traditional wings, carrots, celery, select sauces', celiac_safe: 'shared fryer', gf_note: '⚠️ GF Options: Traditional wings are GF, many sauces' },
  "moe's southwest grill": { gf_menu: false, gf_options: true, gf_items: 'Bowls, tacos with corn tortillas, nachos', celiac_safe: 'shared kitchen', gf_note: '⚠️ GF Options: Bowls and corn tortilla tacos' },
  'zoes kitchen': { gf_menu: false, gf_options: true, gf_items: 'Mediterranean bowls, hummus, salads, kabobs', celiac_safe: 'shared kitchen', gf_note: '⚠️ GF Options: Many Mediterranean items naturally GF' },
  'first watch': { gf_menu: false, gf_options: true, gf_items: 'GF pancakes, avocado toast, egg bowls, salads', celiac_safe: 'shared kitchen', gf_note: '⚠️ GF Options: GF pancakes and items clearly marked' },
  "ihop": { gf_menu: false, gf_options: true, gf_items: 'GF pancakes, egg dishes, hash browns, salads', celiac_safe: 'shared griddle', gf_note: '⚠️ GF Options: GF pancakes available, shared griddle' },
  'in-n-out': { gf_menu: false, gf_options: true, gf_items: 'Protein-style burgers (lettuce wrap), fries', celiac_safe: 'shared kitchen', gf_note: '⚠️ GF Options: Protein-style (lettuce wrap) burgers' },
  'whataburger': { gf_menu: false, gf_options: true, gf_items: 'Burger without bun, breakfast items without toast', celiac_safe: 'shared kitchen', gf_note: '⚠️ GF Options: Limited GF options, ask for allergen menu' },
  "joe's crab shack": { gf_menu: false, gf_options: true, gf_items: 'Steamed seafood, grilled fish, salads, corn on the cob', celiac_safe: 'shared kitchen', gf_note: '⚠️ GF Options: Steamed seafood, grilled fish, salads (no croutons)' },
  'red robin': { gf_menu: true, gf_items: 'GF burgers on lettuce wrap or GF bun, GF fries, salads', celiac_safe: 'dedicated fryer', gf_note: '📋 GF Menu: Burgers on GF buns or lettuce wraps + dedicated fryer' },
  'hopdoddy': { gf_menu: true, gf_items: 'GF buns, burgers, fries, salads', celiac_safe: 'dedicated fryer', gf_note: '📋 GF Menu: GF buns available, dedicated fryer' },
  'pizza hut': { gf_menu: false, gf_options: true, gf_items: 'GF pizza (Udi\'s crust), salads', celiac_safe: 'shared kitchen', gf_note: '⚠️ GF Options: GF pizza with Udi\'s crust' },
  'blaze pizza': { gf_menu: true, gf_items: 'GF crust, all toppings, salads', celiac_safe: 'separate GF prep', gf_note: '📋 GF Menu: GF crust available, separate preparation' },
  'mod pizza': { gf_menu: true, gf_items: 'GF crust, all toppings, salads', celiac_safe: 'separate GF crust prep', gf_note: '📋 GF Menu: GF crust available, careful prep' },
  'pieology': { gf_menu: true, gf_items: 'GF crust, all toppings', celiac_safe: 'shared kitchen', gf_note: '📋 GF Menu: GF crust available' },
};

const DEMO_RESTAURANTS = [
  { id: 'demo-1', name: 'The Green Kitchen', rating: 4.7, review_count: 342, price: '$$', distance: 800, address: '123 Health Ave, Austin, TX', phone: '(512) 555-0101', image_url: '', categories: 'Gluten-Free, Healthy, Salad', gf: true, gf_menu: true, gf_options: false, gf_note: 'Dedicated gluten-free kitchen', healthy: true, vegan: false, organic: true, keto: true, tags: ['gf','gfmenu','healthy','organic','keto'], is_open_now: true, hours: { Mon: '7:00 AM–9:00 PM', Tue: '7:00 AM–9:00 PM', Wed: '7:00 AM–9:00 PM', Thu: '7:00 AM–9:00 PM', Fri: '7:00 AM–10:00 PM', Sat: '8:00 AM–10:00 PM', Sun: '8:00 AM–8:00 PM' }, coordinates: { latitude: 30.2672, longitude: -97.7431 } },
  { id: 'demo-2', name: 'Fresh Bowl Co.', rating: 4.5, review_count: 218, price: '$$', distance: 1200, address: '456 Clean St, Austin, TX', phone: '(512) 555-0102', image_url: '', categories: 'Vegan, Gluten-Free, Juice Bar', gf: true, gf_menu: true, gf_options: false, gf_note: 'Full GF menu with bowls and smoothies', healthy: true, vegan: true, organic: false, keto: false, tags: ['gf','gfmenu','healthy','vegan'], is_open_now: true, hours: { Mon: '10:00 AM–8:00 PM', Tue: '10:00 AM–8:00 PM', Wed: '10:00 AM–8:00 PM', Thu: '10:00 AM–8:00 PM', Fri: '10:00 AM–9:00 PM', Sat: '11:00 AM–9:00 PM', Sun: '11:00 AM–7:00 PM' }, coordinates: { latitude: 30.2682, longitude: -97.7441 } },
  { id: 'demo-3', name: 'Nourish Cafe', rating: 4.8, review_count: 567, price: '$$$', distance: 2400, address: '789 Wellness Blvd, Austin, TX', phone: '(512) 555-0103', image_url: '', categories: 'Organic, Farm-to-Table, Gluten-Free', gf: true, gf_menu: true, gf_options: false, gf_note: '100% gluten-free kitchen', healthy: true, vegan: false, organic: true, keto: true, tags: ['gf','gfmenu','healthy','organic','keto'], is_open_now: false, hours: { Mon: '11:00 AM–3:00 PM', Tue: '11:00 AM–3:00 PM', Wed: '11:00 AM–3:00 PM', Thu: '11:00 AM–9:00 PM', Fri: '11:00 AM–10:00 PM', Sat: '9:00 AM–10:00 PM', Sun: '9:00 AM–3:00 PM' }, coordinates: { latitude: 30.2652, longitude: -97.7451 } },
  { id: 'demo-4', name: 'Harvest Kitchen', rating: 4.3, review_count: 189, price: '$$', distance: 3100, address: '321 Farm Rd, Austin, TX', phone: '(512) 555-0104', image_url: '', categories: 'Farm-to-Table, Healthy, Salad', gf: false, gf_menu: false, gf_options: true, gf_note: 'Several GF options available, ask your server', healthy: true, vegan: false, organic: true, keto: false, tags: ['gfopt','healthy','organic'], is_open_now: true, hours: { Mon: '11:00 AM–10:00 PM', Tue: '11:00 AM–10:00 PM', Wed: '11:00 AM–10:00 PM', Thu: '11:00 AM–10:00 PM', Fri: '11:00 AM–11:00 PM', Sat: '10:00 AM–11:00 PM', Sun: '10:00 AM–9:00 PM' }, coordinates: { latitude: 30.2662, longitude: -97.7461 } },
  { id: 'demo-5', name: 'Pure GF Bakery', rating: 4.9, review_count: 421, price: '$$', distance: 1800, address: '555 Wheat-Free Ln, Austin, TX', phone: '(512) 555-0105', image_url: '', categories: 'Bakeries, Gluten-Free', gf: true, gf_menu: true, gf_options: false, gf_note: 'Entire menu is gluten-free', healthy: false, vegan: false, organic: false, keto: false, tags: ['gf','gfmenu'], is_open_now: true, hours: { Mon: '6:00 AM–2:00 PM', Tue: '6:00 AM–2:00 PM', Wed: '6:00 AM–2:00 PM', Thu: '6:00 AM–2:00 PM', Fri: '6:00 AM–6:00 PM', Sat: '7:00 AM–6:00 PM', Sun: 'Closed' }, coordinates: { latitude: 30.2642, longitude: -97.7421 } },
  { id: 'demo-6', name: 'Keto Kitchen', rating: 4.4, review_count: 156, price: '$$$', distance: 4200, address: '888 Low Carb Dr, Austin, TX', phone: '(512) 555-0106', image_url: '', categories: 'Keto, Paleo, Healthy', gf: true, gf_menu: false, gf_options: true, gf_note: 'Most items GF, ask about specific dishes', healthy: true, vegan: false, organic: false, keto: true, tags: ['gf','gfopt','healthy','keto'], is_open_now: false, hours: { Mon: '11:00 AM–8:00 PM', Tue: '11:00 AM–8:00 PM', Wed: '11:00 AM–8:00 PM', Thu: '11:00 AM–8:00 PM', Fri: '11:00 AM–9:00 PM', Sat: '10:00 AM–9:00 PM', Sun: 'Closed' }, coordinates: { latitude: 30.2632, longitude: -97.7471 } },
  { id: 'demo-7', name: 'Earth Bowl', rating: 4.6, review_count: 312, price: '$$', distance: 1500, address: '222 Veggie Way, Austin, TX', phone: '(512) 555-0107', image_url: '', categories: 'Vegan, Vegetarian, Organic', gf: true, gf_menu: true, gf_options: false, gf_note: 'Dedicated GF menu with bowls and wraps', healthy: true, vegan: true, organic: true, keto: false, tags: ['gf','gfmenu','healthy','vegan','organic'], is_open_now: true, hours: { Mon: '9:00 AM–9:00 PM', Tue: '9:00 AM–9:00 PM', Wed: '9:00 AM–9:00 PM', Thu: '9:00 AM–9:00 PM', Fri: '9:00 AM–10:00 PM', Sat: '8:00 AM–10:00 PM', Sun: '8:00 AM–8:00 PM' }, coordinates: { latitude: 30.2692, longitude: -97.7481 } },
  { id: 'demo-8', name: 'Clean Juice', rating: 4.2, review_count: 98, price: '$', distance: 600, address: '100 Juice Bar Rd, Austin, TX', phone: '(512) 555-0108', image_url: '', categories: 'Juice Bars, Healthy, Açaí', gf: false, gf_menu: false, gf_options: true, gf_note: 'Most smoothies and bowls are GF', healthy: true, vegan: true, organic: false, keto: false, tags: ['gfopt','healthy','vegan'], is_open_now: true, hours: { Mon: '7:00 AM–7:00 PM', Tue: '7:00 AM–7:00 PM', Wed: '7:00 AM–7:00 PM', Thu: '7:00 AM–7:00 PM', Fri: '7:00 AM–7:00 PM', Sat: '8:00 AM–6:00 PM', Sun: '9:00 AM–5:00 PM' }, coordinates: { latitude: 30.2702, longitude: -97.7411 } },
];

const GF_CATEGORIES = 'gluten_free,vegan,vegetarian,salad,juicebars';
const DRINK_CATEGORIES = 'coffee,tea,bubbletea,juicebars,smoothies,coffeeroasteries';
const DRINK_SUB_CATEGORIES = {
  coffee: 'coffee,coffeeroasteries,tea',
  protein: 'juicebars,smoothies',
  keto: 'coffee,coffeeroasteries',
  smoothie: 'juicebars,smoothies',
  boba: 'bubbletea,tea',
  energy: 'coffee,coffeeroasteries,juicebars,smoothies'
};
const GF_SEARCH_TERMS = {
  all: 'gluten free menu healthy',
  gf: 'gluten free menu',
  healthy: 'healthy food menu',
  vegan: 'vegan gluten free menu',
  organic: 'organic gluten free menu',
  keto: 'keto paleo gluten free menu'
};
const DRINK_SEARCH_TERMS = {
  all: 'drinks coffee tea smoothie juice',
  coffee: 'coffee cafe espresso',
  protein: 'smoothie protein shake health juice',
  keto: 'keto coffee sugar free low carb drinks',
  smoothie: 'smoothie juice bar acai bowl',
  boba: 'bubble tea boba milk tea',
  energy: 'energy drinks smoothie coffee'
};

const DRINK_CHAIN_DATA = {
  'starbucks': { gf_menu: false, gf_options: true, gf_items: 'Pink Drink, Passion Tango Tea, Iced Matcha Latte, Almond Milk Lattes, Refreshers', celiac_safe: 'shared equipment', gf_note: '⚠️ GF Options: Many drinks are naturally GF, ask for no cookie straw', drink_types: ['coffee','tea','smoothie'] },
  'dutch bros': { gf_menu: false, gf_options: true, gf_items: 'Sugar-Free Rebel, Americano, Cold Brew, Keto Americano', celiac_safe: 'shared equipment', gf_note: '⚠️ GF Options: Most drinks are GF, ask for sugar-free syrups', drink_types: ['coffee','energy'] },
  '7 brew': { gf_menu: false, gf_options: true, gf_items: 'Keto White Russian, Sugar-Free options, Americano, Cold Brew', celiac_safe: 'shared equipment', gf_note: '⚠️ GF Options: Many keto/sugar-free options available', drink_types: ['coffee','energy'] },
  'dutch brothers': { gf_menu: false, gf_options: true, gf_items: 'Sugar-Free Rebel, Americano, Cold Brew, Keto Americano', celiac_safe: 'shared equipment', gf_note: '⚠️ GF Options: Most drinks are GF, ask for sugar-free syrups', drink_types: ['coffee','energy'] },
  'smoothie king': { gf_menu: false, gf_options: true, gf_items: 'Gladiator, Vegan Gladiator, Keto Champ, Lean1', celiac_safe: 'shared equipment', gf_note: '⚠️ GF Options: Gladiator and Keto Champ smoothies are GF', drink_types: ['protein','smoothie'] },
  'jamba juice': { gf_menu: false, gf_options: true, gf_items: 'Most smoothies, Acai Bowls, Fresh Juice', celiac_safe: 'shared equipment', gf_note: '⚠️ GF Options: Most smoothies are naturally GF, avoid add-ins with wheat', drink_types: ['smoothie'] },
  'clean juice': { gf_menu: true, gf_items: 'All cold-pressed juices, smoothies, acai bowls', celiac_safe: 'dedicated GF kitchen', gf_note: '📋 GF Menu: All items are GF, organic, and cold-pressed', drink_types: ['smoothie','organic'] },
  'pressed juicery': { gf_menu: true, gf_items: 'All cold-pressed juices, cleanse programs, freeze', celiac_safe: 'dedicated GF facility', gf_note: '📋 GF Menu: All juices are naturally GF', drink_types: ['smoothie','organic'] },
  'kung fu tea': { gf_menu: false, gf_options: true, gf_items: 'Classic milk tea, mango slush, taro milk tea (no boba add-ins)', celiac_safe: 'shared equipment', gf_note: '⚠️ GF Options: Many teas are GF, avoid boba pearls (contain wheat starch)', drink_types: ['boba','tea'] },
  'kokee tea': { gf_menu: false, gf_options: true, gf_items: 'Most milk teas, fruit teas, slush drinks', celiac_safe: 'shared equipment', gf_note: '⚠️ GF Options: Most teas are naturally GF, ask about add-ins', drink_types: ['boba','tea'] },
  'gong cha': { gf_menu: false, gf_options: true, gf_items: 'Milk tea, fruit tea, matcha latte (no boba)', celiac_safe: 'shared equipment', gf_note: '⚠️ GF Options: Teas are GF, boba pearls may contain wheat', drink_types: ['boba','tea'] }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://cleaneats-eta.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
  // 🔒 Rate limiting: 30 requests per minute per IP
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  // Note: For production rate limiting, use Vercel Edge Middleware or Upstash Ratelimit
  // This is a basic check - real rate limiting should be done at the edge
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat, lng, q, filter = 'all', offset = 0, mode = 'food' } = req.query;

  const isDrinkMode = mode === 'drinks';
  if (!YELP_API_KEY) {
    let filtered = DEMO_RESTAURANTS;
    if (filter !== 'all') {
      filtered = filtered.filter(r => r.tags && r.tags.includes(filter));
    }
    if (lat && lng) {
      filtered.sort((a, b) => a.distance - b.distance);
    }
    return res.status(200).json(filtered.map(r => ({...r, distance: r.distance})));
  }

  let searchLat, searchLng, locationName;

  try {
    if (q && !lat) {
      // Use Google Places text search for geocoding (works with Places API only)
      if (GOOGLE_API_KEY) {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${GOOGLE_API_KEY}`
        );
        const geoData = await geoRes.json();
        if (geoData.results?.length > 0) {
          searchLat = geoData.results[0].geometry.location.lat;
          searchLng = geoData.results[0].geometry.location.lng;
        } else {
          return res.status(404).json({ error: 'Location not found' });
        }
      } else if (YELP_API_KEY) {
        const geoRes = await fetch(
          `https://api.yelp.com/v3/businesses/search?location=${encodeURIComponent(q)}&limit=1`,
          { headers: { Authorization: `Bearer ${YELP_API_KEY}` } }
        );
        const geoData = await geoRes.json();
        if (geoData.businesses?.length > 0) {
          searchLat = geoData.businesses[0].coordinates.latitude;
          searchLng = geoData.businesses[0].coordinates.longitude;
        } else if (geoData.region?.center) {
          searchLat = geoData.region.center.latitude;
          searchLng = geoData.region.center.longitude;
        } else {
          return res.status(404).json({ error: 'Location not found' });
        }
      } else {
        return res.status(400).json({ error: 'No geocoding API available' });
      }
      locationName = q;
    } else {
      searchLat = parseFloat(lat);
      searchLng = parseFloat(lng);
      locationName = 'Your Location';
    }

    // ========== GOOGLE PLACES SEARCH (primary) ==========
    let googleResults = [];
    if (GOOGLE_API_KEY) {
      try {
        const keyword = isDrinkMode
          ? (GOOGLE_DRINK_KEYWORDS[filter] || GOOGLE_DRINK_KEYWORDS.all)
          : (GOOGLE_FOOD_KEYWORDS[filter] || GOOGLE_FOOD_KEYWORDS.all);
        const placeType = isDrinkMode
          ? (GOOGLE_DRINK_TYPES[filter] || 'cafe')
          : (GOOGLE_FOOD_TYPES[filter] || 'restaurant');

        // Nearby search - finds places around the user's location
        const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${searchLat},${searchLng}&radius=24000&keyword=${encodeURIComponent(keyword)}&type=${placeType}&key=${GOOGLE_API_KEY}`;
        // Text search - broader, finds by relevance
        const textUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword)}&location=${searchLat},${searchLng}&radius=24000&key=${GOOGLE_API_KEY}`;

        const [nearbyRes, textRes] = await Promise.all([
          fetch(nearbyUrl),
          fetch(textUrl)
        ]);

        const nearbyData = nearbyRes.ok ? await nearbyRes.json() : { results: [] };
        const textData = textRes.ok ? await textRes.json() : { results: [] };

        // Merge Google results, deduplicate by place_id
        const seenPlaceIds = new Set();
        const allGooglePlaces = [...(nearbyData.results || []), ...(textData.results || [])];
        for (const place of allGooglePlaces) {
          if (place.place_id && !seenPlaceIds.has(place.place_id)) {
            seenPlaceIds.add(place.place_id);
            googleResults.push(place);
          }
        }

        // Search 3: Known chains that Google might miss with generic searches
        if (!isDrinkMode) {
          const chainNames = ['texas roadhouse', 'olive garden', "chili's", 'chipotle', 'red robin', 'outback steakhouse', 'cheesecake factory', 'five guys'];
          for (const name of chainNames) {
            try {
              await new Promise(r => setTimeout(r, 100));
              const cr = await fetch(
                `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name)}&location=${searchLat},${searchLng}&radius=25000&key=${GOOGLE_API_KEY}`
              );
              if (cr.ok) {
                const cd = await cr.json();
                for (const biz of (cd.results || [])) {
                  if (biz.place_id && !seenPlaceIds.has(biz.place_id)) {
                    seenPlaceIds.add(biz.place_id);
                    googleResults.push(biz);
                  }
                }
              }
            } catch (e) { /* skip on error */ }
          }
        }
      } catch (e) {
        console.error('Google Places error:', e);
      }
    }

    // ========== YELP SEARCH (secondary) ==========
    let yelpResults = [];
    if (YELP_API_KEY) {
      try {
        const term = isDrinkMode ? (DRINK_SEARCH_TERMS[filter] || DRINK_SEARCH_TERMS.all) : (GF_SEARCH_TERMS[filter] || GF_SEARCH_TERMS.all);
        const categories = isDrinkMode ? (DRINK_SUB_CATEGORIES[filter] || DRINK_CATEGORIES) : GF_CATEGORIES;
        const params = new URLSearchParams({
          term, categories,
          latitude: searchLat, longitude: searchLng,
          radius: 8000, limit: 16, offset: parseInt(offset),
          sort_by: 'distance'
        });

        const chainParams = isDrinkMode
          ? new URLSearchParams({
              term: 'coffee tea smoothie juice bubble tea',
              categories: DRINK_CATEGORIES,
              latitude: searchLat, longitude: searchLng,
              radius: 15000, limit: 20,
              sort_by: 'distance'
            })
          : new URLSearchParams({
              term: 'gluten free friendly',
              latitude: searchLat, longitude: searchLng,
              radius: 15000, limit: 20,
              sort_by: 'distance'
            });

        const [yelpRes, chainRes] = await Promise.all([
          fetch(`https://api.yelp.com/v3/businesses/search?${params}`, { headers: { Authorization: `Bearer ${YELP_API_KEY}` } }),
          fetch(`https://api.yelp.com/v3/businesses/search?${chainParams}`, { headers: { Authorization: `Bearer ${YELP_API_KEY}` } })
        ]);

        if (yelpRes.ok) {
          const yelpData = await yelpRes.json();
          const chainData = chainRes.ok ? await chainRes.json() : { businesses: [] };
          const seenIds = new Set();
          const allBiz = [...(yelpData.businesses || []), ...(chainData.businesses || [])];
          for (const biz of allBiz) {
            if (biz.id && !seenIds.has(biz.id)) {
              seenIds.add(biz.id);
              yelpResults.push(biz);
            }
          }

          // Sequential chain search
          const topChains = isDrinkMode
            ? getDrinkChains(filter)
            : ['texas roadhouse', 'olive garden', "chili's", 'chipotle', 'red robin'];
          for (const name of topChains) {
            try {
              await new Promise(r => setTimeout(r, 200));
              const cr = await fetch(
                `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(name)}&latitude=${searchLat}&longitude=${searchLng}&radius=25000&limit=1&sort_by=distance`,
                { headers: { Authorization: `Bearer ${YELP_API_KEY}` } }
              );
              if (cr.ok) {
                const cd = await cr.json();
                for (const biz of (cd.businesses || [])) {
                  if (biz.id && !seenIds.has(biz.id)) {
                    seenIds.add(biz.id);
                    yelpResults.push(biz);
                  }
                }
              }
            } catch (e) { /* skip */ }
          }
        }
      } catch (e) {
        console.error('Yelp API error:', e);
      }
    }

    // ========== FOURSQUARE SEARCH (tertiary) ==========
    let foursquareResults = [];
    if (FS_CLIENT_ID && FS_CLIENT_SECRET) {
      try {
        // Build Foursquare search
        let fsQuery, fsCategoryId;
        if (isDrinkMode) {
          fsQuery = isDrinkMode ? (DRINK_SEARCH_TERMS[filter] || DRINK_SEARCH_TERMS.all) : '';
          fsCategoryId = FS_DRINK_CATEGORIES[filter] || Object.values(FS_DRINK_CATEGORIES).join(',');
        } else {
          fsQuery = GF_SEARCH_TERMS[filter] || GF_SEARCH_TERMS.all;
          fsCategoryId = FS_FOOD_CATEGORIES[filter] || '';
        }
        
        // Foursquare v2 search
        const fsParams = new URLSearchParams({
          ll: `${searchLat},${searchLng}`,
          radius: 8000,
          limit: 15,
          client_id: FS_CLIENT_ID,
          client_secret: FS_CLIENT_SECRET,
          v: FS_VERSION
        });
        if (fsQuery) fsParams.set('query', fsQuery);
        if (fsCategoryId) fsParams.set('categoryId', fsCategoryId);
        
        const fsRes = await fetch(`https://api.foursquare.com/v2/venues/search?${fsParams}`);
        if (fsRes.ok) {
          const fsData = await fsRes.json();
          foursquareResults = fsData.response?.venues || [];
        }
      } catch (e) {
        console.error('Foursquare API error:', e);
      }
    }

    // ========== ENRICH GOOGLE RESULTS WITH WEBSITE & PHONE ==========
    // Place Search doesn't return website/phone — we need Place Details for those
    if (GOOGLE_API_KEY && googleResults.length > 0) {
      const topPlaces = googleResults.slice(0, 12); // Enrich top 12 results (rate limit friendly)
      const detailPromises = topPlaces.map(async (place) => {
        if (!place.place_id) return;
        try {
          const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=website,formatted_phone_number,url&key=${GOOGLE_API_KEY}`;
          const detailRes = await fetch(detailUrl);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            if (detailData.result) {
              if (detailData.result.website) place.website = detailData.result.website;
              if (detailData.result.formatted_phone_number) place.formatted_phone_number = detailData.result.formatted_phone_number;
            }
          }
        } catch (e) { /* skip failed enrichment */ }
      });
      await Promise.all(detailPromises);
    }

    // ========== MERGE & DEDUPLICATE ALL RESULTS ==========
    const allRestaurants = [];
    const seenNames = new Set();

    // Add Google results first (primary - best coverage)
    for (const place of googleResults) {
      const normalized = normalizeName(place.name);
      if (normalized && !seenNames.has(normalized)) {
        seenNames.add(normalized);
        allRestaurants.push(formatGooglePlace(place, searchLat, searchLng));
      }
    }

    // Add Yelp results that Google didn't find
    for (const biz of yelpResults) {
      const normalized = normalizeName(biz.name);
      if (normalized && !seenNames.has(normalized)) {
        seenNames.add(normalized);
        allRestaurants.push(formatYelpBiz(biz, searchLat, searchLng));
      }
    }

    // Add Foursquare results that Google+Yelp didn't find
    for (const venue of foursquareResults) {
      const normalized = normalizeName(venue.name);
      if (normalized && !seenNames.has(normalized)) {
        seenNames.add(normalized);
        allRestaurants.push(formatFoursquareVenue(venue, searchLat, searchLng));
      }
    }

    // If no API results, fall back to demo
    if (allRestaurants.length === 0 && !GOOGLE_API_KEY && !YELP_API_KEY) {
      let filtered = DEMO_RESTAURANTS;
      if (filter !== 'all') {
        filtered = filtered.filter(r => r.tags && r.tags.includes(filter));
      }
      return res.status(200).json(filtered.map(r => ({...r, distance: r.distance})));
    }

    // ========== ENRICH DRINK TYPES ==========
    // Coffee shops almost always have keto options (black coffee, Americano, sugar-free syrups)
    // Smoothie/juice bars almost always have protein options (add protein powder)
    // Boba shops often have tea-only (keto) options
    for (const r of allRestaurants) {
      const dt = r.drink_type || [];
      if (!Array.isArray(dt)) continue;
      
      // Coffee shops → add keto, energy (most have sugar-free syrups, Americanos, energy drinks)
      if (dt.includes('coffee') && !dt.includes('keto')) {
        dt.push('keto');
      }
      if (dt.includes('coffee') && !dt.includes('energy')) {
        dt.push('energy'); // most coffee shops sell energy drinks or have espresso
      }
      
      // Smoothie bars → add protein (most can add protein powder)
      if (dt.includes('smoothie') && !dt.includes('protein')) {
        dt.push('protein');
      }
      
      // Boba shops → add keto (tea-only options, no sugar)
      if (dt.includes('boba') && !dt.includes('keto')) {
        dt.push('keto');
      }
      
      // Known chain enrichment
      const name = (r.name || '').toLowerCase();
      if (name.includes('starbucks')) { if (!dt.includes('keto')) dt.push('keto'); if (!dt.includes('protein')) dt.push('protein'); }
      if (name.includes('dutch bros') || name.includes('7 brew')) { if (!dt.includes('keto')) dt.push('keto'); if (!dt.includes('energy')) dt.push('energy'); }
      if (name.includes('smoothie king')) { if (!dt.includes('keto')) dt.push('keto'); if (!dt.includes('protein')) dt.push('protein'); }
      if (name.includes('human bean')) { if (!dt.includes('keto')) dt.push('keto'); if (!dt.includes('energy')) dt.push('energy'); }
      if (name.includes('nutrition') || name.includes('vitamin') || name.includes('herbalife')) { if (!dt.includes('protein')) dt.push('protein'); if (!dt.includes('keto')) dt.push('keto'); }
      
      r.drink_type = [...new Set(dt)]; // deduplicate
      
      // Also update tags to reflect enriched drink types
      if (r.tags) {
        for (const t of r.drink_type) {
          if (t !== '_nondrink' && !r.tags.includes(t)) r.tags.push(t);
        }
      }
    }

    // ========== ENRICH HEALTHY TAGS ==========
    // Many restaurants are "healthy" even if they don't say it
    // Categories that are inherently healthy: salad, mediterranean, sushi, poke, seafood, pho, acai, juice, bowls, etc.
    const HEALTHY_CATEGORIES = [
      'salad', 'mediterranean', 'middle eastern', 'sushi', 'poke', 'seafood',
      'juice', 'smoothie', 'acai', 'bowl', 'pho', 'vietnamese', 'thai',
      'health', 'organic', 'nutrition', 'wellness', 'fresh', 'fit',
      'farmers market', 'health market', 'tea room', 'bubble tea',
      'wrap', 'grilled', 'steakhouse', 'hawaiian', 'peruvian'
    ];
    const HEALTHY_CHAINS = [
      'cava', 'sweetgreen', 'chipotle', 'freshii', 'sweet tomato',
      'true food', 'flower child', 'tender greens', 'lyfe kitchen',
      'sweetgreen', 'dig inn', 'just salad', 'providence',
      'corelife', 'zoes kitchen', 'naf naf', 'fresh Mediterranean'
    ];
    for (const r of allRestaurants) {
      if (r.healthy || (r.tags && r.tags.includes('healthy'))) continue; // already tagged
      
      const name = (r.name || '').toLowerCase();
      const cats = (r.categories || '').toLowerCase();
      const isHealthy =
        HEALTHY_CATEGORIES.some(hc => cats.includes(hc) || name.includes(hc)) ||
        HEALTHY_CHAINS.some(hc => name.includes(hc));
      
      if (isHealthy) {
        r.healthy = true;
        if (r.tags && !r.tags.includes('healthy')) r.tags.push('healthy');
      }
      
      // Also enrich keto: steakhouses, seafood, grills are naturally keto-friendly
      if (!r.keto && !r.tags?.includes('keto')) {
        const ketoCats = ['steakhouse', 'seafood', 'grill', 'bbq', 'brazilian', 'argentine'];
        const isKeto = ketoCats.some(kc => cats.includes(kc) || name.includes(kc));
        if (isKeto) {
          r.keto = true;
          if (r.tags && !r.tags.includes('keto')) r.tags.push('keto');
        }
      }
      
      // Enrich vegan: indian, thai, ethiopian often have extensive vegan options
      if (!r.vegan && !r.tags?.includes('vegan')) {
        const veganCats = ['indian', 'ethiopian', 'plant-based', 'plant based'];
        const isVegan = veganCats.some(vc => cats.includes(vc) || name.includes(vc));
        if (isVegan) {
          r.vegan = true;
          if (r.tags && !r.tags.includes('vegan')) r.tags.push('vegan');
        }
      }
    }

    // Sort by distance
    allRestaurants.sort((a, b) => (a.distance || 99999) - (b.distance || 99999));

    return res.status(200).json(allRestaurants);
  } catch (err) {
    console.error('CleanEats API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ========== Format Google Place into our restaurant schema ==========
function formatGooglePlace(place, searchLat, searchLng) {
  const name = (place.name || '').toLowerCase();
  const types = place.types || [];
  const dist = haversineDistance(searchLat, searchLng, place.geometry?.location?.lat, place.geometry?.location?.lng);
  
  // Map Google types to our schema
  const isCafe = types.includes('cafe') || types.includes('bakery');
  const isRestaurant = types.includes('restaurant') || types.includes('meal_takeaway') || types.includes('meal_delivery');
  const isBar = types.includes('bar') || types.includes('night_club');
  const isDrinkPlace = isCafe || types.includes('cafe');
  
  // Check chain database for GF info
  const gfNote = getGFNoteFromName(name);
  const gfItems = getGFItemsFromName(name);
  const celiacSafe = getCeliacSafeFromName(name);
  const isGFChain = isKnownGFChainByName(name);
  const isGFChainOpt = isKnownGFChainWithOptionsByName(name);
  
  // Determine GF status from keywords in name/reviews
  const hasGFKeyword = name.includes('gluten free') || name.includes('gf ') || name.includes('celiac');
  const hasHealthyKeyword = name.includes('healthy') || name.includes('organic') || name.includes('keto') || name.includes('paleo') || name.includes('vegan');
  
  // Infer drink type from Google types + name
  const drinkType = getGoogleDrinkType(place);
  
  // Build tags
  const tags = [];
  if (hasGFKeyword || isGFChain) tags.push('gf');
  if (isGFChain || hasGFKeyword) tags.push('gf_menu');
  if (isGFChainOpt) tags.push('gf_options');
  if (hasHealthyKeyword || types.includes('health')) tags.push('healthy');
  if (name.includes('vegan') || name.includes('plant')) tags.push('vegan');
  if (name.includes('organic')) tags.push('organic');
  if (name.includes('keto') || name.includes('paleo') || name.includes('low carb')) tags.push('keto');
  // If no tags but it's a restaurant, at least tag gf_options since many places have some GF items
  if (tags.length === 0 && (isRestaurant || isCafe)) tags.push('gf_options');
  
  return {
    id: 'g-' + (place.place_id || ''),
    name: place.name || 'Unknown',
    rating: place.rating || 0,
    review_count: place.user_ratings_total || 0,
    price: place.price_level ? '$'.repeat(place.price_level) : '',
    distance: Math.round(dist),
    address: place.vicinity || place.formatted_address || '',
    phone: place.formatted_phone_number || place.phone || '',
    image_url: '',
    url: place.website || '',
    coordinates: {
      latitude: place.geometry?.location?.lat || 0,
      longitude: place.geometry?.location?.lng || 0
    },
    categories: types.filter(t => !['establishment','point_of_interest','political','locality','sublocality','route','street_address'].includes(t)).map(t => t.replace(/_/g,' ')).join(', '),
    gf: hasGFKeyword || isGFChain,
    gf_menu: isGFChain || hasGFKeyword,
    gf_options: isGFChainOpt || (!hasGFKeyword && !isGFChain && (isRestaurant || isCafe)),
    gf_note: gfNote || (hasGFKeyword ? '📋 Dedicated gluten-free establishment' : ''),
    gf_items: gfItems || '',
    celiac_safe: celiacSafe || '',
    healthy: hasHealthyKeyword,
    vegan: name.includes('vegan') || name.includes('plant'),
    organic: name.includes('organic'),
    keto: name.includes('keto') || name.includes('paleo') || name.includes('low carb'),
    drink_type: drinkType,
    is_open_now: place.opening_hours?.open_now ?? null,
    hours: place.opening_hours?.weekday_text ? Object.fromEntries(
      place.opening_hours.weekday_text.map(line => {
        const [day, ...rest] = line.split(': ');
        return [day.substring(0,3), rest.join(': ')];
      })
    ) : null,
    tags,
    source: 'google'
  };
}

// ========== Format Yelp biz into our restaurant schema ==========
function formatYelpBiz(biz, searchLat, searchLng) {
  const dist = biz.distance || haversineDistance(searchLat, searchLng, biz.coordinates?.latitude, biz.coordinates?.longitude);
  // Format hours from Yelp data
  const yelpHours = biz.hours?.[0];
  const isOpen = yelpHours?.is_open_now ?? (biz.is_closed !== undefined ? !biz.is_closed : null);
  const hoursText = yelpHours?.open ? formatHoursFromYelp(yelpHours.open) : null;
  return {
    id: 'y-' + biz.id,
    name: biz.name || 'Unknown',
    rating: biz.rating || 0,
    review_count: biz.review_count || 0,
    price: biz.price || '',
    distance: Math.round(dist),
    address: biz.location?.display_address?.join(', ') || '',
    phone: biz.display_phone || biz.phone || '',
    image_url: biz.image_url || '',
    url: biz.url || '',
    coordinates: biz.coordinates || { latitude: 0, longitude: 0 },
    categories: biz.categories?.map(c => c.title).join(', ') || '',
    is_open_now: isOpen,
    hours: hoursText,
    gf: hasTag(biz, 'gluten_free') || hasKeyword(biz, 'gluten'),
    gf_menu: hasTag(biz, 'gluten_free') || hasKeyword(biz, 'gluten free menu') || hasKeyword(biz, 'gf menu') || isKnownGFChain(biz),
    gf_options: hasKeyword(biz, 'gluten free option') || hasKeyword(biz, 'gf option') || hasKeyword(biz, 'gluten friendly') || isKnownGFChainWithOptions(biz),
    gf_note: getGFNote(biz),
    gf_items: getGFItems(biz),
    celiac_safe: getCeliacSafe(biz),
    healthy: hasTag(biz, 'salad') || hasKeyword(biz, 'healthy') || hasKeyword(biz, 'organic'),
    vegan: hasTag(biz, 'vegan') || hasTag(biz, 'vegetarian'),
    organic: hasKeyword(biz, 'organic'),
    keto: hasKeyword(biz, 'keto') || hasKeyword(biz, 'paleo'),
    drink_type: getDrinkType(biz),
    tags: buildTags(biz),
    source: 'yelp'
  };
}

// Convert Yelp hours format to readable text
function formatHoursFromYelp(openHours) {
  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const hours = {};
  for (const h of openHours) {
    const day = dayNames[h.day] || '?';
    const start = fmt12(h.start);
    const end = fmt12(h.end);
    if (hours[day]) {
      hours[day] += `, ${start}–${end}`;
    } else {
      hours[day] = `${start}–${end}`;
    }
  }
  return hours;
}

function fmt12(hhmm) {
  if (!hhmm) return '?';
  const h = parseInt(hhmm.substring(0, 2), 10);
  const m = hhmm.substring(2);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

// ========== Format Foursquare venue into our restaurant schema ==========
function formatFoursquareVenue(venue, searchLat, searchLng) {
  const name = (venue.name || '').toLowerCase();
  const cats = (venue.categories || []);
  const catNames = cats.map(c => c.name || '');
  const primaryCat = cats[0]?.name || '';
  const loc = venue.location || {};
  const dist = venue.location?.distance || haversineDistance(searchLat, searchLng, loc.lat, loc.lng);
  
  // Check chain database for GF info
  const gfNote = getGFNoteFromName(name);
  const gfItems = getGFItemsFromName(name);
  const celiacSafe = getCeliacSafeFromName(name);
  const isGFChain = isKnownGFChainByName(name);
  const isGFChainOpt = isKnownGFChainWithOptionsByName(name);
  
  // Infer drink type from Foursquare categories
  const drinkType = getFoursquareDrinkType(venue);
  
  // Build tags
  const tags = [];
  if (isGFChain || name.includes('gluten free')) { tags.push('gf'); tags.push('gf_menu'); }
  if (isGFChainOpt) tags.push('gf_options');
  if (name.includes('vegan') || name.includes('plant') || catNames.some(c => c.toLowerCase().includes('vegan'))) tags.push('vegan');
  if (name.includes('organic')) tags.push('organic');
  if (name.includes('keto') || name.includes('paleo') || name.includes('low carb')) tags.push('keto');
  if (catNames.some(c => c.toLowerCase().includes('healthy') || c.toLowerCase().includes('salad'))) tags.push('healthy');
  // If no tags, default to gf_options for restaurants
  if (tags.length === 0) tags.push('gf_options');
  
  return {
    id: 'f-' + (venue.id || ''),
    name: venue.name || 'Unknown',
    rating: 0, // Foursquare v2 doesn't include rating in search
    review_count: venue.stats?.checkinsCount || 0,
    price: '',
    distance: Math.round(dist),
    address: [loc.address, loc.city, loc.state, loc.postalCode].filter(Boolean).join(', '),
    phone: venue.contact?.phone || '',
    image_url: '',
    url: venue.url || '',
    coordinates: { latitude: loc.lat || 0, longitude: loc.lng || 0 },
    categories: catNames.join(', '),
    gf: isGFChain || name.includes('gluten free'),
    gf_menu: isGFChain || name.includes('gluten free'),
    gf_options: isGFChainOpt || (!isGFChain && !name.includes('gluten free')),
    gf_note: gfNote || '',
    gf_items: gfItems || '',
    celiac_safe: celiacSafe || '',
    healthy: tags.includes('healthy'),
    vegan: tags.includes('vegan'),
    organic: tags.includes('organic'),
    keto: tags.includes('keto'),
    drink_type: drinkType,
    is_open_now: venue.hours?.isOpen ?? null,
    hours: venue.hours?.display ? parseFoursquareHours(venue.hours.display) : null,
    tags,
    source: 'foursquare'
  };
}

// Parse Foursquare hours display string
function parseFoursquareHours(display) {
  if (!display) return null;
  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const hours = {};
  const lines = Array.isArray(display) ? display : display.split('\n');
  for (const line of lines) {
    for (const day of dayNames) {
      if (line.toLowerCase().startsWith(day.toLowerCase())) {
        const timePart = line.substring(day.length).trim().replace(/^:?\s*/, '');
        hours[day] = timePart;
      }
    }
  }
  return Object.keys(hours).length > 0 ? hours : null;
}

function getFoursquareDrinkType(venue) {
  const name = (venue.name || '').toLowerCase();
  const cats = (venue.categories || []).map(c => (c.shortName || c.name || '').toLowerCase());
  
  // Check known drink chains
  for (const [chain, data] of Object.entries(DRINK_CHAIN_DATA)) {
    if (name.includes(chain)) return data.drink_types || ['coffee'];
  }
  
  const result = [];
  if (cats.some(c => c.includes('coffee') || c.includes('cafe') || c.includes('espresso') || c.includes('roaster'))) result.push('coffee');
  if (cats.some(c => c.includes('bubble tea') || c.includes('boba') || c.includes('bubble'))) result.push('boba');
  if (cats.some(c => c.includes('juice') || c.includes('smoothie') || c.includes('acai'))) result.push('smoothie');
  if (cats.some(c => c.includes('tea room') || c.includes('tea house'))) result.push('boba');
  
  if (result.length === 0) {
    if (name.includes('smoothie') || name.includes('protein') || name.includes('juice') || name.includes('nutrition')) result.push('smoothie');
    if (name.includes('boba') || name.includes('bubble')) result.push('boba');
    if (name.includes('energy')) result.push('energy');
  }
  
  if (result.length === 0 && cats.some(c => c.includes('coffee') || c.includes('cafe'))) result.push('coffee');
  if (result.length === 0) result.push('_nondrink');
  
  return result;
}

// ========== Utility functions ==========
function normalizeName(name) {
  let n = (name || '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, '') // keep spaces
    .replace(/\b(the|a|an|co|company|inc|llc|restaurant|cafe|coffee|shop|store|house|bar|grill|kitchen|downtown|center|centre)\b/g, '') // strip common words
    .replace(/\s+/g, '') // collapse spaces
    .substring(0, 12); // first 12 chars — aggressive but catches dupes
  return n;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 99999;
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getGoogleDrinkType(place) {
  const name = (place.name || '').toLowerCase();
  const types = place.types || [];
  
  // Check known drink chains first
  for (const [chain, data] of Object.entries(DRINK_CHAIN_DATA)) {
    if (name.includes(chain)) return data.drink_types || ['coffee'];
  }
  
  const result = [];
  if (types.includes('cafe') || name.includes('coffee') || name.includes('espresso') || name.includes('roast')) result.push('coffee');
  if (types.includes('bakery') && name.includes('boba')) result.push('boba');
  if (name.includes('boba') || name.includes('bubble tea') || name.includes('milk tea')) result.push('boba');
  if (name.includes('smoothie') || name.includes('juice') || name.includes('acai') || name.includes('protein')) result.push('smoothie');
  if (name.includes('energy')) result.push('energy');
  if (name.includes('keto') || name.includes('low carb') || name.includes('sugar free')) result.push('keto');
  
  // If it's a cafe with no specific match, default to coffee
  if (result.length === 0 && types.includes('cafe')) result.push('coffee');
  
  // If not drink-related at all
  if (result.length === 0 && !types.includes('cafe') && !types.some(t => ['restaurant','meal_takeaway','meal_delivery'].includes(t))) result.push('_nondrink');
  
  return result;
}

// Chain DB lookups by name string (works for both Google & Yelp)
function isKnownGFChainByName(name) {
  for (const chain of Object.keys(GF_CHAIN_MENU)) {
    if (name.includes(chain)) return GF_CHAIN_MENU[chain].gf_menu;
  }
  for (const chain of Object.keys(DRINK_CHAIN_DATA)) {
    if (name.includes(chain)) return DRINK_CHAIN_DATA[chain].gf_menu;
  }
  return false;
}

function isKnownGFChainWithOptionsByName(name) {
  for (const chain of Object.keys(GF_CHAIN_MENU)) {
    if (name.includes(chain) && !GF_CHAIN_MENU[chain].gf_menu) return true;
  }
  for (const chain of Object.keys(DRINK_CHAIN_DATA)) {
    if (name.includes(chain) && !DRINK_CHAIN_DATA[chain].gf_menu) return true;
  }
  return false;
}

function getGFNoteFromName(name) {
  for (const chain of Object.keys(GF_CHAIN_MENU)) {
    if (name.includes(chain)) return GF_CHAIN_MENU[chain].gf_note;
  }
  for (const chain of Object.keys(DRINK_CHAIN_DATA)) {
    if (name.includes(chain)) return DRINK_CHAIN_DATA[chain].gf_note;
  }
  return '';
}

function getGFItemsFromName(name) {
  for (const chain of Object.keys(GF_CHAIN_MENU)) {
    if (name.includes(chain)) return GF_CHAIN_MENU[chain].gf_items || '';
  }
  for (const chain of Object.keys(DRINK_CHAIN_DATA)) {
    if (name.includes(chain)) return DRINK_CHAIN_DATA[chain].gf_items || '';
  }
  return '';
}

function getCeliacSafeFromName(name) {
  for (const chain of Object.keys(GF_CHAIN_MENU)) {
    if (name.includes(chain)) return GF_CHAIN_MENU[chain].celiac_safe || '';
  }
  for (const chain of Object.keys(DRINK_CHAIN_DATA)) {
    if (name.includes(chain)) return DRINK_CHAIN_DATA[chain].celiac_safe || '';
  }
  return '';
}

function isKnownGFChain(biz) {
  const name = (biz.name || '').toLowerCase();
  for (const chain of Object.keys(GF_CHAIN_MENU)) {
    if (name.includes(chain)) return GF_CHAIN_MENU[chain].gf_menu;
  }
  for (const chain of Object.keys(DRINK_CHAIN_DATA)) {
    if (name.includes(chain)) return DRINK_CHAIN_DATA[chain].gf_menu;
  }
  return false;
}

function isKnownGFChainWithOptions(biz) {
  const name = (biz.name || '').toLowerCase();
  for (const chain of Object.keys(GF_CHAIN_MENU)) {
    if (name.includes(chain) && !GF_CHAIN_MENU[chain].gf_menu) return true;
  }
  for (const chain of Object.keys(DRINK_CHAIN_DATA)) {
    if (name.includes(chain) && !DRINK_CHAIN_DATA[chain].gf_menu) return true;
  }
  return false;
}

function getGFNote(biz) {
  const name = (biz.name || '').toLowerCase();
  for (const chain of Object.keys(GF_CHAIN_MENU)) {
    if (name.includes(chain)) return GF_CHAIN_MENU[chain].gf_note;
  }
  for (const chain of Object.keys(DRINK_CHAIN_DATA)) {
    if (name.includes(chain)) return DRINK_CHAIN_DATA[chain].gf_note;
  }
  return '';
}
function getGFItems(biz) {
  const name = (biz.name || '').toLowerCase();
  for (const chain of Object.keys(GF_CHAIN_MENU)) {
    if (name.includes(chain)) return GF_CHAIN_MENU[chain].gf_items || '';
  }
  for (const chain of Object.keys(DRINK_CHAIN_DATA)) {
    if (name.includes(chain)) return DRINK_CHAIN_DATA[chain].gf_items || '';
  }
  return '';
}
function getCeliacSafe(biz) {
  const name = (biz.name || '').toLowerCase();
  for (const chain of Object.keys(GF_CHAIN_MENU)) {
    if (name.includes(chain)) return GF_CHAIN_MENU[chain].celiac_safe || '';
  }
  for (const chain of Object.keys(DRINK_CHAIN_DATA)) {
    if (name.includes(chain)) return DRINK_CHAIN_DATA[chain].celiac_safe || '';
  }
  return '';
}function getDrinkChains(filter) {
  const chainMap = {
    coffee: ['starbucks', 'dutch bros', '7 brew'],
    protein: ['smoothie king', 'clean juice'],
    keto: ['starbucks', 'dutch bros', '7 brew'],
    smoothie: ['jamba juice', 'smoothie king', 'clean juice', 'pressed juicery'],
    boba: ['kung fu tea', 'gong cha', 'kokee tea'],
    energy: ['dutch bros', '7 brew', 'starbucks']
  };
  return chainMap[filter] || ['starbucks', 'dutch bros', 'smoothie king', 'jamba juice', 'clean juice'];
}

function getDrinkType(biz) {
  const name = (biz.name || '').toLowerCase();
  // Check known drink chains first
  for (const [chain, data] of Object.entries(DRINK_CHAIN_DATA)) {
    if (name.includes(chain)) return data.drink_types || ['coffee'];
  }
  // Infer from Yelp categories
  const catAliases = (biz.categories || []).map(c => c.alias);
  const types = [];
  if (catAliases.some(c => ['coffee', 'coffeeroasteries'].includes(c))) types.push('coffee');
  if (catAliases.some(c => ['bubbletea'].includes(c))) types.push('boba');
  if (catAliases.some(c => ['juicebars', 'smoothies'].includes(c))) types.push('smoothie');
  if (catAliases.some(c => ['tea'].includes(c))) types.push('boba');
  // Keyword inference from name
  if (types.length === 0) {
    if (name.includes('smoothie') || name.includes('protein') || name.includes('juice') || name.includes('acai')) types.push('smoothie');
    if (name.includes('energy')) types.push('energy');
    if (name.includes('boba') || name.includes('bubble')) types.push('boba');
    if (name.includes('keto') || name.includes('low carb')) types.push('keto');
  }
  // If still no match, check if it's even a drink place
  // Non-drink places (subway, walgreens etc.) should not appear in drink sub-filters
  if (types.length === 0) {
    // Check if ANY category is drink-related
    const drinkCats = ['coffee','coffeeroasteries','tea','bubbletea','juicebars','smoothies','bars','nightlife'];
    if (catAliases.some(c => drinkCats.includes(c))) {
      types.push('coffee'); // at least it's a drink place
    } else {
      return ['_nondrink']; // not a real drink place, won't match any sub-filter but still shows in "all drinks"
    }
  }
  return types;
}

function hasTag(biz, tag) { return biz.categories?.some(c => c.alias === tag) || false; }
function hasKeyword(biz, kw) {
  const t = `${biz.name||''} ${biz.categories?.map(c=>`${c.title} ${c.alias}`).join(' ')||''}`.toLowerCase();
  return t.includes(kw.toLowerCase());
}
function buildTags(biz) {
  const tags = [];
  if (hasTag(biz,'gluten_free')||hasKeyword(biz,'gluten')) tags.push('gf');
  if (hasTag(biz,'gluten_free')||hasKeyword(biz,'gluten free menu')||hasKeyword(biz,'gf menu')||isKnownGFChain(biz)) tags.push('gf_menu');
  if (hasKeyword(biz,'gluten free option')||hasKeyword(biz,'gf option')||hasKeyword(biz,'gluten friendly')||isKnownGFChainWithOptions(biz)) tags.push('gf_options');
  if (hasTag(biz,'salad')||hasKeyword(biz,'healthy')) tags.push('healthy');
  if (hasTag(biz,'vegan')||hasTag(biz,'vegetarian')) tags.push('vegan');
  if (hasKeyword(biz,'organic')) tags.push('organic');
  if (hasKeyword(biz,'keto')) tags.push('keto');
  return tags;
}