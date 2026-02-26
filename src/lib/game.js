import {
  getDayNumber, getTodayString, selectDailyWords,
  generateMapping, calculateRowScore, calculateFinalScore
} from './utils';

const MAX_WRONG_PER_ROW = 3;
const TOTAL_LIVES = 30;

// ======== State fabrikası ========

export function createGameState({ dayNumber, words, mappingSeed, mode, modeLabel = '' }) {
  const { letterToNumber, numberToLetter } = generateMapping(mappingSeed);

  const rowStates = words.map((word, index) => {
    const letters = [...word];
    const boxes = letters.map((letter) => ({
      number: letterToNumber[letter],
      letter,
      revealed: false,
      revealType: null,
    }));
    return {
      word,
      boxes,
      guessedLetters: [],
      wrongCount: 0,
      status: index === 0 ? 'active' : 'pending',
    };
  });

  return {
    dayNumber,
    mode,
    modeLabel,
    words,
    letterToNumber,
    numberToLetter,
    currentRow: 0,
    rowStates,
    rowScores: [0, 0, 0, 0, 0, 0],
    totalScore: 0,
    maxWrongPerRow: MAX_WRONG_PER_ROW,
    isComplete: false,
    totalLives: TOTAL_LIVES,
    livesRemaining: TOTAL_LIVES,
  };
}

export function initDailyGame() {
  const dayNumber = getDayNumber();
  const words = selectDailyWords(dayNumber);
  return createGameState({ dayNumber, words, mappingSeed: dayNumber, mode: 'daily' });
}

export function initEndlessGame(words, options = {}) {
  const seed = options.seed ?? Math.floor(Date.now() / 1000);
  return createGameState({
    dayNumber: options.dayNumber ?? getDayNumber(),
    words,
    mappingSeed: seed,
    mode: 'infinite',
    modeLabel: options.modeLabel || '',
  });
}

// ======== Oyun aksiyonları (immutable) ========
// Her fonksiyon yeni state döndürür

export function guessLetter(state, letter) {
  if (!state || state.isComplete) return { state, result: { action: 'none' } };

  const newState = structuredClone(state);
  const row = newState.rowStates[newState.currentRow];

  if (row.guessedLetters.includes(letter)) {
    return { state: newState, result: { action: 'already_guessed' } };
  }

  row.guessedLetters.push(letter);
  const wordLetters = [...row.word];
  const isCorrect = wordLetters.includes(letter);

  if (isCorrect) {
    const revealedPositions = [];
    row.boxes.forEach((box, idx) => {
      if (box.letter === letter && !box.revealed) {
        box.revealed = true;
        box.revealType = 'correct';
        revealedPositions.push(idx);
      }
    });

    const rowComplete = row.boxes.every((b) => b.revealed);

    if (rowComplete) {
      const score = calculateRowScore(row.wrongCount, newState.maxWrongPerRow, row.boxes.length);
      newState.rowScores[newState.currentRow] = score;
      newState.totalScore = newState.rowScores.reduce((s, v) => s + v, 0);
      row.status = 'completed';

      if (newState.currentRow >= 5) {
        newState.isComplete = true;
        newState.totalScore = calculateFinalScore(newState.rowScores, 0, newState.livesRemaining);
        return { state: newState, result: { action: 'game_complete', correct: true, revealedPositions, score: newState.totalScore } };
      }
      return { state: newState, result: { action: 'row_complete', correct: true, revealedPositions, rowScore: score } };
    }
    return { state: newState, result: { action: 'correct', revealedPositions } };
  } else {
    row.wrongCount++;
    newState.livesRemaining--;

    if (newState.livesRemaining <= 0) {
      const autoRevealedPositions = [];
      row.boxes.forEach((box, idx) => {
        if (!box.revealed) {
          box.revealed = true;
          box.revealType = 'fail';
          autoRevealedPositions.push(idx);
        }
      });
      newState.rowScores[newState.currentRow] = 0;
      row.status = 'failed';
      newState.isComplete = true;
      const totalErrors = newState.rowStates.reduce((sum, r) => sum + r.wrongCount, 0);
      newState.totalScore = calculateFinalScore(newState.rowScores, totalErrors, 0);
      return { state: newState, result: { action: 'game_over_no_lives', autoRevealedPositions, score: newState.totalScore } };
    }
    return { state: newState, result: { action: 'wrong', wrongCount: row.wrongCount } };
  }
}

export function advanceRow(state) {
  if (!state || state.isComplete || state.currentRow >= 5) return state;
  const newState = structuredClone(state);
  newState.currentRow++;
  newState.rowStates[newState.currentRow].status = 'active';
  return newState;
}

// ======== Yardımcılar ========

export function getShareText(state) {
  if (!state) return '';
  const rowEmojis = state.rowScores.map((score, idx) => {
    const rowLength = idx + 1;
    const maxRowScore = rowLength * 5;
    const ratio = score / maxRowScore;
    if (ratio >= 0.75) return '🟩';
    if (ratio >= 0.5) return '🟨';
    if (ratio >= 0.25) return '🟧';
    return '🟥';
  }).join('');

  return `🔺 Piramit #${state.dayNumber}\n📊 Skor: ${state.totalScore}/150\n❤️ Can: ${state.livesRemaining}/${state.totalLives}\n\n${rowEmojis}`;
}

export function getHintLetter(state) {
  if (!state || state.isComplete) return null;
  const row = state.rowStates[state.currentRow];
  if (!row) return null;
  const unrevealed = row.boxes.filter((b) => !b.revealed).map((b) => b.letter);
  if (unrevealed.length === 0) return null;
  return unrevealed[Math.floor(Math.random() * unrevealed.length)];
}

// ======== LocalStorage ========

export function saveResult(state) {
  if (!state || (state.mode && state.mode !== 'daily')) return;
  const key = `piramit-${getTodayString()}`;
  const result = {
    dayNumber: state.dayNumber,
    totalScore: state.totalScore,
    rowScores: state.rowScores,
    date: getTodayString(),
  };
  localStorage.setItem(key, JSON.stringify(result));
  updateStats(result);
}

function updateStats(result) {
  const statsKey = 'piramit-stats';
  let stats = JSON.parse(localStorage.getItem(statsKey) || '{}');

  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
  stats.totalPoints = (stats.totalPoints || 0) + result.totalScore;
  stats.averageScore = Math.round((stats.totalPoints / stats.gamesPlayed) * 10) / 10;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = `piramit-${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  const playedYesterday = localStorage.getItem(yKey) !== null;

  stats.currentStreak = playedYesterday ? (stats.currentStreak || 0) + 1 : 1;
  stats.maxStreak = Math.max(stats.maxStreak || 0, stats.currentStreak);

  localStorage.setItem(statsKey, JSON.stringify(stats));
}

export function hasPlayedToday() {
  if (typeof window === 'undefined') return false;
  const key = `piramit-${getTodayString()}`;
  return localStorage.getItem(key) !== null;
}

export function getTodayResult() {
  if (typeof window === 'undefined') return null;
  const key = `piramit-${getTodayString()}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

export function getStats() {
  if (typeof window === 'undefined') return { gamesPlayed: 0, totalPoints: 0, averageScore: 0, currentStreak: 0, maxStreak: 0 };
  const statsKey = 'piramit-stats';
  return JSON.parse(localStorage.getItem(statsKey) || '{"gamesPlayed":0,"totalPoints":0,"averageScore":0,"currentStreak":0,"maxStreak":0}');
}
