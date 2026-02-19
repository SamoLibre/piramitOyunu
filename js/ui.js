import { TURKISH_ALPHABET } from './words.js';
import { getGameState, guessLetter, advanceRow, getShareText, getStats, hasPlayedToday, getTodayResult, setTransitioning } from './game.js';

// QWERTY Klavye düzeni (Türkçe karakterler dahil)
const KEYBOARD_ROWS = [
  ['E','R','T','Y','U','I','O','P','Ğ','Ü'],
  ['A','S','D','F','G','H','J','K','L','Ş','İ'],
  ['Z','C','V','B','N','M','Ö','Ç']
];

// DOM referansları
let pyramidEl, keyboardEl, scoreValueEl, livesHeartsEl, dayNumberEl;
let hintBtnEl, hintCountEl, hintVisualEl;

// Keyboard state: her harf için durum
let keyboardState = {};
let hintsRemaining = 3;
let hintTimer = null;

export function initUI() {
  pyramidEl = document.getElementById('pyramid');
  keyboardEl = document.getElementById('keyboard');
  scoreValueEl = document.getElementById('score-value');
  livesHeartsEl = document.getElementById('lives-hearts');
  dayNumberEl = document.getElementById('day-number');
  hintBtnEl = document.getElementById('hint-btn');
  hintCountEl = document.getElementById('hint-count');
  hintVisualEl = document.getElementById('hint-visual');

  setupModals();
  setupHintUI();
}

function setupHintUI() {
  if (!hintBtnEl || !hintCountEl || !hintVisualEl) return;

  hintCountEl.textContent = String(hintsRemaining);

  const showPreview = () => {
    if (hintsRemaining <= 0) {
      hintVisualEl.textContent = 'İpucu hakkın bitti.';
    } else {
      const letter = getHintLetter();
      hintVisualEl.textContent = letter
        ? `İpucu harfi: ${letter}`
        : 'Bu satırda açılacak harf kalmadı.';
    }
    hintVisualEl.classList.add('show');
  };

  const hidePreview = () => {
    hintVisualEl.classList.remove('show');
  };

  hintBtnEl.addEventListener('mouseenter', showPreview);
  hintBtnEl.addEventListener('mouseleave', hidePreview);
  hintBtnEl.addEventListener('touchstart', showPreview, { passive: true });
  hintBtnEl.addEventListener('touchend', hidePreview, { passive: true });

  hintBtnEl.addEventListener('click', () => {
    if (hintsRemaining <= 0) return;
    const state = getGameState();
    if (!state || state.isComplete) return;

    const letter = getHintLetter();
    if (!letter) {
      hintVisualEl.textContent = 'Bu satırda açılacak harf kalmadı.';
      hintVisualEl.classList.add('show');
      if (hintTimer) clearTimeout(hintTimer);
      hintTimer = setTimeout(() => {
        hintVisualEl.classList.remove('show');
      }, 1600);
      return;
    }

    handleLetterGuess(letter);
    hintVisualEl.textContent = `İpucu kullanıldı: ${letter}`;
    hintVisualEl.classList.add('show');

    hintsRemaining--;
    hintCountEl.textContent = String(hintsRemaining);

    if (hintsRemaining === 0) {
      hintBtnEl.classList.add('disabled');
      hintBtnEl.setAttribute('aria-disabled', 'true');
    }

    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
      hintVisualEl.classList.remove('show');
    }, 1600);
  });
}

function getHintLetter() {
  const state = getGameState();
  if (!state || state.isComplete) return null;

  const row = state.rowStates[state.currentRow];
  if (!row) return null;

  const unrevealed = row.boxes.filter(box => !box.revealed).map(box => box.letter);
  if (unrevealed.length === 0) return null;

  return unrevealed[Math.floor(Math.random() * unrevealed.length)];
}

export function resetHintUI() {
  hintsRemaining = 3;
  if (hintCountEl) hintCountEl.textContent = '3';
  if (hintBtnEl) {
    hintBtnEl.classList.remove('disabled');
    hintBtnEl.removeAttribute('aria-disabled');
  }
  if (hintVisualEl) {
    hintVisualEl.classList.remove('show');
    hintVisualEl.textContent = '';
  }
}

// Piramidi render et
export function renderPyramid() {
  const state = getGameState();
  if (!state) return;

  pyramidEl.innerHTML = '';

  state.rowStates.forEach((row, rowIdx) => {
    const rowEl = document.createElement('div');
    rowEl.className = `pyramid-row ${row.status}`;
    rowEl.dataset.row = rowIdx;

    row.boxes.forEach((box, boxIdx) => {
      const boxEl = document.createElement('div');
      boxEl.className = 'box';
      boxEl.dataset.row = rowIdx;
      boxEl.dataset.box = boxIdx;

      if (box.revealed) {
        boxEl.classList.add(box.revealType === 'correct' ? 'revealed-correct' : 'revealed-fail');
        boxEl.innerHTML = `
          <span class="letter-display">${box.letter}</span>
          <span class="number-badge">${box.number}</span>
        `;
      } else {
        // Sadece aktif satırdaki bilinen harfler yeşil olsun
        if (row.status === 'active' && row.guessedLetters.includes(box.letter)) {
          boxEl.classList.add('guessed');
        }
        boxEl.innerHTML = `<span class="box-content">${box.number}</span>`;
      }

      rowEl.appendChild(boxEl);
    });

    pyramidEl.appendChild(rowEl);
  });
}

// Klavyeyi render et
export function renderKeyboard() {
  keyboardEl.innerHTML = '';
  keyboardState = {};

  KEYBOARD_ROWS.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'keyboard-row';

    row.forEach(letter => {
      const keyEl = document.createElement('button');
      keyEl.className = 'key';
      keyEl.textContent = letter;
      keyEl.dataset.letter = letter;
      keyEl.setAttribute('aria-label', letter);
      keyboardState[letter] = 'neutral';
      rowEl.appendChild(keyEl);
    });

    keyboardEl.appendChild(rowEl);
  });

  // Event delegation - tek bir listener
  keyboardEl.addEventListener('click', handleKeyboardClick);
}

function handleKeyboardClick(e) {
  const keyEl = e.target.closest('.key');
  if (!keyEl) return;

  const letter = keyEl.dataset.letter;
  if (!letter) return;

  handleLetterGuess(letter);
}

// Harf tahmini işle
function handleLetterGuess(letter) {
  const state = getGameState();
  if (!state || state.isComplete) return;

  const result = guessLetter(letter);

  switch (result.action) {
    case 'none':
    case 'already_guessed':
      return;

    case 'correct':
      updateKeyLetter(letter, 'correct');
      revealBoxes(state.currentRow, result.revealedPositions, 'correct');
      break;

    case 'wrong':
      updateKeyLetter(letter, 'wrong');
      shakeActiveRow();
      updateLives(state.livesRemaining);
      break;

    case 'row_complete':
      updateKeyLetter(letter, 'correct');
      revealBoxes(state.currentRow, result.revealedPositions, 'correct');
      updateScore(state.totalScore);
      setTransitioning(true);
      setTimeout(() => {
        flashRowComplete(state.currentRow);
        setTimeout(() => {
          advanceRow();
          resetKeyboardColors();
          renderPyramid();
          setTransitioning(false);
        }, 400);
      }, 300);
      break;

    case 'game_over_no_lives':
      updateKeyLetter(letter, 'wrong');
      updateLives(0);
      setTransitioning(true);
      setTimeout(() => {
        revealBoxes(state.currentRow, result.autoRevealedPositions, 'fail');
        shakeActiveRow();
        setTimeout(() => {
          renderPyramid();
          showGameOver();
        }, 800);
      }, 300);
      break;

    case 'game_complete':
      setTransitioning(true);
      updateKeyLetter(letter, 'correct');
      if (result.revealedPositions) {
        revealBoxes(state.currentRow, result.revealedPositions, 'correct');
      }
      updateScore(result.score);
      setTimeout(() => {
        renderPyramid();
        showGameOver();
      }, 600);
      break;
  }
}

// Kutuları animasyonlu aç
function revealBoxes(rowIdx, positions, type) {
  if (!positions) return;
  const state = getGameState();
  const row = state.rowStates[rowIdx];

  positions.forEach((pos, i) => {
    setTimeout(() => {
      const boxEl = pyramidEl.querySelector(`.box[data-row="${rowIdx}"][data-box="${pos}"]`);
      if (!boxEl) return;

      boxEl.classList.add('flipping');
      setTimeout(() => {
        const box = row.boxes[pos];
        boxEl.classList.add(type === 'correct' ? 'revealed-correct' : 'revealed-fail');
        boxEl.innerHTML = `
          <span class="letter-display">${box.letter}</span>
          <span class="number-badge">${box.number}</span>
        `;
        boxEl.classList.remove('flipping');
      }, 250);
    }, i * 100);
  });
}

// Klavye tuşunu renklendirme
function updateKeyLetter(letter, state) {
  keyboardState[letter] = state;
  const keyEl = keyboardEl.querySelector(`.key[data-letter="${letter}"]`);
  if (keyEl) {
    keyEl.classList.remove('correct', 'wrong');
    keyEl.classList.add(state);
  }
}

// Tüm klavye renklerini sıfırla
function resetKeyboardColors() {
  Object.keys(keyboardState).forEach(letter => {
    keyboardState[letter] = 'neutral';
  });
  keyboardEl.querySelectorAll('.key').forEach(keyEl => {
    keyEl.classList.remove('correct', 'wrong', 'disabled');
  });
}

// Aktif satırı salla (yanlış tahmin)
function shakeActiveRow() {
  const state = getGameState();
  const rowEl = pyramidEl.querySelector(`.pyramid-row[data-row="${state.currentRow}"]`);
  if (rowEl) {
    rowEl.classList.add('shake');
    setTimeout(() => rowEl.classList.remove('shake'), 400);
  }
}

// Satır tamamlanma animasyonu
function flashRowComplete(rowIdx) {
  const rowEl = pyramidEl.querySelector(`.pyramid-row[data-row="${rowIdx}"]`);
  if (rowEl) {
    rowEl.classList.add('row-complete-flash');
    setTimeout(() => rowEl.classList.remove('row-complete-flash'), 400);
  }
}

// Skor güncelle
export function updateScore(score) {
  if (scoreValueEl) {
    scoreValueEl.textContent = score;
  }
}

// Canları göster
export function renderLives(count) {
  if (!livesHeartsEl) return;
  livesHeartsEl.innerHTML = '';

  const state = getGameState();
  const totalLives = state?.totalLives ?? 30;
  
  // Kalp listesi yerine sayı göster
  const heart = document.createElement('div');
  heart.className = 'lives-count';
  heart.innerHTML = `<span>${count}</span><span class="lives-total">/${totalLives}</span>`;
  livesHeartsEl.appendChild(heart);
}

function updateLives(remaining) {
  renderLives(remaining);
}

// Gün numarasını göster
export function renderDayNumber(dayNum) {
  if (dayNumberEl) {
    if (typeof dayNum === 'number') {
      dayNumberEl.textContent = `#${dayNum}`;
      return;
    }
    dayNumberEl.textContent = dayNum;
  }
}

// Fiziksel klavye desteği
export function setupPhysicalKeyboard() {
  document.addEventListener('keydown', (e) => {
    const dailyPage = document.getElementById('daily-page');
    if (!dailyPage || !dailyPage.classList.contains('page-active')) return;

    if (e.ctrlKey || e.altKey || e.metaKey) return;

    let char = e.key;
    // Türkçe dönüşüm
    if (char === 'i') char = 'İ';
    else if (char === 'ı') char = 'I';
    else char = char.toLocaleUpperCase('tr-TR');

    if (TURKISH_ALPHABET.includes(char)) {
      e.preventDefault();
      handleLetterGuess(char);
    }
  });
}

// Modal yönetimi
function setupModals() {
  // Help modal
  const helpBtn = document.getElementById('help-btn');
  const helpModal = document.getElementById('help-modal');
  const helpClose = document.getElementById('help-close');

  helpBtn.addEventListener('click', () => helpModal.classList.add('show'));
  helpClose.addEventListener('click', () => helpModal.classList.remove('show'));
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.classList.remove('show');
  });

  // Stats modal
  const statsBtn = document.getElementById('stats-btn');
  const statsModal = document.getElementById('stats-modal');
  const statsClose = document.getElementById('stats-close');

  statsBtn.addEventListener('click', () => {
    renderStatsModal();
    statsModal.classList.add('show');
  });
  statsClose.addEventListener('click', () => statsModal.classList.remove('show'));
  statsModal.addEventListener('click', (e) => {
    if (e.target === statsModal) statsModal.classList.remove('show');
  });

  // Game over modal
  const gameoverClose = document.getElementById('gameover-close');
  const gameoverModal = document.getElementById('gameover-modal');
  gameoverClose.addEventListener('click', () => gameoverModal.classList.remove('show'));
  gameoverModal.addEventListener('click', (e) => {
    if (e.target === gameoverModal) gameoverModal.classList.remove('show');
  });

  // Share button
  const shareBtn = document.getElementById('share-btn');
  const shareOptions = document.getElementById('share-options');
  shareBtn.addEventListener('click', () => {
    shareOptions.classList.toggle('show');
  });

  // WhatsApp share
  const shareWhatsApp = document.getElementById('share-whatsapp');
  shareWhatsApp.addEventListener('click', () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  });

  // Twitter share
  const shareTwitter = document.getElementById('share-twitter');
  shareTwitter.addEventListener('click', () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  });

  // Copy to clipboard
  const shareCopy = document.getElementById('share-copy');
  shareCopy.addEventListener('click', () => {
    const text = getShareText();
    navigator.clipboard.writeText(text).then(() => {
      const toast = document.getElementById('share-toast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    });
  });
}

// İstatistik modalı render et
function renderStatsModal() {
  const stats = getStats();
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = `
    <div class="stat-item">
      <div class="stat-value">${stats.gamesPlayed}</div>
      <div class="stat-label">Oyun</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${stats.averageScore}</div>
      <div class="stat-label">Ort. Skor</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${stats.currentStreak}</div>
      <div class="stat-label">Seri</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${stats.maxStreak}</div>
      <div class="stat-label">En İyi Seri</div>
    </div>
  `;
}

// Game Over ekranı
export function showGameOver() {
  const state = getGameState();
  if (!state) return;

  const modal = document.getElementById('gameover-modal');
  const titleEl = document.getElementById('gameover-title');
  const scoreEl = document.getElementById('gameover-score');
  const rowsEl = document.getElementById('gameover-rows');
  const nextEl = document.getElementById('next-game');

  const allSuccess = state.rowScores.every(s => s > 0);
  titleEl.textContent = allSuccess ? 'Tebrikler!' : 'Oyun Bitti';

  const total = state.totalScore;
  scoreEl.innerHTML = `${total}<span class="max-score">/150</span>`;

  // Satır puanları
  rowsEl.innerHTML = '';
  state.rowScores.forEach((score, idx) => {
    const dot = document.createElement('div');
    dot.className = 'gameover-row-dot';
    dot.textContent = score;
    const rowLength = idx + 1;
    const maxRowScore = rowLength * 5;
    const ratio = score / maxRowScore;
    
    if (ratio >= 0.75) dot.style.background = '#27AE60';
    else if (ratio >= 0.5) dot.style.background = '#F39C12';
    else if (ratio >= 0.25) dot.style.background = '#E67E22';
    else dot.style.background = '#E74C3C';
    rowsEl.appendChild(dot);
  });

  // Geri sayım
  startCountdown(nextEl);

  modal.classList.add('show');
}

// Gece yarısına geri sayım
function startCountdown(container) {
  function update() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow - now;

    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');

    container.innerHTML = `
      <div>Yeni piramit:</div>
      <div class="countdown">${h}:${m}:${s}</div>
    `;
  }

  update();
  setInterval(update, 1000);
}

// Bugün daha önce oynanmışsa sonuç ekranını göster
export function showPreviousResult() {
  const result = getTodayResult();
  if (!result) return false;

  const modal = document.getElementById('gameover-modal');
  const titleEl = document.getElementById('gameover-title');
  const scoreEl = document.getElementById('gameover-score');
  const rowsEl = document.getElementById('gameover-rows');
  const nextEl = document.getElementById('next-game');

  const allSuccess = result.rowScores.every(s => s > 0);
  titleEl.textContent = allSuccess ? 'Tebrikler!' : 'Oyun Bitti';

  scoreEl.innerHTML = `${result.totalScore}<span class="max-score">/150</span>`;

  rowsEl.innerHTML = '';
  result.rowScores.forEach((score, idx) => {
    const dot = document.createElement('div');
    dot.className = 'gameover-row-dot';
    dot.textContent = score;
    const rowLength = idx + 1;
    const maxRowScore = rowLength * 5;
    const ratio = score / maxRowScore;
    
    if (ratio >= 0.75) dot.style.background = '#27AE60';
    else if (ratio >= 0.5) dot.style.background = '#F39C12';
    else if (ratio >= 0.25) dot.style.background = '#E67E22';
    else dot.style.background = '#E74C3C';
    rowsEl.appendChild(dot);
  });

  startCountdown(nextEl);
  modal.classList.add('show');

  return true;
}
