import {DOMManager} from './DOMManager.js';
import {Game} from './Game.js';
import {ApiService} from './ApiService.js';

const domManager = new DOMManager();
const game = new Game();


document.querySelector('.game-form').addEventListener('submit', async function (event) {
  event.preventDefault();

  const pseudoInput = document.getElementById('pseudo').value; // Ici on récupère le pseudo inscrit
  const selectElement = document.getElementById('pack-select'); // On récupère le paquet choisi par le joueur dans le formulaire
  const selectedPackName = selectElement ? selectElement.value : 'diferenttypes'; // Par défaut, le pack choisi sera "diferenttypes" si l'élément n'est pas trouvé.

  const difficultyElement = document.getElementById('difficulty-select');
  const difficultyLevel = difficultyElement ? difficultyElement.value : 1;

  document.querySelector('.setup-form').classList.add('hidden'); // On cache le form car la partie est lancée
  document.querySelector('.game-area').classList.remove('hidden'); // On affiche la zone de jeu car la partie est lancée


  try {
    // On envoie la vraie difficulté choisie à l'API
    const data = await ApiService.createGame(pseudoInput, difficultyLevel);
    console.log('Success:', data);

    // On lance le jeu avec la bonne difficulté
    game.startGame(data.id, selectedPackName, domManager, difficultyLevel);
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'Erreur lors de la création de la partie');

    document.querySelector('.setup-form').classList.remove('hidden');
    document.querySelector('.game-area').classList.add('hidden');
  }
});
