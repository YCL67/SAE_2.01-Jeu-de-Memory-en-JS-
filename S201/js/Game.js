import {imageCollections} from './ImageCollection.js';
import {ApiService} from './ApiService.js';


export class Game {
  /**
   * @type {number} id identifiant de la partie en cours
   */
  #id;
  #cards = [];                      // Le tableau qui contiendra les cartes mélangées
  #flippedCards = [];               // Les cartes actuellement retournées par le joueur (max 2)
  #remainingPairs = 0;            // Le nombre de paires qu'il reste à trouver
  #isLocked = false;             // Pour empêcher de cliquer pendant l'animation des cartes

  async endGame() {

    const gameId = this.#id;                           // On récupère l'ID tu jeu
    const remainingPairs = this.#remainingPairs;       // On récupère les paires restantes

    try {
      const result = await ApiService.updateGameResult(gameId, remainingPairs);
      console.log('Fin de partie:', result);
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Erreur lors de la fin de la partie');
    }

  }

  /**
   * Start a new game.
   * @param {number} id - The game ID.
   * @param {string} packname - Le nom du paquet choisi
   * @param {DOMManager} domManager - gestionnaire d'affichage
   */
  /**
   * Start a new game.
   * @param {number} id - L'identifiant de la partie (envoyé par l'API)
   * @param {string} packName - Le nom du pack (differenttypes, sametypes, pikachus)
   * @param {DOMManager} domManager - L'instance du manager de vue
   * @param {number} difficulty - La difficulté (1, 2 ou 3)
   */
  startGame(id, packName, domManager, difficulty) {
    this.#id = id;

    // Ici, on calcule le nombre de paires en fonction de la difficulté
    // Difficulté 1 = 8 paires (16 cartes)
    // Difficulté 2 = 12 paires (24 cartes)
    // Difficulté 3 = 16 paires (32 cartes)
    let pairsCount;
    switch (parseInt(difficulty)) {
      case 2: pairsCount = 12; break;
      case 3: pairsCount = 16; break;
      default: pairsCount = 8;
    }

    // 2. Sélectionner et limiter les images
    const fullCollection = imageCollections[packName];

    // On mélange la collection AVANT de couper pour ne pas avoir toujours les mêmes Pokémon
    const shuffledCollection = this.#shuffle(fullCollection);

    // On ne garde que le nombre de paires nécessaires
    const selectedImages = shuffledCollection.slice(0, pairsCount);

    // 3. Créer le deck final (chaque image en double) et mélanger le tout
    const deck = [...selectedImages, ...selectedImages];
    this.#cards = this.#shuffle(deck);

    // 4. Mettre à jour le nombre de paires restantes pour la logique de fin de partie
    this.#remainingPairs = pairsCount;

    // 5. Demander au DOMManager d'afficher les cartes
    domManager.createCards(this.#cards);

    // 6. Gérer l'affichage de la grille (4 colonnes par défaut, ou 5/6 pour les niveaux supérieurs)
    const boardElement = document.querySelector('.game-board');
    // On enlève les anciennes classes de colonnes
    boardElement.classList.remove('cols-5', 'cols-6');
    if (pairsCount === 12) boardElement.classList.add('cols-5'); // Optionnel, selon ton CSS

    // 7. Ajouter l'écouteur de clic sur chaque carte
    const cardElements = document.querySelectorAll('.card');
    cardElements.forEach(cardElement => {
      cardElement.addEventListener('click', () => this.#handleCardClick(cardElement));
    });
  }




  /**
   * Gère le clic sur une carte
   */
  #handleCardClick(cardElement) {
    // Si le plateau est bloqué ou si la carte est déjà retournée, on ne fait rien
    if (this.#isLocked || cardElement.classList.contains('flip')) return;

    // On retourne la carte (déclenche l'animation CSS)
    cardElement.classList.add('flip');
    this.#flippedCards.push(cardElement);

    // Si on a retourné 2 cartes, on vérifie si c'est une paire
    if (this.#flippedCards.length === 2) {
      this.#checkForMatch();
    }
  }

  /**
   * Vérifie si les deux cartes retournées sont identiques
   */
  #checkForMatch() {
    this.#isLocked = true; // On bloque les clics pendant l'animation
    const [card1, card2] = this.#flippedCards;

    // On compare les IDs stockés dans les datasets
    if (card1.dataset.pokemonId === card2.dataset.pokemonId) {
      // C'est une paire !
      this.#flippedCards = []; // On vide le tableau des cartes retournées
      this.#remainingPairs--;
      this.#isLocked = false;  // On débloque le plateau

      // Si toutes les paires sont trouvées
      if (this.#remainingPairs === 0) {
        // Petit délai pour laisser l'animation de la dernière carte se terminer
        setTimeout(() => this.endGame(), 600);
      }
    } else {
      // Ce n'est pas une paire, on les cache après 1 seconde
      setTimeout(() => {
        card1.classList.remove('flip');
        card2.classList.remove('flip');
        this.#flippedCards = [];
        this.#isLocked = false; // On débloque le plateau une fois les cartes cachées
      }, 1000);
    }
  }

  /**
   * Mélange un tableau (Algorithme de Fisher-Yates)
   */
  #shuffle(array) {
    const arrayCopy = [...array];
    for (let i = arrayCopy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
    }
    return arrayCopy;
  }

  // Todo À compléter

}