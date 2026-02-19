import { initGame, initGameWithWords, hasPlayedToday, markGameComplete } from './game.js';
import { WORD_SETS, ENDLESS_CATEGORY_SETS } from './words.js';
import {
  initUI,
  renderPyramid,
  renderKeyboard,
  renderLives,
  renderDayNumber,
  updateScore,
  setupPhysicalKeyboard,
  showPreviousResult,
  resetHintUI
} from './ui.js';

const VIEWS = {
  home: 'home-page',
  daily: 'daily-page',
  endless: 'endless-page',
  profile: 'profile-page'
};

const ENDLESS_POOLS = {
  random: WORD_SETS,
  doga: ENDLESS_CATEGORY_SETS.doga,
  gunluk: ENDLESS_CATEGORY_SETS.gunluk,
  nesne: ENDLESS_CATEGORY_SETS.nesne
};

const MODE_LABELS = {
  random: 'Sonsuz • Rastgele',
  doga: 'Sonsuz • Doğa',
  gunluk: 'Sonsuz • Günlük Yaşam',
  nesne: 'Sonsuz • Nesneler'
};

let currentView = 'daily';

function sanitizeSet(wordSet) {
  return wordSet.map(word => [...word].slice(0, Math.min(6, [...word].length)).join(''));
}

function pickEndlessWords(modeKey) {
  const pool = ENDLESS_POOLS[modeKey] || ENDLESS_POOLS.random;
  const idx = Math.floor(Math.random() * pool.length);
  return sanitizeSet(pool[idx]);
}

function switchView(view) {
  currentView = view;

  Object.values(VIEWS).forEach(id => {
    const page = document.getElementById(id);
    if (page) page.classList.remove('page-active');
  });

  const activeId = VIEWS[view];
  const activePage = document.getElementById(activeId);
  if (activePage) activePage.classList.add('page-active');

  document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.view === view);
  });
}

function bootstrapGame(state, labelText = '') {
  renderDayNumber(labelText || `#${state.dayNumber}`);
  renderPyramid();
  renderKeyboard();
  renderLives(state.livesRemaining);
  updateScore(0);
  resetHintUI();
}

function startDailyGame() {
  const state = initGame();
  bootstrapGame(state, `#${state.dayNumber}`);

  if (hasPlayedToday()) {
    markGameComplete();
    showPreviousResult();
  }
}

function startEndlessGame(modeKey) {
  const words = pickEndlessWords(modeKey);
  const seed = Math.floor(Math.random() * 1000000);
  const state = initGameWithWords(words, {
    mode: 'infinite',
    modeLabel: MODE_LABELS[modeKey] || MODE_LABELS.random,
    seed,
    dayNumber: seed
  });

  bootstrapGame(state, state.modeLabel);
  switchView('daily');
}

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  setupPhysicalKeyboard();

  document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view && VIEWS[view]) {
        switchView(view);
      }
    });
  });

  const goDailyBtn = document.getElementById('go-daily-btn');
  if (goDailyBtn) {
    goDailyBtn.addEventListener('click', () => switchView('daily'));
  }

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode || 'random';
      startEndlessGame(mode);
    });
  });

  startDailyGame();
  switchView(currentView);

  if (!localStorage.getItem('piramit-played-before') && !hasPlayedToday()) {
    setTimeout(() => {
      document.getElementById('help-modal').classList.add('show');
      localStorage.setItem('piramit-played-before', 'true');
    }, 500);
  }
});
