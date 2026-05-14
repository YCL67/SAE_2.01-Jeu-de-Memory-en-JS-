import { imageCollections } from './ImageCollection.js';
import { ApiService } from './ApiService.js';

/**
 * Classe Game : Gère toute la logique et les règles du Memory.
 */
export class Game {


  #id;                 // Identifiant unique de la partie (fourni par l'API)
  #cards = [];         // Tableau contenant les objets de la collection en cours
  #flippedCards = [];  // Tableau temporaire stockant les 1 ou 2 cartes actuellement retournées
  #remainingPairs = 0; // Compteur de paires restantes pour condition de victoire
  #isLocked = false;   // Valeur pour bloquer les clics pendant les animations
  #timerInterval = null; // Référence du setInterval pour le chronomètre
  #timeRemaining = 0;  // Temps en secondes (compte à rebours ou chronomètre selon le mode)

  /**
   * Formate le temps en chaîne "MM:SS".
   * @returns {string} Le temps formaté (exemple: "01:15")
   */
  get formattedTime() {
    const minutes = Math.floor(this.#timeRemaining / 60);
    const secondes = this.#timeRemaining % 60;
    // padStart ajoute un '0' devant si le chiffre est inférieur à 10
    return `${minutes.toString().padStart(2, '0')}:${secondes.toString().padStart(2, '0')}`;
  }

  /**
   * Initialise et lance une nouvelle partie.
   * @param {number} id - L'ID de session renvoyé par l'API
   * @param {string} packName - Le nom de la collection choisie ('differenttypes', etc.)
   * @param {DOMManager} domManager - L'instance gérant l'interface
   * @param {number|string} difficulty - Le nombre de paires (4, 5, 6, 8)
   * @param {boolean} isChronoMode - True si le joueur a coché le "Mode Détente"
   */
  startGame(id, packName, domManager, difficulty, isChronoMode = false) {
    this.#id = id;
    this.isChronoMode = isChronoMode;
    let pairsCount = parseInt(difficulty);

    // Initialisation du temps selon le mode de jeu choisi
    if (this.isChronoMode) {
      this.#timeRemaining = 0; // Mode CHRONO : on compte vers le haut
    } else {
      this.#timeRemaining = pairsCount * 10; // Mode normal : 10 secondes par paire
    }

    // Préparation du paquet
    const fullCollection = imageCollections[packName];
    // On mélange la collection complète puis on en coupe un morceau (slice) selon la difficulté
    const selectedImages = this.#shuffle(fullCollection).slice(0, pairsCount);

    // On duplique les images pour créer les paires et on mélange le paquet final
    const deck = [...selectedImages, ...selectedImages];
    this.#cards = this.#shuffle(deck);
    this.#remainingPairs = pairsCount;

    // On effectue l'affichage a l'aide du DOMManager
    domManager.createCards(this.#cards);

    // Gestion responsive de la grille CSS (4, 5, 6 ou 8 colonnes)
    const boardElement = document.querySelector('.game-board');
    boardElement.classList.remove('cols-5', 'cols-6', 'cols-8');

    if (pairsCount === 5) boardElement.classList.add('cols-5');
    else if (pairsCount === 6) boardElement.classList.add('cols-6');
    else if (pairsCount === 8) boardElement.classList.add('cols-8');

    // On ajoute les Event Listeners sur les cartes générées
    const cardElements = document.querySelectorAll('.card');
    cardElements.forEach(cardElement => {
      // On utilise une fonction fléchée pour conserver le contexte 'this' de la classe Game
      cardElement.addEventListener('click', () => this.#handleCardClick(cardElement));
    });

    // Lancement du temps
    this.#startTimer();
  }

  /**
   * Arrête le jeu proprement et synchronise les résultats avec le serveur.
   */
  async endGame() {
    this.#stopTimer();

    try {
      // On envoie le score final (0 si victoire complète, > 0 si abandon/défaite)
      const result = await ApiService.updateGameResult(this.#id, this.#remainingPairs);
      console.log('Score synchronisé avec succès :', result);
    } catch (error) {
      console.error('Erreur API lors de la fin de partie :', error);
    }
  }

  /**
   * Gère le comportement lorsqu'une carte est cliquée.
   * @param {HTMLElement} cardElement - L'élément HTML cliqué
   */
  #handleCardClick(cardElement) {
    // On bloque si le jeu analyse déjà 2 cartes ou si la carte cliquée est déjà face visible
    if (this.#isLocked || cardElement.classList.contains('flip')) return;

    // On retourne visuellement la carte et on la stocke
    cardElement.classList.add('flip');
    this.#flippedCards.push(cardElement);

    // Si 2 cartes sont retournées, on déclenche la vérification
    if (this.#flippedCards.length === 2) {
      this.#checkForMatch();
    }
  }

  /**
   * Vérifie si les deux cartes retournées forment une paire valide.
   */
  #checkForMatch() {
    this.#isLocked = true; // Verrouillage immédiat pour empêcher d'autres clics
    const [card1, card2] = this.#flippedCards;

    // Comparaison basée sur l'attribut 'data-pokemon-id' injecté par le DOMManager
    if (card1.dataset.pokemonId === card2.dataset.pokemonId) {
      // Cas où la paire est trouvée
      this.#flippedCards = [];
      this.#remainingPairs--;
      this.#isLocked = false;

      // Vérification de la condition de victoire
      if (this.#remainingPairs === 0) {
        // Petit délai pour laisser l'animation de la dernière carte se terminer
        setTimeout(() => {
          this.endGame();

          // Message dynamique selon le mode de jeu
          const msg = this.isChronoMode
              ? `Victoire ! Vous avez terminé en ${this.formattedTime} !`
              : `Victoire ! Il vous restait ${this.formattedTime} !`;

          this.#showEndScreen("Félicitations !", msg);
        }, 600);
      }
    } else {
      // Cas ou la paire est mauvaise
      // On laisse les cartes visibles 0.8 seconde avant de les retourner
      setTimeout(() => {
        card1.classList.remove('flip');
        card2.classList.remove('flip');
        this.#flippedCards = [];
        this.#isLocked = false; // Déverrouillage
      }, 800);
    }
  }

  /**
   * Algorithme de mélange.
   * @param {Array} array - Le tableau à mélanger
   * @returns {Array} Une nouvelle copie du tableau, mélangée
   */
  #shuffle(array) {
    const arrayCopy = [...array];
    for (let i = arrayCopy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // Utilisation du 'Destructuring assignment' pour échanger les valeurs proprement
      [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
    }
    return arrayCopy;
  }

  /**
   * Initialise et gère la boucle temporelle du jeu.
   */
  #startTimer() {
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.textContent = this.formattedTime;

    this.#timerInterval = setInterval(() => {
      if (this.isChronoMode) {
        // Mode CHRONO : Chronomètre classique (+1s)
        this.#timeRemaining++;
      } else {
        // Mode normal : Compte à rebours (-1s)
        this.#timeRemaining--;

        // Vérification de la défaite par manque de temps
        if (this.#timeRemaining <= 0) {
          this.#handleTimeUp();
        }
      }

      // Mise à jour de l'affichage à chaque tic
      if (timerDisplay) timerDisplay.textContent = this.formattedTime;
    }, 1000);
  }

  /**
   * Stoppe l'intervalle temporel en cours.
   */
  #stopTimer() {
    if (this.#timerInterval) clearInterval(this.#timerInterval);
  }

  /**
   * Gère la séquence de défaite lorsque le temps est écoulé.
   */
  #handleTimeUp() {
    this.#stopTimer();
    this.#isLocked = true; // On bloque le plateau
    this.endGame();
    this.#showEndScreen("Temps écoulé !", `Perdu... Il restait ${this.#remainingPairs} paires à trouver.`);
  }

  /**
   * Fonction pour basculer sur l'écran de fin.
   * @param {string} title - Titre à afficher (Victoire/Défaite)
   * @param {string} message - Détail du score/temps
   */
  #showEndScreen(title, message) {
    document.getElementById('end-title').textContent = title;
    document.getElementById('end-message').textContent = message;

    // Bascule des classes CSS pour masquer le jeu et afficher le menu de fin
    document.querySelector('.game-area').classList.add('hidden');
    document.getElementById('end-screen').classList.remove('hidden');
    document.querySelector('.game-board').innerHTML = ''; // Nettoyage de la grille
  }
}