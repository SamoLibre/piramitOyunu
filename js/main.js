import { initGame, getGameState, hasPlayedToday, markGameComplete } from './game.js';
import {
  initUI,
  renderPyramid,
  renderKeyboard,
  renderLives,
  renderDayNumber,
  updateScore,
  setupPhysicalKeyboard,
  showPreviousResult
} from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // Oyunu başlat
  const state = initGame();

  // UI'ı başlat
  initUI();

  // Gün numarasını göster
  renderDayNumber(state.dayNumber);

  // Piramidi render et
  renderPyramid();

  // Klavyeyi render et
  renderKeyboard();

  // Canları göster
  renderLives(3);

  // Skoru göster
  updateScore(0);

  // Fiziksel klavye desteği
  setupPhysicalKeyboard();

  // Daha önce oynanmışsa sonucu göster ve oyunu kilitle
  if (hasPlayedToday()) {
    markGameComplete();
    showPreviousResult();
  }

  // İlk kez oynuyorsa help modalı göster
  if (!localStorage.getItem('piramit-played-before') && !hasPlayedToday()) {
    setTimeout(() => {
      document.getElementById('help-modal').classList.add('show');
      localStorage.setItem('piramit-played-before', 'true');
    }, 500);
  }
});
