// ============================================================================
// app.js : Le point d'entrée de notre application.
// C'est le "chef d'orchestre" qui fait le lien entre le HTML (les clics de
// l'utilisateur) et la logique pure du jeu (la classe Game).
// ============================================================================

import { DOMManager } from './DOMManager.js';
import { Game } from './Game.js';
import { ApiService } from './ApiService.js';

// Instanciation de nos classes principales
const domManager = new DOMManager(); // Gère l'affichage des cartes dans le HTML
const game = new Game();             // Le "cerveau" contenant les règles du jeu
const soundBtn = document.getElementById('toggle-sound'); // Bouton Mute global

/**
 * Bouton "Retour à l'accueil" (Écran de fin)
 * Permet de relancer une nouvelle partie en cachant l'écran de fin
 * et en réaffichant le menu principal.
 */
document.getElementById('btn-replay').addEventListener('click', () => {
  document.getElementById('end-screen').classList.add('hidden');
  document.getElementById('main-menu').classList.remove('hidden');

  // Relance la musique du menu avec 'true' pour forcer le choix d'une nouvelle piste aléatoire
  game.playMenuMusic(true);
});

/**
 * Bouton "Abandonner la partie" (En jeu)
 * Stoppe le jeu en cours et affiche l'écran de défaite avec le temps joué.
 */
document.getElementById('abandon').addEventListener('click', async function() {
  // Petite confirmation native du navigateur pour éviter les misclicks
  if (confirm("Êtes-vous sûr de vouloir abandonner la partie ?")) {

    // On coupe le chrono et on prévient le serveur que la partie est finie
    // On utilise 'await' car endGame fait un appel réseau (API)
    await game.endGame();

    const temps = game.formattedTime; // Récupère le temps formaté (ex: 01:25)

    // Mise à jour des textes de l'écran de fin
    document.getElementById('end-title').textContent = "Partie abandonnée...";
    document.getElementById('end-message').textContent = `Temps à l'abandon : ${temps}. La prochaine fois vous y arriverez !`;

    // On coupe la musique stressante du jeu et on lance le petit son de défaite
    game.stopGameMusic();
    game.playJingle(false);

    // Bascule des écrans : on cache le jeu et on montre l'écran de fin
    document.querySelector('.game-area').classList.add('hidden');
    document.getElementById('end-screen').classList.remove('hidden');
    document.querySelector('.game-board').innerHTML = ''; // Nettoie les cartes HTML
  }
});

// ==========================================
// GESTION DU MENU PRINCIPAL (Solo / 1v1)
// ==========================================

// Variable globale pour savoir quel mode a été sélectionné avant de lancer le jeu
let isMultiplayerMode = false;

// Récupération des éléments HTML du menu pour pouvoir les manipuler
const mainMenu = document.getElementById('main-menu');
const startScreen = document.getElementById('start-screen');
const player2Group = document.getElementById('player2-group');
const chronoGroup = document.getElementById('chrono-group');
const setupTitle = document.getElementById('setup-title');
const pseudo2Input = document.getElementById('pseudo2');
const labelPseudo1 = document.getElementById('label-pseudo1');

// Action au clic sur "Mode Solo"
document.getElementById('btn-solo').addEventListener('click', () => {
  isMultiplayerMode = false; // On enregistre le choix

  // Transition visuelle : Menu -> Formulaire
  mainMenu.classList.add('hidden');
  startScreen.classList.remove('hidden');

  // Adaptation du formulaire pour le Solo
  setupTitle.textContent = "Configuration Solo";
  labelPseudo1.textContent = "Votre pseudo :";
  player2Group.classList.add('hidden');     // Cache le champ Joueur 2
  pseudo2Input.removeAttribute('required'); // Le J2 n'est plus obligatoire
  chronoGroup.classList.remove('hidden');   // Affiche l'option "Mode Détente"
});

// Action au clic sur "Mode 1v1 Local"
document.getElementById('btn-multi').addEventListener('click', () => {
  isMultiplayerMode = true; // On enregistre le choix

  // Transition visuelle : Menu -> Formulaire
  mainMenu.classList.add('hidden');
  startScreen.classList.remove('hidden');

  // Adaptation du formulaire pour le Multijoueur
  setupTitle.textContent = "Configuration 1v1 Local";
  labelPseudo1.textContent = "Pseudo du Joueur 1 :";
  player2Group.classList.remove('hidden');       // Affiche le champ Joueur 2
  pseudo2Input.setAttribute('required', 'true'); // Bloque le formulaire si J2 est vide !
  chronoGroup.classList.add('hidden');           // Cache l'option chrono (inutile en 1v1)
  document.getElementById('chrono-mode').checked = false; // Par sécurité, on décoche l'option cachée
});

// Bouton "Retour au menu" (flèche retour depuis le formulaire de configuration)
document.getElementById('btn-back-menu').addEventListener('click', () => {
  startScreen.classList.add('hidden');
  mainMenu.classList.remove('hidden');
});

// ==========================================
// LANCEMENT DE LA PARTIE (Soumission du Formulaire)
// ==========================================

/**
 * Écouteur sur l'événement "submit" du formulaire.
 * Récupère tous les choix, contacte l'API, et donne le feu vert à Game.js.
 */
document.getElementById('start-form').addEventListener('submit', async function (event) {
  // CRUCIAL : Empêche le comportement par défaut du HTML qui recharge la page
  event.preventDefault();

  // 1. Récupération des valeurs tapées/sélectionnées par l'utilisateur
  const pseudoInput = document.getElementById('pseudo').value;
  const pseudo2InputVal = document.getElementById('pseudo2').value;

  const selectElement = document.getElementById('pack-select');
  const selectedPackName = selectElement ? selectElement.value : 'differenttypes';

  const difficultyElement = document.getElementById('difficulty-select');
  const difficultyLevel = difficultyElement ? difficultyElement.value : 4;

  const isChronoMode = document.getElementById('chrono-mode').checked;

  // 2. Bascule visuelle : On cache le formulaire et on affiche le tapis de jeu
  document.getElementById('start-screen').classList.add('hidden');
  document.querySelector('.game-area').classList.remove('hidden');

  try {
    // 3. Appel API : On dit au serveur "Hé, crée une nouvelle partie pour ce joueur !"
    const data = await ApiService.createGame(pseudoInput, difficultyLevel);
    console.log('Partie créée avec succès via API:', data);

    // 4. Lancement de la logique pure
    // On passe TOUTES les options sélectionnées au "Cerveau" du jeu
    game.startGame(
        data.id,
        selectedPackName,
        domManager,
        difficultyLevel,
        isChronoMode,
        isMultiplayerMode,
        pseudoInput,
        pseudo2InputVal
    );

    // La partie commence : on coupe la musique d'attente
    game.stopMenuMusic();

  } catch (error) {
    // Si l'API plante (ex: pas d'internet ou serveur down), on gère l'erreur proprement
    console.error('Erreur API:', error);
    alert(error.message || 'Erreur lors de la création de la partie. Vérifiez votre connexion.');

    // On remet l'interface dans son état initial (Formulaire)
    document.getElementById('start-screen').classList.remove('hidden');
    document.querySelector('.game-area').classList.add('hidden');
  }
});

// ==========================================
// GESTION GLOBALE DU SON
// ==========================================

// Écouteur sur le bouton flottant "Mute" en bas à droite
soundBtn.addEventListener('click', () => {
  const isNowMuted = !game.isMuted; // On inverse l'état actuel (true devient false, etc)
  game.toggleMuteState(isNowMuted); // On prévient Game.js de couper/rallumer la musique active

  // Mise à jour de l'icône du bouton
  if (game.isMuted) {
    soundBtn.textContent = '🔇';
    soundBtn.classList.add('muted');
  } else {
    soundBtn.textContent = '🔊';
    soundBtn.classList.remove('muted');
  }
});

// ==========================================
// POPUP DE DÉMARRAGE & INITIALISATION AUDIO
// ==========================================
const audioPopup = document.getElementById('audio-popup');

// Quand l'utilisateur clique n'importe où sur le popup
audioPopup.addEventListener('click', () => {
  // On cache le popup avec une transition
  audioPopup.classList.add('hidden');

  // On lance la musique du menu
  game.playMenuMusic(true);
});