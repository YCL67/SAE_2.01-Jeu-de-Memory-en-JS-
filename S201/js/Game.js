import { imageCollections } from './ImageCollection.js';
import { ApiService } from './ApiService.js';

/**
 * Classe Game : Gère la logique métier du Memory.
 * En tant qu'élèves, nous avons choisi d'isoler la logique ici pour
 * ne pas mélanger les calculs avec l'affichage (géré par DOMManager).
 */
export class Game {
  // Propriétés privées pour l'encapsulation (on ne veut pas que n'importe quel script modifie le score)
  #id;                 // Identifiant unique de la partie côté serveur
  #cards = [];         // Tableau contenant les objets images mélangés
  #flippedCards = [];  // Stocke les 2 cartes actuellement retournées pour comparaison
  #remainingPairs = 0; // Compteur pour savoir quand la partie est finie
  #isLocked = false;   // Verrou pour empêcher de cliquer sur 10 cartes en même temps
  #timerInterval = null; // Référence de l'intervalle pour pouvoir le stopper
  #timeRemaining = 0;  // Temps restant pour le compte à rebours

  /**
   * Getter pour formater le temps en MM:SS.
   * Utile pour l'affichage et les messages de fin.
   */
  get formattedTime() {
    const minutes = Math.floor(this.#timeRemaining / 60);
    const seconds = this.#timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Déclenche la fin de partie.
   * On arrête le chrono et on informe le serveur via l'ApiService.
   */
  async endGame() {
    this.#stopTimer();

    const gameId = this.#id;
    const remainingPairs = this.#remainingPairs;

    try {
      // On envoie le nombre de paires qu'il restait (0 si victoire)
      const result = await ApiService.updateGameResult(gameId, remainingPairs);
      console.log('Données synchronisées avec le serveur:', result);
    } catch (error) {
      console.error('Échec de la synchronisation API:', error);
    }
  }

  /**
   * Initialisation de la partie.
   * @param {number} id - ID reçu de l'API lors du POST initial
   * @param {string} packName - Collection d'images choisie
   * @param {DOMManager} domManager - Instance pour l'affichage
   * @param {number} difficulty - Nombre de paires (4, 5, 6 ou 8)
   */
  startGame(id, packName, domManager, difficulty) {
    this.#id = id;
    let pairsCount = parseInt(difficulty);

    // Initialisation du temps : on a prévu 10 secondes par paire
    this.#timeRemaining = pairsCount * 10;

    // 1. Préparation du deck : on prend les images, on mélange, on coupe selon difficulté
    const fullCollection = imageCollections[packName];
    const shuffledCollection = this.#shuffle(fullCollection);
    const selectedImages = shuffledCollection.slice(0, pairsCount);

    // 2. Création des paires et mélange final
    const deck = [...selectedImages, ...selectedImages];
    this.#cards = this.#shuffle(deck);
    this.#remainingPairs = pairsCount;

    // 3. Affichage via le DOMManager
    domManager.createCards(this.#cards);

    // 4. Gestion dynamique de la grille CSS pour que l'affichage soit "clean"
    const boardElement = document.querySelector('.game-board');
    boardElement.classList.remove('cols-5', 'cols-6', 'cols-8'); // Reset des classes

    if (pairsCount === 5) {
      boardElement.classList.add('cols-5');
    } else if (pairsCount === 6) {
      boardElement.classList.add('cols-6');
    } else if (pairsCount === 8) {
      boardElement.classList.add('cols-8'); // Active le mode 2 lignes de 8
    }

    // 5. Mise en place des écouteurs d'événements sur les nouvelles cartes
    const cardElements = document.querySelectorAll('.card');
    cardElements.forEach(cardElement => {
      cardElement.addEventListener('click', () => this.#handleCardClick(cardElement));
    });

    // 6. Lancement du compte à rebours
    this.#startTimer();
  }

  /**
   * Gestionnaire de clic.
   * Vérifie si on peut retourner la carte et si une paire est formée.
   */
  #handleCardClick(cardElement) {
    // On ignore le clic si le jeu est verrouillé ou si la carte est déjà retournée
    if (this.#isLocked || cardElement.classList.contains('flip')) return;

    cardElement.classList.add('flip');
    this.#flippedCards.push(cardElement);

    if (this.#flippedCards.length === 2) {
      this.#checkForMatch();
    }
  }

  /**
   * Logique de comparaison des deux cartes retournées.
   */
  #checkForMatch() {
    this.#isLocked = true; // On verrouille pour laisser le temps de voir les cartes
    const [card1, card2] = this.#flippedCards;

    // Comparaison via le dataset id défini dans DOMManager
    if (card1.dataset.pokemonId === card2.dataset.pokemonId) {
      this.#flippedCards = [];
      this.#remainingPairs--;
      this.#isLocked = false;

      // Condition de victoire
      if (this.#remainingPairs === 0) {
        setTimeout(() => {
          this.endGame();
          this.#showEndScreen("Félicitations !", `Victoire ! Il vous restait ${this.formattedTime} !`);
        }, 600);
      }
    } else {
      // Pas de match : on retourne les cartes après 1 seconde
      setTimeout(() => {
        card1.classList.remove('flip');
        card2.classList.remove('flip');
        this.#flippedCards = [];
        this.#isLocked = false;
      }, 1000);
    }
  }

  /**
   * Algorithme de mélange (Fisher-Yates).
   */
  #shuffle(array) {
    const arrayCopy = [...array];
    for (let i = arrayCopy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
    }
    return arrayCopy;
  }

  /**
   * Gestion du compte à rebours.
   */
  #startTimer() {
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.textContent = this.formattedTime;

    this.#timerInterval = setInterval(() => {
      this.#timeRemaining--;

      if (timerDisplay) timerDisplay.textContent = this.formattedTime;

      if (this.#timeRemaining <= 0) {
        this.#handleTimeUp();
      }
    }, 1000);
  }

  /**
   * Défaite par temps écoulé.
   */
  #handleTimeUp() {
    this.#stopTimer();
    this.#isLocked = true;
    this.endGame();
    this.#showEndScreen("Temps écoulé !", `Perdu... Il restait ${this.#remainingPairs} paires.`);
  }

  /**
   * Centralisation de l'affichage de l'écran de fin.
   */
  #showEndScreen(title, message) {
    document.getElementById('end-title').textContent = title;
    document.getElementById('end-message').textContent = message;
    document.querySelector('.game-area').classList.add('hidden');
    document.getElementById('end-screen').classList.remove('hidden');
    document.querySelector('.game-board').innerHTML = '';
  }

  #stopTimer() {
    clearInterval(this.#timerInterval);
  }
}