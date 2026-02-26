import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

function getSQL() {
  return neon(process.env.DATABASE_URL);
}

function normalizeSecret(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  const unquoted = trimmed.replace(/^['\"]|['\"]$/g, '');
  return unquoted.normalize('NFC');
}

function isAuthorized(request) {
  const { searchParams } = new URL(request.url);
  const provided = request.headers.get('x-analytics-secret') || searchParams.get('secret') || '';
  const expected = process.env.ANALYTICS_SECRET || '';
  return normalizeSecret(provided) === normalizeSecret(expected) && normalizeSecret(expected).length > 0;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // Yetki kontrolü
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Yetkisiz erişim. Geçerli bir anahtar gerekli.' }, { status: 401 });
  }

  try {
    const sql = getSQL();
    const days = Math.min(parseInt(searchParams.get('days') || '7', 10), 90);

    // Günlük istatistikler
    const dailyStatsRows = await sql`
      SELECT
        d.date::text AS date,
        COALESCE(s.unique_visitors, 0) AS unique_visitors,
        COALESCE(s.total_events, 0) AS total_events,
        COALESCE(s.page_views, 0) AS page_views,
        COALESCE(s.games_started, 0) AS games_started,
        COALESCE(s.games_completed, 0) AS games_completed,
        COALESCE(s.avg_score, 0) AS avg_score,
        COALESCE(s.max_score, 0) AS max_score,
        COALESCE(s.min_score, 0) AS min_score,
        COALESCE(s.hints_used, 0) AS hints_used,
        COALESCE(s.shares, 0) AS shares,
        COALESCE(s.session_ends, 0) AS session_ends,
        COALESCE(s.row_completes, 0) AS row_completes,
        COALESCE(s.game_overs, 0) AS game_overs
      FROM generate_series(
        CURRENT_DATE - (${days} - 1) * INTERVAL '1 day',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS d(date)
      LEFT JOIN (
        SELECT
          created_at::date AS event_date,
          COUNT(DISTINCT visitor_id) AS unique_visitors,
          COUNT(*) AS total_events,
          COUNT(*) FILTER (WHERE event_name = 'page_view') AS page_views,
          COUNT(*) FILTER (WHERE event_name = 'game_start') AS games_started,
          COUNT(*) FILTER (WHERE event_name = 'game_complete') AS games_completed,
          ROUND(AVG(score) FILTER (WHERE event_name = 'game_complete' AND score IS NOT NULL)) AS avg_score,
          MAX(score) FILTER (WHERE event_name = 'game_complete' AND score IS NOT NULL) AS max_score,
          MIN(score) FILTER (WHERE event_name = 'game_complete' AND score IS NOT NULL) AS min_score,
          COUNT(*) FILTER (WHERE event_name = 'hint_used') AS hints_used,
          COUNT(*) FILTER (WHERE event_name = 'share') AS shares,
          COUNT(*) FILTER (WHERE event_name = 'session_end') AS session_ends,
          COUNT(*) FILTER (WHERE event_name = 'row_complete') AS row_completes,
          COUNT(*) FILTER (WHERE event_name = 'game_over') AS game_overs
        FROM events
        WHERE created_at >= CURRENT_DATE - ${days} * INTERVAL '1 day'
        GROUP BY created_at::date
      ) s ON s.event_date = d.date::date
      ORDER BY d.date DESC
    `;

    const dailyStats = dailyStatsRows.map((row) => ({
      date: row.date,
      uniqueVisitors: Number(row.unique_visitors),
      totalEvents: Number(row.total_events),
      pageViews: Number(row.page_views),
      gamesStarted: Number(row.games_started),
      gamesCompleted: Number(row.games_completed),
      avgScore: Number(row.avg_score),
      maxScore: Number(row.max_score),
      minScore: Number(row.min_score),
      hintsUsed: Number(row.hints_used),
      shares: Number(row.shares),
      sessionEnds: Number(row.session_ends),
      rowCompletes: Number(row.row_completes),
      gameOvers: Number(row.game_overs),
    }));

    // Bugünün son 100 eventi
    const recentEvents = await sql`
      SELECT
        event_name AS event,
        visitor_id AS "visitorId",
        session_id AS "sessionId",
        score,
        mode,
        day_number AS "dayNumber",
        country,
        city,
        platform,
        extra_data,
        created_at AS "serverTime",
        session_duration AS "totalDuration"
      FROM events
      WHERE created_at::date = CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 100
    `;

    // Toplam benzersiz ziyaretçi
    const totalResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) AS total FROM events WHERE visitor_id IS NOT NULL
    `;
    const totalVisitors = Number(totalResult[0]?.total || 0);

    // Aktif gün sayısı
    const activeDaysResult = await sql`
      SELECT COUNT(DISTINCT created_at::date) AS days FROM events
    `;
    const activeDays = Number(activeDaysResult[0]?.days || 0);

    return NextResponse.json({
      totalVisitors,
      activeDays,
      dailyStats,
      recentEvents: recentEvents.map((e) => ({
        ...e,
        ...(e.extra_data && typeof e.extra_data === 'object' ? e.extra_data : {}),
      })),
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    return NextResponse.json({ error: 'İstatistik verisi alınamadı' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Analytics-Secret',
    },
  });
}
