// ============================================================================
// Game.js : Le "Cerveau" du jeu.
// Cette classe ne gère aucun clic de bouton menu, elle s'occupe UNIQUEMENT
// des règles du jeu : retourner les cartes, comparer, compter les points,
// gérer les chronos et les tours du mode Multijoueur.
// ============================================================================

import { imageCollections } from './ImageCollection.js';
import { ApiService } from './ApiService.js';

export class Game {

  // ==========================================
  // VARIABLES PRIVÉES (Utilisation du '#' pour bloquer l'accès depuis l'extérieur)
  // ==========================================

  #id;                 // Identifiant unique de la partie (fourni par l'API)
  #cards = [];         // Tableau contenant les données des cartes de la partie
  #flippedCards = [];  // Tableau temporaire stockant les cartes en train d'être regardées (max 2)
  #remainingPairs = 0; // Compteur de paires restantes (Quand ça tombe à 0, c'est gagné)
  #isLocked = false;   // Verrou de sécurité : empêche de cliquer sur 3 cartes en même temps
  #timerInterval = null; // Référence du setInterval (pour pouvoir arrêter le chrono plus tard)
  #timeRemaining = 0;  // Le temps en cours (qui monte ou descend selon le mode)

  // Variables dédiées au mode 1v1 Local
  #isMultiplayer = false;
  #p1Name = "";
  #p2Name = "";
  #p1Score = 0;
  #p2Score = 0;
  #currentPlayer = 1; // Permet de savoir à qui le tour (1 = Joueur 1, 2 = Joueur 2)

  // ==========================================
  // SYSTÈME AUDIO (Bruitages, Musiques et Jingles)
  // ==========================================

  // Bruitages courts (effets de jeu)
  #flipSound = new Audio('assets/sounds/card_flip.mp3');
  #matchSound = new Audio('assets/sounds/pair_found.wav');
  #failSound = new Audio('assets/sounds/pair_miss.wav');

  // Playlists musicales (tableaux contenant les chemins)
  #menuMusicTracks = [
    'assets/music/menu_music1.mp3',
    'assets/music/menu_music2.mp3',
    'assets/music/menu_music3.mp3'
  ];
  #gameMusicTracks = [
    'assets/music/game_music1.mp3',
    'assets/music/game_music2.mp3',
    'assets/music/game_music3.mp3'
  ];

  // Lecteurs audio virtuels (comme des lecteurs MP3 intégrés)
  #menuMusic = new Audio();
  #gameMusic = new Audio();

  // Jingles de fin de partie
  #winJingle = new Audio('assets/music/win_music.mp3');
  #loseJingle = new Audio('assets/music/loosing_music.mp3');

  // Variable publique pour savoir si le joueur a cliqué sur le bouton Mute global
  isMuted = false;

  // --- MÉTHODES DE GESTION DU SON ---

  /**
   * Joue un effet sonore court. Utilise 'cloneNode' pour permettre à plusieurs
   * sons de se superposer (ex: si le joueur clique très vite sur 2 cartes).
   */
  #playSound(audioElement) {
    if (this.isMuted) return; // Sécurité : si on est Mute, on bloque direct
    const soundClone = audioElement.cloneNode();
    soundClone.play().catch(err => console.log("Son bloqué par le navigateur", err));
  }

  playMenuMusic(forceNewTrack = false) {
    this.#winJingle.pause(); // Coupe les sons de victoire/défaite s'ils tournaient encore
    this.#loseJingle.pause();

    // Si on demande une nouvelle piste, on la tire au hasard dans la playlist Menu
    if (forceNewTrack || !this.#menuMusic.src) {
      const randomIndex = Math.floor(Math.random() * this.#menuMusicTracks.length);
      this.#menuMusic.src = this.#menuMusicTracks[randomIndex];
    }

    this.#menuMusic.loop = true; // Tourne en boucle
    this.#menuMusic.volume = 0.3; // Baisse le volume pour ne pas agresser les oreilles

    if (!this.isMuted) {
      this.#menuMusic.play().catch(() => console.log("Attente d'interaction"));
    }
  }

  stopMenuMusic() {
    this.#menuMusic.pause();
    this.#menuMusic.currentTime = 0; // Rembobine à zéro
  }

  playGameMusic() {
    this.stopMenuMusic(); // Sécurité : on s'assure que la musique du menu s'arrête

    // Sélection aléatoire d'une musique de combat/jeu
    const randomIndex = Math.floor(Math.random() * this.#gameMusicTracks.length);
    this.#gameMusic.src = this.#gameMusicTracks[randomIndex];

    this.#gameMusic.loop = true;
    this.#gameMusic.volume = 0.2; // Volume plus bas pour bien entendre les bruitages des cartes

    if (!this.isMuted) {
      this.#gameMusic.play().catch(()=>{});
    }
  }

  stopGameMusic() {
    this.#gameMusic.pause();
    this.#gameMusic.currentTime = 0;
  }

  playJingle(isVictory) {
    if (this.isMuted) return;

    // Selon l'issue de la partie, on joue le jingle adéquat
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

  /**
   * Méthode appelée par app.js quand le joueur clique sur le bouton Mute.
   * Analyse l'écran actuel pour couper ou relancer la bonne musique.
   */
  toggleMuteState(forceMuteState) {
    this.isMuted = forceMuteState;
    if (this.isMuted) {
      // On coupe absolument TOUT
      this.#menuMusic.pause();
      this.#gameMusic.pause();
      this.#winJingle.pause();
      this.#loseJingle.pause();
    } else {
      // On rallume selon l'écran où on se trouve
      const startScreen = document.getElementById('start-screen');
      const mainMenu = document.getElementById('main-menu'); // NOUVEAU : On cible le menu principal

      // Si on est sur le Formulaire de config OU sur le Menu Principal
      if ((startScreen && !startScreen.classList.contains('hidden')) ||
          (mainMenu && !mainMenu.classList.contains('hidden'))) {
        this.#menuMusic.play().catch(()=>{});
      } else {
        // Sinon, si on est en train de jouer
        const gameArea = document.querySelector('.game-area');
        if (gameArea && !gameArea.classList.contains('hidden')) {
          this.#gameMusic.play().catch(()=>{});
        }
      }
    }
  }

  // ==========================================
  // LOGIQUE CENTRALE DU JEU
  // ==========================================

  /**
   * "Getter" : Fonction qui se comporte comme une variable.
   * Transforme les secondes brutes (ex: 75) en format lisible (ex: "01:15").
   */
  get formattedTime() {
    const minutes = Math.floor(this.#timeRemaining / 60);
    const secondes = this.#timeRemaining % 60;
    // padStart ajoute un '0' automatique si le chiffre est inférieur à 10
    return `${minutes.toString().padStart(2, '0')}:${secondes.toString().padStart(2, '0')}`;
  }

  /**
   * Méthode MAÎTRESSE. Initialise tout le plateau et lance le timer.
   */
  startGame(id, packName, domManager, difficulty, isChronoMode = false,
            isMultiplayer = false, p1 = "Joueur 1", p2 = "Joueur 2") {

    // 1. Sauvegarde des options choisies par le joueur
    this.#id = id;
    this.isChronoMode = isChronoMode;
    this.#isMultiplayer = isMultiplayer;
    this.#p1Name = p1;
    this.#p2Name = p2;
    this.#p1Score = 0;
    this.#p2Score = 0;
    this.#currentPlayer = 1;

    let pairsCount = parseInt(difficulty);

    // 2. Initialisation du temps
    if (this.isChronoMode) {
      this.#timeRemaining = 0; // Mode Détente (Chrono vers le haut)
    } else {
      this.#timeRemaining = pairsCount * 10; // Mode Tryhard (10s par paire, Timer vers le bas)
    }

    // 3. Préparation du paquet de cartes
    const fullCollection = imageCollections[packName];
    // On mélange tout, on coupe le nombre de cartes voulues, on duplique pour faire des paires
    const selectedImages = this.#shuffle(fullCollection).slice(0, pairsCount);
    const deck = [...selectedImages, ...selectedImages];

    // On remélange le paquet final et on sauvegarde
    this.#cards = this.#shuffle(deck);
    this.#remainingPairs = pairsCount;

    // 4. Affichage dans le HTML via le DOMManager
    domManager.createCards(this.#cards);

    // 5. Gestion CSS responsive (Ajuste le nombre de colonnes selon la difficulté)
    const boardElement = document.querySelector('.game-board');
    boardElement.classList.remove('cols-5', 'cols-6', 'cols-8');
    if (pairsCount === 5) boardElement.classList.add('cols-5');
    else if (pairsCount === 6) boardElement.classList.add('cols-6');
    else if (pairsCount === 8) boardElement.classList.add('cols-8');

    // 6. Ajout des "oreilles" (Écouteurs de clics) sur chaque carte
    const cardElements = document.querySelectorAll('.card');
    cardElements.forEach(cardElement => {
      // On utilise une fonction fléchée () => pour conserver le contexte 'this' global de Game.js
      cardElement.addEventListener('click', () => this.#handleCardClick(cardElement));
    });

    // 7. Nettoyage de l'interface (Sécurité cruciale si on repasse d'un mode 1v1 à Solo)
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.classList.remove('player1-turn', 'player2-turn');

    // 8. Lancement de la musique et du jeu
    this.playGameMusic();

    if (this.#isMultiplayer) {
      // En 1v1, le chrono devient la bannière d'annonce des tours !
      this.#updateTurnDisplay();
    } else {
      // En solo, on lance le chronomètre/timer classique
      this.#startTimer();
    }
  }

  /**
   * Met à jour dynamiquement la bannière supérieure en mode 1v1
   * (Couleur et nom du joueur dont c'est le tour).
   */
  #updateTurnDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    if (!timerDisplay) return;

    // On retire les couleurs précédentes
    timerDisplay.classList.remove('player1-turn', 'player2-turn');

    // On applique les textes et couleurs selon le joueur actif
    if (this.#currentPlayer === 1) {
      timerDisplay.textContent = `À ${this.#p1Name} de jouer ! (Score: ${this.#p1Score})`;
      timerDisplay.classList.add('player1-turn');
    } else {
      timerDisplay.textContent = `À ${this.#p2Name} de jouer ! (Score: ${this.#p2Score})`;
      timerDisplay.classList.add('player2-turn');
    }
  }

  /**
   * Fonction de clôture. Stoppe le jeu et prévient la base de données.
   */
  async endGame() {
    this.#stopTimer(); // Coupe le moteur temporel

    try {
      // On envoie le score final à l'API (0 si victoire complète, > 0 si abandon/défaite)
      const result = await ApiService.updateGameResult(this.#id, this.#remainingPairs);
      console.log('Score synchronisé avec succès :', result);
    } catch (error) {
      console.error('Erreur API lors de la fin de partie :', error);
    }
  }

  // ==========================================
  // RÉACTIONS AUX ACTIONS DU JOUEUR
  // ==========================================

  /**
   * Déclenché à chaque fois qu'on clique sur une carte HTML.
   */
  #handleCardClick(cardElement) {
    // SÉCURITÉ : On ignore le clic si le jeu vérifie déjà une paire, ou si la carte est déjà face visible
    if (this.#isLocked || cardElement.classList.contains('flip')) return;

    this.#playSound(this.#flipSound);

    // On ajoute la classe CSS qui retourne la carte
    cardElement.classList.add('flip');
    this.#flippedCards.push(cardElement); // On mémorise la carte

    // Dès qu'on a 2 cartes mémorisées, on lance l'analyse
    if (this.#flippedCards.length === 2) {
      this.#checkForMatch();
    }
  }

  /**
   * Le "Juge" du jeu. Analyse les deux cartes retournées.
   */
  #checkForMatch() {
    this.#isLocked = true; // On verrouille le plateau pour empêcher les clics frénétiques
    const [card1, card2] = this.#flippedCards;

    // On compare les IDs des Pokémons cachés dans le HTML (data-pokemon-id)
    if (card1.dataset.pokemonId === card2.dataset.pokemonId) {
      // --- MATCH TROUVÉ ! ---
      this.#handleMatchAnimation(card1, card2); // Lance sons + confettis

      // Règles du mode Multijoueur
      if (this.#isMultiplayer) {
        if (this.#currentPlayer === 1) {
          this.#p1Score++;
          // On ajoute la classe CSS pour la brillance bleue
          card1.classList.add('matched-p1');
          card2.classList.add('matched-p1');
        } else {
          this.#p2Score++;
          // On ajoute la classe CSS pour la brillance rouge
          card1.classList.add('matched-p2');
          card2.classList.add('matched-p2');
        }
        this.#updateTurnDisplay(); // Met à jour le score à l'écran
        // NOTE: Au Memory, si tu trouves, tu rejoues ! Donc on ne change pas de joueur.
      }

      // Nettoyage interne pour le prochain tour
      this.#flippedCards = [];
      this.#remainingPairs--;
      this.#isLocked = false; // Déverrouille le plateau

      // --- CONDITION DE FIN DE PARTIE ---
      if (this.#remainingPairs === 0) {
        // Petit délai (600ms) pour laisser l'animation de la dernière carte se terminer
        setTimeout(() => {
          this.endGame();

          let msg = "";
          let title = "Félicitations !";

          // Génération du texte de fin selon le mode de jeu
          if (this.#isMultiplayer) {
            // Logique de victoire 1v1
            if (this.#p1Score > this.#p2Score) {
              msg = `Victoire de ${this.#p1Name} avec ${this.#p1Score} paires trouvées contre ${this.#p2Score} !`;
            } else if (this.#p2Score > this.#p1Score) {
              msg = `Victoire de ${this.#p2Name} avec ${this.#p2Score} paires trouvées contre ${this.#p1Score} !`;
            } else {
              title = "Égalité !";
              msg = `Vous avez trouvé ${this.#p1Score} paires chacun ! Bien joué.`;
            }
          } else {
            // Logique de victoire Solo
            msg = this.isChronoMode
                ? `Victoire ! Vous avez terminé en ${this.formattedTime} !`
                : `Victoire ! Il vous restait ${this.formattedTime} !`;
          }

          this.#showEndScreen(title, msg, true); // True = On lance le jingle de victoire
        }, 600);
      }
    } else {
      // --- MAUVAISE PAIRE ---


      // On laisse les cartes visibles 800ms pour que le joueur mémorise leur position
      setTimeout(() => {
        // On les retourne face cachée
        card1.classList.remove('flip');
        card2.classList.remove('flip');
        this.#flippedCards = [];
        this.#isLocked = false;

        // On joue le son adéquat
        this.#playSound(this.#failSound);

        // Logique Multijoueur : Ce n'est plus à ton tour !
        if (this.#isMultiplayer) {
          // Si c'était 1 ça devient 2, sinon ça devient 1
          this.#currentPlayer = this.#currentPlayer === 1 ? 2 : 1;
          this.#updateTurnDisplay();
        }
      }, 800);
    }
  }

  /**
   * Gère les récompenses visuelles (Confettis ciblés) et sonores.
   */
  #handleMatchAnimation(card1, card2) {
    // Délai de 500ms : on attend que la carte soit presque totalement retournée
    setTimeout(() => {
      this.#playSound(this.#matchSound);

      // Sécurité : On vérifie que la librairie externe a bien été chargée dans le HTML
      if (typeof confetti === 'function') {

        // Mathématiques basiques : Trouve le centre de la carte (en X et Y)
        // et le convertit en pourcentage (0 à 1) pour la librairie de confettis.
        const getCardOrigin = (card) => {
          const rect = card.getBoundingClientRect();
          return {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight
          };
        };

        const confettiConfig = {
          particleCount: 50,
          spread: 50,
          zIndex: 9999,
          scalar: 0.8
        };

        // BAM ! Double explosion sur les deux cartes
        confetti({ ...confettiConfig, origin: getCardOrigin(card1) });
        confetti({ ...confettiConfig, origin: getCardOrigin(card2) });
      }
    }, 500);
  }

  /**
   * Algorithme de Fisher-Yates : Le meilleur moyen de mélanger un tableau en JavaScript.
   */
  #shuffle(array) {
    const arrayCopy = [...array]; // Copie le tableau pour ne pas modifier l'original
    for (let i = arrayCopy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // Utilisation du 'Destructuring' pour échanger deux variables sans variable temporaire
      [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
    }
    return arrayCopy;
  }

  // ==========================================
  // GESTION DU TEMPS (SOLO)
  // ==========================================

  #startTimer() {
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.textContent = this.formattedTime; // Affichage initial

    // setInterval exécute le code à l'intérieur toutes les 1000 millisecondes (1 seconde)
    this.#timerInterval = setInterval(() => {
      if (this.isChronoMode) {
        this.#timeRemaining++; // Compte en avant
      } else {
        this.#timeRemaining--; // Compte à rebours

        // Vérification du Game Over
        if (this.#timeRemaining <= 0) {
          this.#handleTimeUp();
        }
      }

      // Mise à jour visuelle du temps restant/écoulé
      if (timerDisplay) timerDisplay.textContent = this.formattedTime;
    }, 1000);
  }

  #stopTimer() {
    // clearInterval détruit la boucle temporelle pour économiser les ressources du navigateur
    if (this.#timerInterval) clearInterval(this.#timerInterval);
  }

  #handleTimeUp() {
    this.#stopTimer();
    this.#isLocked = true; // On bloque le plateau, le temps est écoulé !
    this.endGame();
    // Affiche l'écran de fin (False = lance le Jingle de défaite)
    this.#showEndScreen("Temps écoulé !", `Perdu... Il restait ${this.#remainingPairs} paires à trouver.`, false);
  }

  /**
   * Bascule l'interface du jeu vers l'écran de résultats final.
   */
  #showEndScreen(title, message, isVictory) {
    document.getElementById('end-title').textContent = title;
    document.getElementById('end-message').textContent = message;

    // Musique : Coupe l'ambiance de jeu et lance le jingle de fin
    this.stopGameMusic();
    this.playJingle(isVictory);

    // Bascule des div HTML
    document.querySelector('.game-area').classList.add('hidden');
    document.getElementById('end-screen').classList.remove('hidden');

    // Nettoie la grille pour éviter de garder des vieux éléments HTML en mémoire
    document.querySelector('.game-board').innerHTML = '';
  }
}