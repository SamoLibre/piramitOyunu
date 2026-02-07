import { TURKISH_ALPHABET, WORD_SETS } from './words.js';

// Epoch: 6 Şubat 2026
const EPOCH = new Date(2026, 1, 6);

// Mulberry32 seeded PRNG
export function mulberry32(seed) {
  return function() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Bugünün gün numarasını hesapla (epoch'tan itibaren)
export function getDayNumber() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today - EPOCH;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Bugünün tarih stringi (localStorage key için)
export function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Fisher-Yates shuffle (seeded RNG ile)
function shuffle(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Günlük kelime setini seç
export function selectDailyWords(dayNumber) {
  const rng = mulberry32(dayNumber);
  const index = Math.floor(rng() * WORD_SETS.length);
  return WORD_SETS[index];
}

// Harf-sayı eşlemesi oluştur (bijektif: her harf benzersiz bir sayı)
export function generateMapping(dayNumber) {
  const rng = mulberry32(dayNumber * 31 + 7); // Kelime seçiminden farklı seed
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

// Türkçe büyük harf dönüşümü (İ/I özel durumu)
export function toTurkishUpper(char) {
  if (char === 'i') return 'İ';
  if (char === 'ı') return 'I';
  return char.toLocaleUpperCase('tr-TR');
}

// Satır puanını hesapla - daha mantıklı puanlama
// Her satır kendi harf sayısına göre puan verir
// 1 harf = 5 puan, 2 harf = 10 puan... 6 harf = 30 puan
// Her yanlış tahminde -%25 ceza
export function calculateRowScore(wrongCount, maxWrong, rowLength) {
  const basePoints = rowLength * 5; // Her harf 5 puan değerinde
  const penalty = wrongCount * 0.25; // Her hata %25 azaltır
  const multiplier = Math.max(0, 1 - penalty);
  return Math.floor(basePoints * multiplier);
}

// Toplam puanı hesapla (bonus dahil)
// Maksimum puan: 5+10+15+20+25+30 = 105
// Bonus: Tüm satırlar mükemmel (0 hata) = +20
// Bonus: Hiç hata yapılmadan bitirildi = +25
export function calculateFinalScore(rowScores, totalErrors, livesRemaining) {
  const base = rowScores.reduce((sum, s) => sum + s, 0);
  let bonus = 0;
  
  // Tüm satırları tamamlama bonusu
  const allCompleted = rowScores.every(s => s > 0);
  if (allCompleted) {
    bonus += 20;
  }
  
  // Mükemmel oyun bonusu (10 can veya daha fazla kalmışsa)
  if (allCompleted && livesRemaining >= 10) {
    bonus += 25;
  }
  
  return base + bonus;
}
