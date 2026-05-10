import {imageCollections} from './ImageCollection.js';
import {ApiService} from './ApiService.js';

export class Game {
  #id;
  #cards = [];
  #flippedCards = [];
  #remainingPairs = 0;
  #isLocked = false;
  #timerInterval = null;
  #timeRemaining = 0;

  get formattedTime() {
    const minutes = Math.floor(this.#timeRemaining / 60);
    const seconds = this.#timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  async endGame() {
    this.#stopTimer();

    const gameId = this.#id;
    const remainingPairs = this.#remainingPairs;

    try {
      const result = await ApiService.updateGameResult(gameId, remainingPairs);
      console.log('Fin de partie enregistrée:', result);
    } catch (error) {
      console.error('Error API Fin de partie:', error);
    }
  }

  startGame(id, packName, domManager, difficulty) {
    this.#id = id;

    let pairsCount = parseInt(difficulty);

    this.#timeRemaining = pairsCount * 10;

    const fullCollection = imageCollections[packName];
    const shuffledCollection = this.#shuffle(fullCollection);

    const selectedImages = shuffledCollection.slice(0, pairsCount);

    const deck = [...selectedImages, ...selectedImages];
    this.#cards = this.#shuffle(deck);

    this.#remainingPairs = pairsCount;

    domManager.createCards(this.#cards);

    const boardElement = document.querySelector('.game-board');
    boardElement.classList.remove('cols-5', 'cols-6');
    if (pairsCount === 5) boardElement.classList.add('cols-5');

    const cardElements = document.querySelectorAll('.card');
    cardElements.forEach(cardElement => {
      cardElement.addEventListener('click', () => this.#handleCardClick(cardElement));
    });

    this.#startTimer();
  }

  #handleCardClick(cardElement) {
    if (this.#isLocked || cardElement.classList.contains('flip')) return;

    cardElement.classList.add('flip');
    this.#flippedCards.push(cardElement);

    if (this.#flippedCards.length === 2) {
      this.#checkForMatch();
    }
  }

  #checkForMatch() {
    this.#isLocked = true;
    const [card1, card2] = this.#flippedCards;

    if (card1.dataset.pokemonId === card2.dataset.pokemonId) {
      this.#flippedCards = [];
      this.#remainingPairs--;
      this.#isLocked = false;

      if (this.#remainingPairs === 0) {
        setTimeout(() => {
          this.endGame();

          const temps = this.formattedTime;

          document.getElementById('end-title').textContent = "Félicitations !";
          document.getElementById('end-message').textContent = `Vous avez trouvé toutes les paires ! Il vous restait ${temps} au compteur !`;

          document.querySelector('.game-area').classList.add('hidden');
          document.getElementById('end-screen').classList.remove('hidden');

          document.querySelector('.game-board').innerHTML = '';
        }, 600);
      }
    } else {
      setTimeout(() => {
        card1.classList.remove('flip');
        card2.classList.remove('flip');
        this.#flippedCards = [];
        this.#isLocked = false;
      }, 1000);
    }
  }

  #shuffle(array) {
    const arrayCopy = [...array];
    for (let i = arrayCopy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
    }
    return arrayCopy;
  }

  #startTimer() {

    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
      timerDisplay.textContent = this.formattedTime;
    }

    this.#timerInterval = setInterval(() => {
      this.#timeRemaining--;

      if (timerDisplay) {
        timerDisplay.textContent = this.formattedTime;
      }

      if (this.#timeRemaining <= 0) {
        this.#handleTimeUp();
      }
    }, 1000);
  }

  #handleTimeUp() {
    this.#stopTimer();
    this.#isLocked = true; // On bloque le plateau pour empêcher de cliquer
    this.endGame(); // On avertit l'API de la fin de partie

    document.getElementById('end-title').textContent = "Temps écoulé !";
    document.getElementById('end-message').textContent = `Dommage, la partie est terminée. Il vous restait ${this.#remainingPairs} paires à trouver.`;

    document.querySelector('.game-area').classList.add('hidden');
    document.getElementById('end-screen').classList.remove('hidden');

    document.querySelector('.game-board').innerHTML = '';
  }

  #stopTimer() {
    clearInterval(this.#timerInterval);
  }
}