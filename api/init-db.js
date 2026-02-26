import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Yetki kontrolü
  const secret = req.headers['x-analytics-secret'] || req.query.secret;
  if (!process.env.ANALYTICS_SECRET || secret !== process.env.ANALYTICS_SECRET) {
    return res.status(401).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Events tablosu
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

    // Performans indeksleri
    await sql`CREATE INDEX IF NOT EXISTS idx_events_created_at ON events (created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_events_date ON events ((created_at::date))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON events (visitor_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_events_event_name ON events (event_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_events_name_date ON events (event_name, (created_at::date))`;

    return res.status(200).json({
      ok: true,
      message: 'Veritabanı tabloları ve indeksler başarıyla oluşturuldu!'
    });
  } catch (error) {
    console.error('DB init error:', error);
    return res.status(500).json({ error: 'Tablo oluşturulurken hata: ' + error.message });
  }
}
