'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TURKISH_ALPHABET, WORD_SETS, ENDLESS_CATEGORY_SETS } from '@/lib/words';
import {
  initDailyGame, initEndlessGame, guessLetter, advanceRow,
  getShareText, getHintLetter, saveResult, hasPlayedToday, getTodayResult, getStats,
} from '@/lib/game';
import { trackEvent, initSessionTracking } from '@/lib/analytics';

// ======================== Constants ========================

const KEYBOARD_ROWS = [
  ['E','R','T','Y','U','I','O','P','Ğ','Ü'],
  ['A','S','D','F','G','H','J','K','L','Ş','İ'],
  ['Z','C','V','B','N','M','Ö','Ç'],
];

const VIEWS = { home: 'home', daily: 'daily', endless: 'endless', profile: 'profile' };

const ENDLESS_POOLS = {
  random: WORD_SETS,
  doga: ENDLESS_CATEGORY_SETS.doga,
  gunluk: ENDLESS_CATEGORY_SETS.gunluk,
  nesne: ENDLESS_CATEGORY_SETS.nesne,
};

const MODE_LABELS = {
  random: 'Sonsuz • Rastgele',
  doga: 'Sonsuz • Doğa',
  gunluk: 'Sonsuz • Günlük Yaşam',
  nesne: 'Sonsuz • Nesneler',
};

// ======================== SVG Icons ========================

function StatsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="14" width="4" height="7" rx="1"/>
      <rect x="10" y="9" width="4" height="12" rx="1"/>
      <rect x="16" y="4" width="4" height="17" rx="1"/>
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5 12 3l9 7.5"/>
      <path d="M5 9.5V21h14V9.5"/>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function InfinityIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4"/>
      <path d="M12 18v4"/>
      <path d="m4.93 4.93 2.83 2.83"/>
      <path d="m16.24 16.24 2.83 2.83"/>
      <path d="M2 12h4"/>
      <path d="M18 12h4"/>
      <circle cx="12" cy="12" r="3.5"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 21a8 8 0 0 1 16 0"/>
    </svg>
  );
}

function HintBulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 18h6"/>
      <path d="M10 22h4"/>
      <path d="M8 14c-1.2-1-2-2.5-2-4a6 6 0 1 1 12 0c0 1.5-.8 3-2 4-.6.5-1 1.2-1 2h-6c0-.8-.4-1.5-1-2Z"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

// ======================== Sub-Components ========================

function Header({ onStatsClick, onHelpClick, label }) {
  return (
    <header className="header">
      <button className="header-btn" onClick={onStatsClick} aria-label="İstatistikler">
        <StatsIcon />
      </button>
      <div className="header-title">
        <h1>PİRAMİT</h1>
        <span className="day-number">{label}</span>
      </div>
      <button className="header-btn" onClick={onHelpClick} aria-label="Nasıl oynanır">
        <HelpIcon />
      </button>
    </header>
  );
}

function ScoreBar({ hintsRemaining, onHintClick, onHintHover, onHintLeave, livesRemaining, totalLives }) {
  return (
    <div className="score-bar">
      <button
        className={`hint-chip${hintsRemaining <= 0 ? ' disabled' : ''}`}
        onClick={onHintClick}
        onMouseEnter={onHintHover}
        onMouseLeave={onHintLeave}
        onTouchStart={onHintHover}
        onTouchEnd={onHintLeave}
        aria-label="İpucu al"
        aria-disabled={hintsRemaining <= 0}
      >
        <HintBulbIcon />
        <span className="hint-text">İpucu</span>
        <span className="hint-count">{hintsRemaining}</span>
      </button>
      <div className="lives-display">
        <span className="lives-label">Can</span>
        <div className="lives-hearts">
          <div className="lives-count">
            <span>{livesRemaining}</span>
            <span className="lives-total">/{totalLives}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Box({ box, isActive, isGuessed }) {
  const classes = ['box'];
  if (box.revealed) {
    classes.push(box.revealType === 'correct' ? 'revealed-correct' : 'revealed-fail');
  } else if (isActive && isGuessed) {
    classes.push('guessed');
  }

  return (
    <div className={classes.join(' ')}>
      {box.revealed ? (
        <>
          <span className="letter-display">{box.letter}</span>
          <span className="number-badge">{box.number}</span>
        </>
      ) : (
        <span className="box-content">{box.number}</span>
      )}
    </div>
  );
}

function Pyramid({ gameState, shakingRow, flashingRow }) {
  if (!gameState) return null;

  return (
    <div className="pyramid">
      {gameState.rowStates.map((row, rowIdx) => {
        const rowClasses = ['pyramid-row', row.status];
        if (shakingRow === rowIdx) rowClasses.push('shake');
        if (flashingRow === rowIdx) rowClasses.push('row-complete-flash');

        return (
          <div key={rowIdx} className={rowClasses.join(' ')} data-row={rowIdx}>
            {row.boxes.map((box, boxIdx) => (
              <Box
                key={boxIdx}
                box={box}
                isActive={row.status === 'active'}
                isGuessed={row.guessedLetters.includes(box.letter)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Keyboard({ keyStates, onKeyPress }) {
  return (
    <div className="keyboard">
      {KEYBOARD_ROWS.map((row, rIdx) => (
        <div key={rIdx} className="keyboard-row" style={{ '--cols': row.length }}>
          {row.map((letter) => (
            <button
              key={letter}
              className={`key${keyStates[letter] ? ' ' + keyStates[letter] : ''}`}
              onClick={() => onKeyPress(letter)}
              aria-label={letter}
            >
              {letter}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function BottomNav({ view, onViewChange }) {
  const items = [
    { key: 'home', label: 'Giriş', Icon: HomeIcon },
    { key: 'daily', label: 'Günlük', Icon: CalendarIcon },
    { key: 'endless', label: 'Sonsuz', Icon: InfinityIcon },
    { key: 'profile', label: 'Hesap', Icon: UserIcon },
  ];

  return (
    <nav className="bottom-nav" aria-label="Alt Navigasyon">
      {items.map(({ key, label, Icon }) => (
        <button
          key={key}
          className={`bottom-nav-btn${view === key ? ' is-active' : ''}`}
          onClick={() => onViewChange(key)}
        >
          <span className="bottom-nav-icon" aria-hidden="true">
            <Icon />
          </span>
          <span className="bottom-nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}

// ======================== Modals ========================

function HelpModal({ show, onClose }) {
  if (!show) return null;
  return (
    <div className={`modal-overlay${show ? ' show' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Nasıl Oynanır?</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p>Her gün 6 Türkçe kelimeyi tahmin edin!</p>
          <div className="help-section">
            <h3>Piramit</h3>
            <p>Kelimeler piramit şeklinde dizilir: üstte 1 harf, altta 6 harf.</p>
          </div>
          <div className="help-section">
            <h3>Sayılar</h3>
            <p>Her kutuda bir sayı var. Her sayı bir harfi temsil eder. Aynı sayı her zaman aynı harftir!</p>
          </div>
          <div className="help-section">
            <h3>Tahmin</h3>
            <p>Aşağıdaki alfabeden harf seçin. Doğruysa kutu açılır, yanlışsa bir can kaybedersiniz.</p>
          </div>
          <div className="help-section">
            <h3>Strateji</h3>
            <p>Üst satırlarda öğrendiğiniz sayı-harf eşleşmelerini alt satırlarda kullanın!</p>
          </div>
          <div className="help-section">
            <h3>Puanlama</h3>
            <p>Toplam 30 can hakkınız var. Kelimeyi bilene kadar o sırada kalırsınız.</p>
            <p>Her satır kendi harf sayısına göre puan verir (1 harf = 5p, 2 harf = 10p... 6 harf = 30p).</p>
            <p>Her yanlış tahmin puanı %25 azaltır. Tüm satırları tamamlarsanız +20, mükemmel oyun +25 bonus!</p>
            <p>Maksimum: 150 puan 🏆</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsModal({ show, onClose }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (show) {
      setStats(getStats());
    }
  }, [show]);

  if (!show || !stats) return null;

  return (
    <div className={`modal-overlay${show ? ' show' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>İstatistikler</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{stats.gamesPlayed}</div>
              <div className="stat-label">Oyun</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.averageScore}</div>
              <div className="stat-label">Ort. Skor</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.currentStreak}</div>
              <div className="stat-label">Seri</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.maxStreak}</div>
              <div className="stat-label">En İyi Seri</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Countdown() {
  const [text, setText] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow - now;
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setText(`${h}:${m}:${s}`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="next-game">
      <div>Yeni piramit:</div>
      <div className="countdown">{text}</div>
    </div>
  );
}

function GameOverModal({ show, onClose, gameState, previousResult }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

  const data = previousResult || gameState;
  if (!show || !data) return null;

  const rowScores = data.rowScores || [];
  const totalScore = data.totalScore || 0;
  const allSuccess = rowScores.every((s) => s > 0);

  const getRowColor = (score, idx) => {
    const rowLength = idx + 1;
    const maxRowScore = rowLength * 5;
    const ratio = score / maxRowScore;
    if (ratio >= 0.75) return '#27AE60';
    if (ratio >= 0.5) return '#F39C12';
    if (ratio >= 0.25) return '#E67E22';
    return '#E74C3C';
  };

  const shareText = gameState ? getShareText(gameState) : '';

  const handleWhatsApp = () => {
    trackEvent('share', { platform: 'whatsapp' });
    const text = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleTwitter = () => {
    trackEvent('share', { platform: 'twitter' });
    const text = encodeURIComponent(shareText);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const handleCopy = () => {
    trackEvent('share', { platform: 'clipboard' });
    navigator.clipboard.writeText(shareText).then(() => {
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    });
  };

  return (
    <div className={`modal-overlay${show ? ' show' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal gameover-modal">
        <div className="modal-header">
          <h2>{allSuccess ? 'Tebrikler!' : 'Oyun Bitti'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="gameover-score">
            {totalScore}<span className="max-score">/150</span>
          </div>
          <div className="gameover-rows">
            {rowScores.map((score, idx) => (
              <div
                key={idx}
                className="gameover-row-dot"
                style={{ background: getRowColor(score, idx) }}
              >
                {score}
              </div>
            ))}
          </div>

          <button className="share-btn" onClick={() => setShareOpen(!shareOpen)}>
            Paylaş 📤
          </button>

          {shareOpen && (
            <div className="share-options show">
              <button className="share-option-btn whatsapp" onClick={handleWhatsApp}>
                <WhatsAppIcon /> WhatsApp
              </button>
              <button className="share-option-btn twitter" onClick={handleTwitter}>
                <TwitterIcon /> X (Twitter)
              </button>
              <button className="share-option-btn copy" onClick={handleCopy}>
                <CopyIcon /> Kopyala
              </button>
            </div>
          )}

          <div className={`share-toast${copyToast ? ' show' : ''}`}>Kopyalandı!</div>
          <Countdown />
        </div>
      </div>
    </div>
  );
}

// ======================== View Components ========================

function HomeView({ onGoDaily }) {
  return (
    <section className="page page-active" id="home-page">
      <div className="home-card">
        <h2>Piramit&apos;e Hoş Geldin</h2>
        <p>Her satırda sayı-harf ilişkisini çöz, kelimeleri aç ve günlük puanını yükselt.</p>
        <button className="cta-btn" onClick={onGoDaily}>Günlük Oyuna Git</button>
      </div>
    </section>
  );
}

function EndlessView({ onStartEndless }) {
  return (
    <section className="page page-active" id="endless-page">
      <div className="mode-card">
        <h2>Sonsuz Mod</h2>
        <p>Rastgele veya kategori seç. Her seçimde yeni bir piramit oyunu başlar.</p>
        <div className="mode-actions">
          <button className="mode-btn" onClick={() => onStartEndless('random')}>Rastgele</button>
        </div>
        <h3>Kategoriler</h3>
        <div className="category-grid">
          <button className="mode-btn" onClick={() => onStartEndless('doga')}>Doğa</button>
          <button className="mode-btn" onClick={() => onStartEndless('gunluk')}>Günlük Yaşam</button>
          <button className="mode-btn" onClick={() => onStartEndless('nesne')}>Nesneler</button>
        </div>
      </div>
    </section>
  );
}

function ProfileView() {
  return (
    <section className="page page-active" id="profile-page">
      <div className="profile-empty">
        <h2>Profil</h2>
        <p>Bu alan yakında eklenecek.</p>
      </div>
    </section>
  );
}

// ======================== Main Game App ========================

export default function GameApp() {
  const [view, setView] = useState('daily');
  const [gameState, setGameState] = useState(null);
  const [keyStates, setKeyStates] = useState({});
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [hintVisualText, setHintVisualText] = useState('');
  const [hintVisible, setHintVisible] = useState(false);
  const [shakingRow, setShakingRow] = useState(-1);
  const [flashingRow, setFlashingRow] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [previousResult, setPreviousResult] = useState(null);
  const [label, setLabel] = useState('#0');

  const transitioningRef = useRef(false);
  const hintTimerRef = useRef(null);

  // Initialize daily game on mount
  useEffect(() => {
    initSessionTracking();
    trackEvent('page_view');
    startDailyGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Physical keyboard support
  useEffect(() => {
    function handleKeyDown(e) {
      if (view !== 'daily' || showHelp || showStats || showGameOver) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      let char = e.key;
      if (char === 'i') char = 'İ';
      else if (char === 'ı') char = 'I';
      else char = char.toLocaleUpperCase('tr-TR');

      if (TURKISH_ALPHABET.includes(char)) {
        e.preventDefault();
        handleLetterGuess(char);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  const resetKeyStates = useCallback(() => {
    const fresh = {};
    KEYBOARD_ROWS.flat().forEach((l) => { fresh[l] = ''; });
    setKeyStates(fresh);
  }, []);

  const startDailyGame = useCallback(() => {
    const state = initDailyGame();
    setGameState(state);
    setLabel(`#${state.dayNumber}`);
    resetKeyStates();
    setHintsRemaining(3);
    setHintVisualText('');
    setHintVisible(false);
    setPreviousResult(null);
    setShowGameOver(false);

    trackEvent('game_start', { mode: 'daily', dayNumber: state.dayNumber });

    if (hasPlayedToday()) {
      const result = getTodayResult();
      if (result) {
        setPreviousResult(result);
        setShowGameOver(true);
      }
    }
  }, [resetKeyStates]);

  const startEndlessGame = useCallback((modeKey) => {
    const pool = ENDLESS_POOLS[modeKey] || ENDLESS_POOLS.random;
    const idx = Math.floor(Math.random() * pool.length);
    const words = pool[idx].map((w) => [...w].slice(0, 6).join(''));
    const seed = Math.floor(Math.random() * 1000000);

    const state = initEndlessGame(words, {
      mode: 'infinite',
      modeLabel: MODE_LABELS[modeKey] || MODE_LABELS.random,
      seed,
      dayNumber: seed,
    });

    setGameState(state);
    setLabel(state.modeLabel);
    resetKeyStates();
    setHintsRemaining(3);
    setHintVisualText('');
    setHintVisible(false);
    setPreviousResult(null);
    setShowGameOver(false);
    setView('daily');

    trackEvent('endless_start', { mode: modeKey, category: MODE_LABELS[modeKey] || 'Rastgele' });
  }, [resetKeyStates]);

  const handleLetterGuess = useCallback((letter) => {
    if (!gameState || gameState.isComplete || transitioningRef.current) return;

    const { state: newState, result } = guessLetter(gameState, letter);

    switch (result.action) {
      case 'none':
      case 'already_guessed':
        return;

      case 'correct':
        setKeyStates((prev) => ({ ...prev, [letter]: 'correct' }));
        setGameState(newState);
        break;

      case 'wrong':
        setKeyStates((prev) => ({ ...prev, [letter]: 'wrong' }));
        setGameState(newState);
        setShakingRow(newState.currentRow);
        setTimeout(() => setShakingRow(-1), 400);
        break;

      case 'row_complete': {
        setKeyStates((prev) => ({ ...prev, [letter]: 'correct' }));
        trackEvent('row_complete', { rowIndex: newState.currentRow, rowScore: result.rowScore });
        transitioningRef.current = true;

        setGameState(newState);
        setFlashingRow(newState.currentRow);

        setTimeout(() => {
          setFlashingRow(-1);
          const advanced = advanceRow(newState);
          setGameState(advanced);
          resetKeyStates();
          transitioningRef.current = false;
        }, 700);
        break;
      }

      case 'game_over_no_lives':
        setKeyStates((prev) => ({ ...prev, [letter]: 'wrong' }));
        trackEvent('game_over', { score: result.score, mode: newState.mode });
        transitioningRef.current = true;
        setGameState(newState);
        setShakingRow(newState.currentRow);

        setTimeout(() => {
          setShakingRow(-1);
          if (newState.mode === 'daily') saveResult(newState);
          setShowGameOver(true);
          transitioningRef.current = false;
        }, 800);
        break;

      case 'game_complete':
        setKeyStates((prev) => ({ ...prev, [letter]: 'correct' }));
        trackEvent('game_complete', {
          score: result.score,
          mode: newState.mode,
          livesRemaining: newState.livesRemaining,
          dayNumber: newState.dayNumber,
        });
        transitioningRef.current = true;
        setGameState(newState);

        setTimeout(() => {
          if (newState.mode === 'daily') saveResult(newState);
          setShowGameOver(true);
          transitioningRef.current = false;
        }, 600);
        break;
    }
  }, [gameState, resetKeyStates]);

  const handleHintClick = useCallback(() => {
    if (hintsRemaining <= 0 || !gameState || gameState.isComplete) return;

    const letter = getHintLetter(gameState);
    if (!letter) {
      setHintVisualText('Bu satırda açılacak harf kalmadı.');
      setHintVisible(true);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setHintVisible(false), 1600);
      return;
    }

    handleLetterGuess(letter);
    setHintVisualText(`İpucu kullanıldı: ${letter}`);
    setHintVisible(true);
    trackEvent('hint_used', { letter, hintsRemaining: hintsRemaining - 1 });
    setHintsRemaining((h) => h - 1);

    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHintVisible(false), 1600);
  }, [hintsRemaining, gameState, handleLetterGuess]);

  const handleHintHover = useCallback(() => {
    if (!gameState || gameState.isComplete) return;
    if (hintsRemaining <= 0) {
      setHintVisualText('İpucu hakkın bitti.');
    } else {
      const letter = getHintLetter(gameState);
      setHintVisualText(letter ? `İpucu harfi: ${letter}` : 'Bu satırda açılacak harf kalmadı.');
    }
    setHintVisible(true);
  }, [gameState, hintsRemaining]);

  const handleHintLeave = useCallback(() => {
    setHintVisible(false);
  }, []);

  const handleViewChange = useCallback((v) => setView(v), []);

  // ======================== Render ========================

  return (
    <div className="app">
      <Header
        label={label}
        onStatsClick={() => setShowStats(true)}
        onHelpClick={() => setShowHelp(true)}
      />

      <main className="page-shell">
        {view === 'home' && (
          <HomeView onGoDaily={() => setView('daily')} />
        )}
        {view === 'daily' && (
          <section className="page page-active page-daily">
            <ScoreBar
              hintsRemaining={hintsRemaining}
              onHintClick={handleHintClick}
              onHintHover={handleHintHover}
              onHintLeave={handleHintLeave}
              livesRemaining={gameState?.livesRemaining ?? 30}
              totalLives={gameState?.totalLives ?? 30}
            />
            <div className={`hint-visual${hintVisible ? ' show' : ''}`} aria-live="polite">
              {hintVisualText}
            </div>
            <Pyramid gameState={gameState} shakingRow={shakingRow} flashingRow={flashingRow} />
            <Keyboard keyStates={keyStates} onKeyPress={handleLetterGuess} />
          </section>
        )}
        {view === 'endless' && (
          <EndlessView onStartEndless={startEndlessGame} />
        )}
        {view === 'profile' && (
          <ProfileView />
        )}
      </main>

      <BottomNav view={view} onViewChange={handleViewChange} />

      <HelpModal show={showHelp} onClose={() => setShowHelp(false)} />
      <StatsModal show={showStats} onClose={() => setShowStats(false)} />
      <GameOverModal
        show={showGameOver}
        onClose={() => setShowGameOver(false)}
        gameState={gameState}
        previousResult={previousResult}
      />
    </div>
  );
}
