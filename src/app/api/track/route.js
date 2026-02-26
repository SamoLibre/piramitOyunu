import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

function getSQL() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('DATABASE_URL tanımlı değil');
  }
  const dbUrl = rawUrl.trim().replace(/^['\"]|['\"]$/g, '');
  return neon(dbUrl);
}

async function ensureEventsTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id            BIGSERIAL PRIMARY KEY,
      event_name    VARCHAR(64) NOT NULL,
      visitor_id    VARCHAR(64),
      session_id    VARCHAR(64),
      session_duration INTEGER DEFAULT 0,
      ip            VARCHAR(45),
      country       VARCHAR(4),
      city          VARCHAR(128),
      url           VARCHAR(256),
      referrer      VARCHAR(512),
      screen_width  INTEGER DEFAULT 0,
      screen_height INTEGER DEFAULT 0,
      language      VARCHAR(10),
      platform      VARCHAR(64),
      score         INTEGER,
      mode          VARCHAR(32),
      day_number    INTEGER,
      extra_data    JSONB DEFAULT '{}',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
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
    await ensureEventsTable(sql);
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
