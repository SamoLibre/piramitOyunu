// ========== Analytics Tracking Module ==========
// Client-side event tracking for Next.js

const TRACK_ENDPOINT = '/api/track';

let visitorId = null;
let sessionId = null;
let sessionStart = null;

function getVisitorId() {
  if (visitorId) return visitorId;
  if (typeof window === 'undefined') return 'ssr';
  visitorId = localStorage.getItem('piramit-vid');
  if (!visitorId) {
    visitorId = (crypto.randomUUID?.() || (Math.random().toString(36).slice(2) + Date.now().toString(36)));
    localStorage.setItem('piramit-vid', visitorId);
  }
  return visitorId;
}

function getSessionId() {
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStart = Date.now();
  }
  return sessionId;
}

function getSessionDuration() {
  if (!sessionStart) return 0;
  return Math.floor((Date.now() - sessionStart) / 1000);
}

export function trackEvent(eventName, data = {}) {
  if (typeof window === 'undefined') return;

  try {
    const payload = {
      event: eventName,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      sessionDuration: getSessionDuration(),
      timestamp: new Date().toISOString(),
      url: window.location.pathname,
      referrer: document.referrer || '',
      screenWidth: screen.width,
      screenHeight: screen.height,
      language: navigator.language || 'tr',
      platform: navigator.userAgentData?.platform || navigator.platform || 'unknown',
      ...data,
    };

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(TRACK_ENDPOINT, blob);
    } else {
      fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch (_) {
    // Analytics hatası oyunu etkilememeli
  }
}

// Sayfa kapanınca session_end gönder
export function initSessionTracking() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeunload', () => {
    trackEvent('session_end', {
      totalDuration: getSessionDuration(),
    });
  });
}
