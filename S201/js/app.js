import {DOMManager} from './DOMManager.js';
import {Game} from './Game.js';
import {ApiService} from './ApiService.js';

const domManager = new DOMManager();
const game = new Game();

// Gestion du bouton Abandonner
document.getElementById('abandon').addEventListener('click', async function() {
  if (confirm("Êtes-vous sûr de vouloir abandonner la partie ?")) {
    await game.endGame();

    document.querySelector('.setup-form').classList.remove('hidden');
    document.querySelector('.game-area').classList.add('hidden');

    document.querySelector('.game-board').innerHTML = '';
  }
});

document.querySelector('.game-form').addEventListener('submit', async function (event) {
  event.preventDefault();

  const pseudoInput = document.getElementById('pseudo').value;
  const selectElement = document.getElementById('pack-select');
  const selectedPackName = selectElement ? selectElement.value : 'differenttypes';

  const difficultyElement = document.getElementById('difficulty-select');
  const difficultyLevel = difficultyElement ? difficultyElement.value : 4;

  document.querySelector('.setup-form').classList.add('hidden');
  document.querySelector('.game-area').classList.remove('hidden');

  try {
    const data = await ApiService.createGame(pseudoInput, difficultyLevel);
    console.log('Success:', data);

    game.startGame(data.id, selectedPackName, domManager, difficultyLevel);
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'Erreur lors de la création de la partie');

    document.querySelector('.setup-form').classList.remove('hidden');
    document.querySelector('.game-area').classList.add('hidden');
  }
});