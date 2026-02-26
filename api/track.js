import { neon } from '@neondatabase/serverless';

function getSQL() {
  return neon(process.env.DATABASE_URL);
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!event || !event.event) {
      return res.status(400).json({ error: 'Invalid event data' });
    }

    const sql = getSQL();
    const now = new Date();

    // IP ve konum bilgisi (Vercel headers)
    const ip = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown')
      .split(',')[0].trim();
    const country = req.headers['x-vercel-ip-country'] || 'unknown';
    const city = decodeURIComponent(req.headers['x-vercel-ip-city'] || 'unknown');

    // Eventi veritabanına kaydet
    await sql`
      INSERT INTO events (
        event_name, visitor_id, session_id, session_duration,
        ip, country, city, url, referrer,
        screen_width, screen_height, language, platform,
        score, mode, day_number, extra_data, created_at
      ) VALUES (
        ${event.event},
        ${event.visitorId || null},
        ${event.sessionId || null},
        ${event.sessionDuration || 0},
        ${ip},
        ${country},
        ${city},
        ${event.url || '/'},
        ${event.referrer || ''},
        ${event.screenWidth || 0},
        ${event.screenHeight || 0},
        ${event.language || 'tr'},
        ${event.platform || 'unknown'},
        ${event.score !== undefined ? event.score : null},
        ${event.mode || null},
        ${event.dayNumber !== undefined ? event.dayNumber : null},
        ${JSON.stringify(stripKnownFields(event))},
        ${now.toISOString()}
      )
    `;

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Analytics track error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Bilinen alanları çıkarıp sadece ek veriyi sakla
function stripKnownFields(event) {
  const known = [
    'event', 'visitorId', 'sessionId', 'sessionDuration', 'timestamp',
    'url', 'referrer', 'screenWidth', 'screenHeight', 'language',
    'platform', 'score', 'mode', 'dayNumber'
  ];
  const extra = {};
  for (const [key, value] of Object.entries(event)) {
    if (!known.includes(key)) {
      extra[key] = value;
    }
  }
  return extra;
}
