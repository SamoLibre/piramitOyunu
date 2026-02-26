import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

function getSQL() {
  return neon(process.env.DATABASE_URL);
}

// Bilinen alanları çıkarıp sadece ek veriyi sakla
function stripKnownFields(event) {
  const known = [
    'event', 'visitorId', 'sessionId', 'sessionDuration', 'timestamp',
    'url', 'referrer', 'screenWidth', 'screenHeight', 'language',
    'platform', 'score', 'mode', 'dayNumber',
  ];
  const extra = {};
  for (const [key, value] of Object.entries(event)) {
    if (!known.includes(key)) {
      extra[key] = value;
    }
  }
  return extra;
}

export async function POST(request) {
  try {
    const event = await request.json();

    if (!event || !event.event) {
      return NextResponse.json({ error: 'Invalid event data' }, { status: 400 });
    }

    const sql = getSQL();
    const now = new Date();

    // IP ve konum bilgisi (Vercel headers)
    const ip = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown')
      .split(',')[0].trim();
    const country = request.headers.get('x-vercel-ip-country') || 'unknown';
    const city = decodeURIComponent(request.headers.get('x-vercel-ip-city') || 'unknown');

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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
