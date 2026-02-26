// ========== Analytics Tracking Module ==========
// Kullanıcı etkinliklerini Vercel serverless API'ye gönderir.

const TRACK_ENDPOINT = '/api/track';

// Benzersiz ziyaretçi ID'si oluştur / getir
function getVisitorId() {
  let id = localStorage.getItem('piramit-vid');
  if (!id) {
    id = (crypto.randomUUID?.() || (Math.random().toString(36).slice(2) + Date.now().toString(36)));
    localStorage.setItem('piramit-vid', id);
  }
  return id;
}

// Oturum ID'si (sayfa yenilenene kadar aynı kalır)
const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
const sessionStart = Date.now();

/**
 * Event gönder
 * @param {string} eventName - Event adı (page_view, game_start, game_complete, vb.)
 * @param {object} data - Ek veri
 */
export function trackEvent(eventName, data = {}) {
  try {
    const payload = {
      event: eventName,
      visitorId: getVisitorId(),
      sessionId,
      sessionDuration: Math.floor((Date.now() - sessionStart) / 1000),
      timestamp: new Date().toISOString(),
      url: window.location.pathname,
      referrer: document.referrer || '',
      screenWidth: screen.width,
      screenHeight: screen.height,
      language: navigator.language || 'tr',
      platform: navigator.userAgentData?.platform || navigator.platform || 'unknown',
      ...data
    };

    // sendBeacon ile güvenilir gönderim (sayfa kapanırken bile çalışır)
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(TRACK_ENDPOINT, blob);
    } else {
      fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    }
  } catch (e) {
    // Analytics hatası oyunu etkilememeli
  }
}

// Sayfa kapanırken oturum süresi gönder
window.addEventListener('beforeunload', () => {
  trackEvent('session_end', {
    totalDuration: Math.floor((Date.now() - sessionStart) / 1000)
  });
});
