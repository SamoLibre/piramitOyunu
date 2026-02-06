import { getDayNumber, getTodayString, selectDailyWords, generateMapping, calculateRowScore, calculateFinalScore } from './utils.js';

const MAX_WRONG_PER_ROW = 3;

let gameState = null;
let transitioning = false;

export function getGameState() {
  return gameState;
}

export function setTransitioning(value) {
  transitioning = value;
}

export function initGame() {
  const dayNumber = getDayNumber();
  const words = selectDailyWords(dayNumber);
  const { letterToNumber, numberToLetter } = generateMapping(dayNumber);

  const rowStates = words.map((word, index) => {
    const letters = [...word];
    const boxes = letters.map(letter => ({
      number: letterToNumber[letter],
      letter: letter,
      revealed: false,
      revealType: null // 'correct' veya 'fail'
    }));

    return {
      word: word,
      boxes: boxes,
      guessedLetters: [],
      wrongCount: 0,
      status: index === 0 ? 'active' : 'pending'
    };
  });

  gameState = {
    dayNumber,
    words,
    letterToNumber,
    numberToLetter,
    currentRow: 0,
    rowStates,
    rowScores: [0, 0, 0, 0, 0, 0],
    totalScore: 0,
    maxWrongPerRow: MAX_WRONG_PER_ROW,
    isComplete: false
  };

  return gameState;
}

// Oyunu tamamlandı olarak işaretle (bugün zaten oynandıysa)
export function markGameComplete() {
  if (gameState) {
    gameState.isComplete = true;
  }
}

// Harf tahmin et - sonuç döndür
export function guessLetter(letter) {
  if (!gameState || gameState.isComplete || transitioning) {
    return { action: 'none' };
  }

  const row = gameState.rowStates[gameState.currentRow];

  // Zaten tahmin edilmiş harfi tekrar kabul etme
  if (row.guessedLetters.includes(letter)) {
    return { action: 'already_guessed' };
  }

  row.guessedLetters.push(letter);

  // Kelimede bu harf var mı?
  const wordLetters = [...row.word];
  const isCorrect = wordLetters.includes(letter);

  if (isCorrect) {
    // Tüm eşleşen pozisyonları aç
    const revealedPositions = [];
    row.boxes.forEach((box, idx) => {
      if (box.letter === letter && !box.revealed) {
        box.revealed = true;
        box.revealType = 'correct';
        revealedPositions.push(idx);
      }
    });

    // Satır tamamlandı mı?
    const rowComplete = row.boxes.every(box => box.revealed);

    if (rowComplete) {
      const score = calculateRowScore(row.wrongCount, gameState.maxWrongPerRow);
      gameState.rowScores[gameState.currentRow] = score;
      gameState.totalScore = gameState.rowScores.reduce((s, v) => s + v, 0);
      row.status = 'completed';

      // Son satır mıydı?
      if (gameState.currentRow >= 5) {
        gameState.isComplete = true;
        gameState.totalScore = calculateFinalScore(gameState.rowScores);
        saveResult();
        return { action: 'game_complete', correct: true, revealedPositions, score: gameState.totalScore };
      }

      return { action: 'row_complete', correct: true, revealedPositions, rowScore: score };
    }

    return { action: 'correct', revealedPositions };
  } else {
    // Yanlış tahmin
    row.wrongCount++;

    // Satır başarısız mı?
    if (row.wrongCount >= gameState.maxWrongPerRow) {
      // Kalan harfleri gri olarak aç
      const autoRevealedPositions = [];
      row.boxes.forEach((box, idx) => {
        if (!box.revealed) {
          box.revealed = true;
          box.revealType = 'fail';
          autoRevealedPositions.push(idx);
        }
      });

      gameState.rowScores[gameState.currentRow] = 0;
      gameState.totalScore = gameState.rowScores.reduce((s, v) => s + v, 0);
      row.status = 'failed';

      // Son satır mıydı?
      if (gameState.currentRow >= 5) {
        gameState.isComplete = true;
        gameState.totalScore = calculateFinalScore(gameState.rowScores);
        saveResult();
        return { action: 'game_complete', correct: false, autoRevealedPositions, score: gameState.totalScore };
      }

      return { action: 'row_failed', autoRevealedPositions, wrongCount: row.wrongCount };
    }

    return { action: 'wrong', wrongCount: row.wrongCount };
  }
}

// Sonraki satıra geç
export function advanceRow() {
  if (!gameState || gameState.isComplete) return false;
  if (gameState.currentRow >= 5) return false;

  gameState.currentRow++;
  gameState.rowStates[gameState.currentRow].status = 'active';
  return true;
}

// Paylaşım metni oluştur
export function getShareText() {
  if (!gameState) return '';

  const dayNum = gameState.dayNumber;
  const total = gameState.totalScore;
  const maxScore = 20;

  // Her satır için emoji
  const rowEmojis = gameState.rowScores.map(score => {
    if (score === 3) return '\u{1F7E9}'; // yeşil kare
    if (score === 2) return '\u{1F7E8}'; // sarı kare
    if (score === 1) return '\u{1F7E7}'; // turuncu kare
    return '\u{1F7E5}'; // kırmızı kare
  }).join('');

  return `Piramit #${dayNum} ${total}/${maxScore}\n${rowEmojis}`;
}

// Sonucu localStorage'a kaydet
function saveResult() {
  if (!gameState) return;
  const key = `piramit-${getTodayString()}`;
  const result = {
    dayNumber: gameState.dayNumber,
    totalScore: gameState.totalScore,
    rowScores: gameState.rowScores,
    date: getTodayString()
  };
  localStorage.setItem(key, JSON.stringify(result));

  // İstatistikleri güncelle
  updateStats(result);
}

// İstatistikleri güncelle
function updateStats(result) {
  const statsKey = 'piramit-stats';
  let stats = JSON.parse(localStorage.getItem(statsKey) || '{}');

  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
  stats.totalPoints = (stats.totalPoints || 0) + result.totalScore;
  stats.averageScore = Math.round((stats.totalPoints / stats.gamesPlayed) * 10) / 10;

  // Seri takibi
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = `piramit-${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  const playedYesterday = localStorage.getItem(yKey) !== null;

  if (playedYesterday) {
    stats.currentStreak = (stats.currentStreak || 0) + 1;
  } else {
    stats.currentStreak = 1;
  }
  stats.maxStreak = Math.max(stats.maxStreak || 0, stats.currentStreak);

  localStorage.setItem(statsKey, JSON.stringify(stats));
}

// Bugün oynandı mı?
export function hasPlayedToday() {
  const key = `piramit-${getTodayString()}`;
  return localStorage.getItem(key) !== null;
}

// Bugünün sonucunu getir
export function getTodayResult() {
  const key = `piramit-${getTodayString()}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

// İstatistikleri getir
export function getStats() {
  const statsKey = 'piramit-stats';
  return JSON.parse(localStorage.getItem(statsKey) || '{"gamesPlayed":0,"totalPoints":0,"averageScore":0,"currentStreak":0,"maxStreak":0}');
}
