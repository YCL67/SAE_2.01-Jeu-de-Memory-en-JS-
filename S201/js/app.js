import {DOMManager} from './DOMManager.js';
import {Game} from './Game.js';
import {ApiService} from './ApiService.js';

const domManager = new DOMManager();
const game = new Game();

const endTitle = document.getElementById('end-title');
endTitle.style.textAlign = 'center';
endTitle.style.marginBottom = '1.5rem';
endTitle.style.color = 'white';

const endMessage = document.getElementById('end-message');
endMessage.style.textAlign = 'center';
endMessage.style.fontSize = '1.2rem';
endMessage.style.marginBottom = '1.5rem';
endMessage.style.color = 'white';
const btnReplay = document.getElementById('btn-replay');
btnReplay.style.width = '100%';
btnReplay.style.padding = '15px';
btnReplay.style.backgroundColor = '#4CAF50';
btnReplay.style.color = 'white';
btnReplay.style.fontSize = '1.2rem';
btnReplay.style.fontWeight = 'bold';
btnReplay.style.border = 'none';
btnReplay.style.borderRadius = '8px';
btnReplay.style.cursor = 'pointer';
btnReplay.style.marginTop = '10px';



btnReplay.addEventListener('click', () => {
  document.getElementById('end-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
});


document.getElementById('abandon').addEventListener('click', async function() {
  if (confirm("Êtes-vous sûr de vouloir abandonner la partie ?")) {
    await game.endGame();

    const temps = game.formattedTime;

    document.getElementById('end-title').textContent = "Partie abandonnée...";
    document.getElementById('end-message').textContent = `Temps restant à l'abandon : ${temps}. La prochaine fois vous y arriverez !`;

    document.querySelector('.game-area').classList.add('hidden');
    document.getElementById('end-screen').classList.remove('hidden');

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

  const isChronoMode = document.getElementById('chrono-mode').checked;

  document.getElementById('start-screen').classList.add('hidden');
  document.querySelector('.game-area').classList.remove('hidden');

  try {
    const data = await ApiService.createGame(pseudoInput, difficultyLevel);
    console.log('Success:', data);

    game.startGame(data.id, selectedPackName, domManager, difficultyLevel, isChronoMode);
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'Erreur lors de la création de la partie');

    document.getElementById('start-screen').classList.remove('hidden');
    document.querySelector('.game-area').classList.add('hidden');
  }
});