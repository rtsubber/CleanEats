// CleanEats Hours Endpoint - Fetches detailed business hours from Yelp
const YELP_API_KEY = process.env.YELP_API_KEY || '';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing restaurant id' });
  }

  // Extract Yelp business ID from our composite ID (e.g., "y-abc123" -> "abc123")
  const yelpId = id.startsWith('y-') ? id.substring(2) : null;
  if (!yelpId || !YELP_API_KEY) {
    return res.status(200).json({ hours: null, is_open_now: null });
  }

  try {
    const yelpRes = await fetch(
      `https://api.yelp.com/v3/businesses/${encodeURIComponent(yelpId)}`,
      { headers: { Authorization: `Bearer ${YELP_API_KEY}` } }
    );

    if (!yelpRes.ok) {
      return res.status(200).json({ hours: null, is_open_now: null });
    }

    const data = await yelpRes.json();
    const yelpHours = data.hours?.[0];
    
    if (!yelpHours?.open) {
      return res.status(200).json({ 
        hours: null, 
        is_open_now: yelpHours?.is_open_now ?? null 
      });
    }

    // Format hours into day-by-day object (12h AM/PM format)
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = {};
    for (const h of yelpHours.open) {
      const day = dayNames[h.day] || '?';
      const start = fmt12(h.start);
      const end = fmt12(h.end);
      if (hours[day]) {
        hours[day] += `, ${start}–${end}`;
      } else {
        hours[day] = `${start}–${end}`;
      }
    }

    // Get today's hours for a quick summary
    const today = new Date().getDay();
    // JS getDay: 0=Sun, 1=Mon... Yelp: 0=Mon...6=Sun
    const todayYelp = today === 0 ? 6 : today - 1;
    const todayName = dayNames[todayYelp];
    const todayHours = hours[todayName] || null;

    // Determine open/closed status
    let isOpenNow = yelpHours.is_open_now ?? null;
    if (isOpenNow === null && todayHours) {
      isOpenNow = checkIfOpenNow(todayHours);
    }

    return res.status(200).json({
      hours,
      is_open_now: isOpenNow,
      today_hours: todayHours || 'No hours listed'
    });
  } catch (err) {
    console.error('Hours fetch error:', err);
    return res.status(200).json({ hours: null, is_open_now: null });
  }
}

// Check if a time range like "11:00–22:00" means currently open
function checkIfOpenNow(hoursStr) {
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Handle multiple time ranges "11:00–14:00, 17:00–22:00"
    const ranges = hoursStr.split(',').map(r => r.trim());
    for (const range of ranges) {
      const [startStr, endStr] = range.split('–').map(s => s.trim());
      const startMins = parseTime(startStr);
      const endMins = parseTime(endStr);
      if (startMins !== null && endMins !== null) {
        if (currentMinutes >= startMins && currentMinutes <= endMins) return true;
      }
    }
    return false;
  } catch {
    return null;
  }
}

function parseTime(str) {
  if (!str) return null;
  // Handle 12h format: "5:30 PM"
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1]);
    const m = parseInt(match12[2]);
    if (match12[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (match12[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  // Handle 24h format: "14:00" or "1730"
  const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) return parseInt(match24[1]) * 60 + parseInt(match24[2]);
  const matchHM = str.match(/^(\d{3,4})$/);
  if (matchHM) {
    const padded = str.padStart(4, '0');
    return parseInt(padded.substring(0, 2)) * 60 + parseInt(padded.substring(2));
  }
  return null;
}

function fmt12(hhmm) {
  if (!hhmm) return '?';
  const h = parseInt(hhmm.substring(0, 2), 10);
  const m = hhmm.substring(2);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}