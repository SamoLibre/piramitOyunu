'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import './admin.css';

const STATS_ENDPOINT = '/api/stats';

function withSecret(url, secret) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}secret=${encodeURIComponent(secret)}`;
}

const EVENT_LABELS = {
  page_view: { label: 'Sayfa Görüntüleme', icon: '👁️', color: '#5DADE2' },
  game_start: { label: 'Oyun Başlatıldı', icon: '🎮', color: '#58D68D' },
  game_complete: { label: 'Oyun Tamamlandı', icon: '🏆', color: '#F4D03F' },
  game_over: { label: 'Oyun Bitti (Can)', icon: '💀', color: '#E74C3C' },
  hint_used: { label: 'İpucu Kullanıldı', icon: '💡', color: '#AF7AC5' },
  row_complete: { label: 'Satır Tamamlandı', icon: '✅', color: '#27AE60' },
  share: { label: 'Paylaşım', icon: '📤', color: '#3498DB' },
  session_end: { label: 'Oturum Sonu', icon: '👋', color: '#95A5A6' },
  endless_start: { label: 'Sonsuz Mod Başlatıldı', icon: '♾️', color: '#E67E22' },
};

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}sn`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}dk ${seconds % 60}sn`;
  return `${Math.floor(seconds / 3600)}sa ${Math.floor((seconds % 3600) / 60)}dk`;
}

// ======== Login Screen ========
function LoginScreen({ onLogin }) {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanSecret = secret.trim();
    if (!cleanSecret) return;

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: cleanSecret }),
      });

      if (res.ok) {
        sessionStorage.setItem('piramit-admin-key', cleanSecret);
        onLogin(cleanSecret);
      } else if (res.status === 401) {
        setError('Yanlış şifre. Tekrar deneyin.');
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || 'Sunucu hatası oluştu.');
      }
    } catch {
      setError('Bağlantı hatası. Sunucuya ulaşılamıyor.');
    }

    setLoading(false);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon">🔺</div>
        <h1>Piramit Admin</h1>
        <p>İstatistikleri görüntülemek için yönetici anahtarını girin.</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Yönetici Anahtarı"
            autoComplete="off"
            required
            style={{
              padding: '14px 16px', borderRadius: '8px', border: '1px solid #475569',
              background: '#0F172A', color: '#F1F5F9', fontFamily: 'inherit', fontSize: '1rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px', borderRadius: '8px', border: 'none', background: '#6366F1',
              color: 'white', fontFamily: 'inherit', fontSize: '1rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Kontrol ediliyor...' : 'Giriş Yap'}
          </button>
        </form>
        {error && <div style={{ color: '#EF4444', fontSize: '0.85rem', marginTop: '8px' }}>{error}</div>}
      </div>
    </div>
  );
}

// ======== Summary Cards ========
function SummaryCards({ data }) {
  const today = data.dailyStats?.[0] || {};
  const cards = [
    { label: 'Toplam Ziyaretçi', value: formatNumber(data.totalVisitors || 0), cls: 'card-primary', icon: '👥' },
    { label: 'Bugün Ziyaretçi', value: formatNumber(today.uniqueVisitors || 0), cls: 'card-blue', icon: '🕐' },
    { label: 'Bugün Oynanan', value: formatNumber(today.gamesCompleted || 0), cls: 'card-green', icon: '⭐' },
    { label: 'Bugün Ort. Skor', value: String(today.avgScore || 0), cls: 'card-gold', icon: '📊' },
  ];

  return (
    <section className="summary-cards">
      {cards.map((c, i) => (
        <div key={i} className={`card ${c.cls}`}>
          <div className="card-icon"><span style={{ fontSize: '24px' }}>{c.icon}</span></div>
          <div className="card-body">
            <span className="card-value">{c.value}</span>
            <span className="card-label">{c.label}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

// ======== Bar Chart ========
function BarChart({ dailyStats }) {
  const data = [...(dailyStats || [])].reverse();
  if (data.length === 0) return <div className="no-events">Veri bulunamadı</div>;

  const maxVal = Math.max(...data.map((d) => Math.max(d.uniqueVisitors, d.gamesCompleted)), 1);

  return (
    <section className="chart-section">
      <div className="section-header">
        <h2>Günlük Ziyaretçiler</h2>
        <div className="chart-legend">
          <span className="legend-item"><span className="dot dot-blue" /> Ziyaretçi</span>
          <span className="legend-item"><span className="dot dot-green" /> Oyun</span>
        </div>
      </div>
      <div className="chart-container">
        {data.map((day, i) => {
          const vH = Math.max((day.uniqueVisitors / maxVal) * 100, 2);
          const gH = Math.max((day.gamesCompleted / maxVal) * 100, 2);
          const d = new Date(day.date + 'T00:00:00');
          return (
            <div key={i} className="chart-col">
              <div className="chart-bars">
                <div className="chart-bar bar-blue" style={{ height: vH + '%' }} title={`${day.uniqueVisitors} ziyaretçi`}>
                  {day.uniqueVisitors > 0 && <span className="bar-value">{day.uniqueVisitors}</span>}
                </div>
                <div className="chart-bar bar-green" style={{ height: gH + '%' }} title={`${day.gamesCompleted} oyun`}>
                  {day.gamesCompleted > 0 && <span className="bar-value">{day.gamesCompleted}</span>}
                </div>
              </div>
              <span className="chart-date">{d.getDate()}/{d.getMonth() + 1}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ======== Stats Table ========
function StatsTable({ dailyStats }) {
  return (
    <section className="chart-section">
      <div className="section-header">
        <h2>Oyun Detayları</h2>
      </div>
      <div className="stats-table-container">
        <table className="stats-table">
          <thead>
            <tr>
              <th>Tarih</th><th>Ziyaretçi</th><th>Sayfa Gör.</th>
              <th>Oyun Baş.</th><th>Oyun Bit.</th><th>Ort. Skor</th>
              <th>İpucu</th><th>Paylaşım</th>
            </tr>
          </thead>
          <tbody>
            {(!dailyStats || dailyStats.length === 0) && (
              <tr><td colSpan={8} className="no-data">Veri bulunamadı</td></tr>
            )}
            {dailyStats?.map((day, i) => {
              const d = new Date(day.date + 'T00:00:00');
              const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });
              return (
                <tr key={i}>
                  <td className="td-date">{dateStr}</td>
                  <td>{day.uniqueVisitors}</td>
                  <td>{day.pageViews}</td>
                  <td>{day.gamesStarted}</td>
                  <td>{day.gamesCompleted}</td>
                  <td className="td-score">
                    {day.avgScore}
                    {day.maxScore ? <span className="score-range"> ({day.minScore}-{day.maxScore})</span> : null}
                  </td>
                  <td>{day.hintsUsed}</td>
                  <td>{day.shares}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ======== Events List ========
function EventsList({ events }) {
  return (
    <section className="chart-section">
      <div className="section-header">
        <h2>Bugünün Etkinlikleri</h2>
        <span className="event-count">{events?.length || 0} etkinlik</span>
      </div>
      <div className="events-list">
        {(!events || events.length === 0) && (
          <div className="no-events">Bugün henüz etkinlik kaydedilmedi</div>
        )}
        {events?.map((evt, i) => {
          const info = EVENT_LABELS[evt.event] || { label: evt.event, icon: '📌', color: '#BDC3C7' };
          const time = evt.serverTime
            ? new Date(evt.serverTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '??:??';

          let detail = '';
          if (evt.event === 'game_complete' && evt.score !== undefined) detail = `Skor: ${evt.score}/150`;
          else if (evt.event === 'game_start' && evt.mode) detail = `Mod: ${evt.mode}`;
          else if (evt.event === 'share' && evt.platform) detail = `Platform: ${evt.platform}`;
          else if (evt.event === 'session_end' && evt.totalDuration) detail = `Süre: ${formatDuration(evt.totalDuration)}`;
          else if (evt.event === 'row_complete' && evt.rowIndex !== undefined) detail = `Satır: ${evt.rowIndex + 1}, Skor: ${evt.rowScore || 0}`;

          const location = (evt.city && evt.city !== 'unknown')
            ? `${evt.city}, ${evt.country}`
            : (evt.country && evt.country !== 'unknown' ? evt.country : '');

          return (
            <div key={i} className="event-item">
              <span className="event-icon" style={{ color: info.color }}>{info.icon}</span>
              <div className="event-info">
                <span className="event-name">{info.label}</span>
                {detail && <span className="event-detail">{detail}</span>}
                {location && <span className="event-location">📍 {location}</span>}
              </div>
              <div className="event-meta">
                <span className="event-time">{time}</span>
                <span className="event-visitor" title={evt.visitorId || ''}>{(evt.visitorId || '').slice(0, 8)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ======== DB Init Section ========
function DbInitSection({ secret }) {
  const [msg, setMsg] = useState('');
  const [msgColor, setMsgColor] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInit = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(withSecret('/api/init-db', secret));
      const data = await res.json();
      if (res.ok) {
        setMsgColor('#22C55E');
        setMsg('✅ ' + (data.message || 'Başarılı!'));
      } else {
        setMsgColor('#EF4444');
        setMsg('❌ ' + (data.error || 'Hata oluştu'));
      }
    } catch {
      setMsgColor('#EF4444');
      setMsg('❌ Bağlantı hatası');
    }
    setLoading(false);
  };

  return (
    <div className="db-init-section">
      <div className="db-init-card">
        <h2>⚠️ Veritabanı Kurulumu Gerekli</h2>
        <p>Tablolar henüz oluşturulmamış. İlk kurulumda bu butona tıklayın.</p>
        <button
          onClick={handleInit}
          disabled={loading}
          style={{
            maxWidth: '300px', margin: '16px auto 0', padding: '14px', borderRadius: '8px',
            border: 'none', background: '#6366F1', color: 'white', fontFamily: 'inherit',
            fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'block', width: '100%',
          }}
        >
          {loading ? 'Oluşturuluyor...' : 'Veritabanını Başlat'}
        </button>
        {msg && <div style={{ marginTop: '12px', fontSize: '0.85rem', color: msgColor }}>{msg}</div>}
      </div>
    </div>
  );
}

// ======== Dashboard ========
function Dashboard({ secret, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [period, setPeriod] = useState(30);
  const [lastUpdate, setLastUpdate] = useState('');
  const intervalRef = useRef(null);

  const loadData = useCallback(async (days) => {
    setLoading(true);
    setDbError(false);

    try {
      const res = await fetch(withSecret(`${STATS_ENDPOINT}?days=${days || period}`, secret));

      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem('piramit-admin-key');
          onLogout();
          return;
        }
        throw new Error('API hatası');
      }

      const payload = await res.json();
      setData(payload);
      setLastUpdate(new Date().toLocaleTimeString('tr-TR'));
    } catch {
      setDbError(true);
    }

    setLoading(false);
  }, [secret, period, onLogout]);

  useEffect(() => {
    loadData(period);
    intervalRef.current = setInterval(() => loadData(period), 60000);
    return () => clearInterval(intervalRef.current);
  }, [period, loadData]);

  const handlePeriodChange = (e) => {
    const val = Number(e.target.value);
    setPeriod(val);
  };

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-header-left">
          <span className="dash-logo">🔺</span>
          <h1>Piramit Analytics</h1>
        </div>
        <div className="dash-header-right">
          <select value={period} onChange={handlePeriodChange} className="period-select">
            <option value={7}>Son 7 Gün</option>
            <option value={14}>Son 14 Gün</option>
            <option value={30}>Son 30 Gün</option>
            <option value={60}>Son 60 Gün</option>
            <option value={90}>Son 90 Gün</option>
          </select>
          <button className="refresh-btn" onClick={() => loadData(period)} title="Yenile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
              <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
          </button>
          <button className="logout-btn" onClick={() => { sessionStorage.removeItem('piramit-admin-key'); onLogout(); }} title="Çıkış">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <span>Veriler yükleniyor...</span>
        </div>
      )}

      {dbError && !loading && <DbInitSection secret={secret} />}

      {data && !loading && !dbError && (
        <main className="content">
          <SummaryCards data={data} />
          <BarChart dailyStats={data.dailyStats} />
          <StatsTable dailyStats={data.dailyStats} />
          <EventsList events={data.recentEvents} />
        </main>
      )}

      {lastUpdate && (
        <footer className="dash-footer">Son güncelleme: {lastUpdate}</footer>
      )}
    </div>
  );
}

// ======== Main Admin Page ========
export default function AdminPage() {
  const [secret, setSecret] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('piramit-admin-key');
    if (saved) setSecret(saved);
  }, []);

  if (!secret) {
    return <LoginScreen onLogin={(s) => setSecret(s)} />;
  }

  return <Dashboard secret={secret} onLogout={() => setSecret(null)} />;
}
