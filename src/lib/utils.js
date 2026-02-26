import { TURKISH_ALPHABET, WORD_SETS } from './words';

// Epoch: 6 Şubat 2026
const EPOCH = new Date(2026, 1, 6);

// Mulberry32 seeded PRNG
export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getDayNumber() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today - EPOCH;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shuffle(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function selectDailyWords(dayNumber) {
  const rng = mulberry32(dayNumber);
  const index = Math.floor(rng() * WORD_SETS.length);
  return WORD_SETS[index];
}

export function generateMapping(dayNumber) {
  const rng = mulberry32(dayNumber * 31 + 7);
  const numbers = Array.from({ length: 29 }, (_, i) => i + 1);
  const shuffled = shuffle(numbers, rng);

  const letterToNumber = {};
  const numberToLetter = {};
  TURKISH_ALPHABET.forEach((letter, idx) => {
    letterToNumber[letter] = shuffled[idx];
    numberToLetter[shuffled[idx]] = letter;
  });

  return { letterToNumber, numberToLetter };
}

export function calculateRowScore(wrongCount, maxWrong, rowLength) {
  const basePoints = rowLength * 5;
  const penalty = wrongCount * 0.25;
  const multiplier = Math.max(0, 1 - penalty);
  return Math.floor(basePoints * multiplier);
}

export function calculateFinalScore(rowScores, totalErrors, livesRemaining) {
  const base = rowScores.reduce((sum, s) => sum + s, 0);
  let bonus = 0;
  const allCompleted = rowScores.every((s) => s > 0);
  if (allCompleted) bonus += 20;
  if (allCompleted && livesRemaining >= 10) bonus += 25;
  return base + bonus;
}
