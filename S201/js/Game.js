import { imageCollections } from './ImageCollection.js';
import { ApiService } from './ApiService.js';

/**
 * Classe Game : Gère toute la logique et les règles du Memory.
 */
export class Game {

  // Déclaration des variables
  #id;                 // Identifiant unique de la partie (fourni par l'API)
  #cards = [];         // Tableau contenant les objets de la collection en cours
  #flippedCards = [];  // Tableau temporaire stockant les 1 ou 2 cartes actuellement retournées
  #remainingPairs = 0; // Compteur de paires restantes pour condition de victoire
  #isLocked = false;   // Valeur pour bloquer les clics pendant les animations
  #timerInterval = null; // Référence du setInterval pour le chronomètre
  #timeRemaining = 0;  // Temps en secondes (compte à rebours ou chronomètre selon le mode)

  // Gestion des sons ici
  #flipSound = new Audio('assets/sounds/card_flip.mp3');
  #matchSound = new Audio('assets/sounds/pair_found.wav');
  #failSound = new Audio('assets/sounds/pair_miss.wav');

  // Playlist pour le menu
  #menuMusicTracks = [
      'assets/music/menu_music1.mp3',
      'assets/music/menu_music2.mp3',
      'assets/music/menu_music3.mp3'
  ];

  // Playlist pour les parties
  #gameMusicTracks = [
    'assets/music/game_music1.mp3',
    'assets/music/game_music2.mp3',
    'assets/music/game_music3.mp3'
  ];

  // Le lecteur audio principal (vide par défaut)
  #menuMusic = new Audio();
  #gameMusic = new Audio();
  #winJingle = new Audio('assets/music/win_music.mp3');
  #loseJingle = new Audio('assets/music/loosing_music.mp3');


  isMuted = false; // Gestion de l'activation du son ou non. Par défaut, le son est désactivé



  // Fonction utilitaire pour jouer un son sans répétitions
  #playSound(audioElement) {
    // Si le jeu est mute, on ne fait rien
    if (this.isMuted) return;

    // On crée un "clone" du son pour que chaque son aie son propre player
    const soundClone = audioElement.cloneNode();

    soundClone.play().catch(err => console.log("Son bloqué par le navigateur", err));
  }

  // Fonctions utilitaires pour la gestion de la musique
  playMenuMusic(forceNewTrack = false) {
    this.#winJingle.pause();
    this.#loseJingle.pause();

    if (forceNewTrack || !this.#menuMusic.src) {
      const randomIndex = Math.floor(Math.random() * this.#menuMusicTracks.length);
      this.#menuMusic.src = this.#menuMusicTracks[randomIndex];
    }

    this.#menuMusic.loop = true;
    this.#menuMusic.volume = 0.3;

    if (!this.isMuted) {
      this.#menuMusic.play().catch(() => console.log("Attente d'interaction"));
    }
  }

  stopMenuMusic() {
    this.#menuMusic.pause();
    this.#menuMusic.currentTime = 0;
  }

  playJingle(isVictory) {
    if (this.isMuted) return;
    if (isVictory) {
      this.#winJingle.currentTime = 0;
      this.#winJingle.play().catch(()=>{});
      this.#winJingle.volume = 0.3;
    } else {
      this.#loseJingle.currentTime = 0;
      this.#loseJingle.play().catch(()=>{});
      this.#loseJingle.volume = 0.3;
    }
  }

  toggleMuteState(forceMuteState) {
    this.isMuted = forceMuteState;
    if (this.isMuted) {
      this.#menuMusic.pause();
      this.#gameMusic.pause();
      this.#winJingle.pause();
      this.#loseJingle.pause();
    } else {
      const startScreen = document.getElementById('start-screen');
      if (startScreen && !startScreen.classList.contains('hidden')) {
        this.#menuMusic.play().catch(()=>{});
      } else {
        // Si on est en jeu, on relance la musique du jeu
        const gameArea = document.querySelector('.game-area');
        if (gameArea && !gameArea.classList.contains('hidden')) {
          this.#gameMusic.play().catch(()=>{});
        }
      }
    }
  }
  playGameMusic() {
    this.stopMenuMusic(); // On s'assure que la musique du menu est bien coupée

    // On tire une musique de jeu au hasard à chaque nouvelle partie
    const randomIndex = Math.floor(Math.random() * this.#gameMusicTracks.length);
    this.#gameMusic.src = this.#gameMusicTracks[randomIndex];

    this.#gameMusic.loop = true;
    this.#gameMusic.volume = 0.2; // Un peu plus bas pour bien entendre les bruitages

    if (!this.isMuted) {
      this.#gameMusic.play().catch(()=>{});
    }
  }

  stopGameMusic() {
    this.#gameMusic.pause();
    this.#gameMusic.currentTime = 0;
  }


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
    this.playGameMusic();
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

    // On joue le son de la carte qui se retourne
    this.#playSound(this.#flipSound);

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
      // --- Cas où la paire est trouvée ---

      // On délègue le son et les confettis à notre nouvelle fonction dédiée
      this.#handleMatchAnimation(card1, card2);

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

          this.#showEndScreen("Félicitations !", msg, true);
        }, 600); // L'écran de fin arrive juste après les confettis (qui partent à 500ms)
      }
    } else {
      // --- Cas où la paire est mauvaise ---



      // On laisse les cartes visibles 0.8 seconde avant de les retourner
      setTimeout(() => {
        card1.classList.remove('flip');
        card2.classList.remove('flip');
        this.#flippedCards = [];
        this.#isLocked = false; // Déverrouillage

        // On joue le son adéquat
        this.#playSound(this.#failSound);

      }, 800);
    }
  }

  /**
   * Gère les animations et les sons lorsqu'une paire est trouvée.
   * @param {HTMLElement} card1
   * @param {HTMLElement} card2
   */
  #handleMatchAnimation(card1, card2) {
    setTimeout(() => {
      // 1. On lance le son de victoire
      this.#playSound(this.#matchSound);

      // 2. On lance les confettis sur les DEUX cartes
      if (typeof confetti === 'function') {

        // Petite fonction interne pour calculer le centre exact d'une carte
        // (Convertit les pixels de l'écran en un ratio de 0 à 1 pour la librairie)
        const getCardOrigin = (card) => {
          const rect = card.getBoundingClientRect();
          return {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight
          };
        };

        // Configuration de base des confettis (on en met un peu moins car on tire 2 fois)
        const confettiConfig = {
          particleCount: 50,
          spread: 50,
          zIndex: 9999,
          scalar: 0.8 // Réduit un tout petit peu la taille des confettis pour que ça fasse plus "localisé"
        };

        // Tir sur la première carte
        confetti({
          ...confettiConfig,
          origin: getCardOrigin(card1)
        });

        // Tir sur la deuxième carte
        confetti({
          ...confettiConfig,
          origin: getCardOrigin(card2)
        });
      }
    }, 500);
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
    this.#showEndScreen("Temps écoulé !", `Perdu... Il restait ${this.#remainingPairs} paires à trouver.`, false);
  }

  /**
   * Fonction pour basculer sur l'écran de fin.
   * @param {string} title - Titre à afficher (Victoire/Défaite)
   * @param {string} message - Détail du score/temps
   */
  #showEndScreen(title, message, isVictory) {
    document.getElementById('end-title').textContent = title;
    document.getElementById('end-message').textContent = message;

    // On coupe la musique du Jeu
    this.stopGameMusic();

    // On lance le Jingle
    this.playJingle(isVictory);

    document.querySelector('.game-area').classList.add('hidden');
    document.getElementById('end-screen').classList.remove('hidden');
    document.querySelector('.game-board').innerHTML = '';
  }
}