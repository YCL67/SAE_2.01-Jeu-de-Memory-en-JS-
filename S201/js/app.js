import { DOMManager } from './DOMManager.js';
import { Game } from './Game.js';
import { ApiService } from './ApiService.js';


const domManager = new DOMManager();
const game = new Game();


/**
 * Bouton "Retour à l'accueil" (Écran de fin)
 * Permet de relancer une nouvelle partie en réaffichant le formulaire.
 */
document.getElementById('btn-replay').addEventListener('click', () => {
  document.getElementById('end-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
});

/**
 * Bouton "Abandonner la partie" (En jeu)
 * Stoppe le jeu en cours et affiche un message d'encouragement.
 */

document.getElementById('abandon').addEventListener('click', async function() {
  // Petite confirmation pour éviter les clics accidentels
  if (confirm("Êtes-vous sûr de vouloir abandonner la partie ?")) {
    // On appelle la fonction de fin de jeu pour couper le chrono et prévenir le serveur
    await game.endGame();

    const temps = game.formattedTime;

    // Mise à jour de l'interface pour l'abandon
    document.getElementById('end-title').textContent = "Partie abandonnée...";
    document.getElementById('end-message').textContent = `Temps à l'abandon : ${temps}. La prochaine fois vous y arriverez !`;

    // Bascule des écrans
    document.querySelector('.game-area').classList.add('hidden');
    document.getElementById('end-screen').classList.remove('hidden');
    document.querySelector('.game-board').innerHTML = '';
  }
});

/**
 * Formulaire principal "Démarrer la partie"
 * Récupère les choix de l'utilisateur, contacte l'API, et lance le jeu.
 */
document.querySelector('.game-form').addEventListener('submit', async function (event) {
  // Empêche le rechargement classique de la page lors de la soumission du formulaire
  event.preventDefault();

  // Récupération des données du formulaire
  const pseudoInput = document.getElementById('pseudo').value;

  const selectElement = document.getElementById('pack-select');
  const selectedPackName = selectElement ? selectElement.value : 'differenttypes';

  const difficultyElement = document.getElementById('difficulty-select');
  const difficultyLevel = difficultyElement ? difficultyElement.value : 4;

  const isChronoMode = document.getElementById('chrono-mode').checked;

  // On masque le menu et on affiche le plateau de jeu
  document.getElementById('start-screen').classList.add('hidden');
  document.querySelector('.game-area').classList.remove('hidden');

  try {
    // Appel API : Création de la partie
    const data = await ApiService.createGame(pseudoInput, difficultyLevel);
    console.log('Partie créée avec succès via API:', data);

    // Lancement de la logique
    // On transmet toutes les informations récoltées à l'instance de Game
    game.startGame(data.id, selectedPackName, domManager, difficultyLevel, isChronoMode);

  } catch (error) {
    // Gestion des erreurs (ex: Serveur de l'IUT injoignable)
    console.error('Erreur API:', error);
    alert(error.message || 'Erreur lors de la création de la partie. Vérifiez votre connexion.');

    // En cas d'erreur, on remet l'écran d'accueil
    document.getElementById('start-screen').classList.remove('hidden');
    document.querySelector('.game-area').classList.add('hidden');
  }
});